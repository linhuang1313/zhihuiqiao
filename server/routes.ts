import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";

declare module "express-session" {
  interface SessionData {
    userId: number;
    role: string;
  }
}

// Matching algorithm
function calculateMatchScore(teacher: any, demand: any): number {
  let score = 0;

  // Skill match (25 points)
  try {
    const skills: string[] = JSON.parse(teacher.profile?.skills || "[]");
    const serviceTypes: string[] = JSON.parse(teacher.profile?.serviceTypes || "[]");
    const demandCategory = demand.serviceCategory || "";
    const specificService = demand.specificService || "";

    if (
      skills.some((s: string) => s.includes(specificService) || specificService.includes(s)) ||
      serviceTypes.some((st: string) => st.includes(demandCategory) || demandCategory.includes(st))
    ) {
      score += 25;
    }
  } catch {}

  // Location match (30 points)
  try {
    const serviceAreas: string[] = JSON.parse(teacher.profile?.serviceAreas || "[]");
    const demandLocation = demand.location || "";
    if (teacher.city && demandLocation && teacher.city === demand.city) {
      score += 30;
    } else if (serviceAreas.some((a: string) => demandLocation.includes(a) || a.includes(demandLocation))) {
      score += 20;
    }
  } catch {}

  // Price match (25 points)
  if (demand.budgetMin && demand.budgetMax && teacher.profile?.hourlyRateMin && teacher.profile?.hourlyRateMax) {
    const teacherMin = teacher.profile.hourlyRateMin;
    const teacherMax = teacher.profile.hourlyRateMax;
    const demandMin = demand.budgetMin;
    const demandMax = demand.budgetMax;
    if (teacherMin <= demandMax && teacherMax >= demandMin) {
      score += 25;
    }
  } else {
    score += 12; // partial score when no budget specified
  }

  // Time availability (20 points)
  try {
    const availableTimes: string[] = JSON.parse(teacher.profile?.availableTimes || "[]");
    const preferredTime: string[] = JSON.parse(demand.preferredTime || "[]");
    if (availableTimes.length > 0 && preferredTime.length > 0) {
      const overlap = availableTimes.some((t: string) => preferredTime.includes(t));
      if (overlap) score += 20;
    } else {
      score += 10;
    }
  } catch {}

  return Math.min(100, score);
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.use(
    session({
      secret: "zhihuiqiao-secret-2024",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 },
    })
  );

  const requireAuth = (req: Request, res: Response, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "未登录，请先登录" });
    }
    next();
  };

  const requireAdmin = async (req: Request, res: Response, next: any) => {
    if (!req.session.userId) return res.status(401).json({ message: "未登录" });
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== "admin") return res.status(403).json({ message: "无权限" });
    next();
  };

  // =========== AUTH ===========
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, role, name, phone, city } = req.body;
      if (!username || !password || !name) {
        return res.status(400).json({ message: "请填写必要信息" });
      }
      const existing = await storage.getUserByUsername(username);
      if (existing) return res.status(400).json({ message: "用户名已存在" });

      const user = await storage.createUser({ username, password, role: role || "parent", name, phone, city, status: "active" });

      // Auto-create teacher profile
      if (user.role === "teacher") {
        await storage.createTeacherProfile({
          userId: user.id,
          skills: "[]",
          certificates: "[]",
          demoVideos: "[]",
          serviceAreas: "[]",
          availableTimes: "[]",
          serviceTypes: "[]",
          totalOrders: 0,
          ratingAvg: 0,
          verified: false,
        });
      }

      req.session.userId = user.id;
      req.session.role = user.role;
      const { password: _, ...safeUser } = user;
      return res.json(safeUser);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "用户名或密码错误" });
      }
      if (user.status !== "active") {
        return res.status(403).json({ message: "账号已被冻结或封禁" });
      }
      req.session.userId = user.id;
      req.session.role = user.role;
      const { password: _, ...safeUser } = user;
      return res.json(safeUser);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) return res.status(401).json({ message: "未登录" });
    const { password: _, ...safeUser } = user;
    return res.json(safeUser);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {});
    return res.json({ message: "已退出登录" });
  });

  // =========== DEMANDS ===========
  app.post("/api/demands", requireAuth, async (req, res) => {
    try {
      const demand = await storage.createDemand({
        ...req.body,
        parentId: req.session.userId!,
        preferredTime: JSON.stringify(req.body.preferredTime || []),
      });
      return res.json(demand);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/demands/my", requireAuth, async (req, res) => {
    const demandList = await storage.getDemandsByParent(req.session.userId!);
    return res.json(demandList);
  });

  app.get("/api/demands/open", requireAuth, async (req, res) => {
    const openDemands = await storage.getOpenDemands();
    return res.json(openDemands);
  });

  app.get("/api/demands/:id", requireAuth, async (req, res) => {
    const demand = await storage.getDemand(parseInt(req.params.id));
    if (!demand) return res.status(404).json({ message: "需求不存在" });
    return res.json(demand);
  });

  app.put("/api/demands/:id", requireAuth, async (req, res) => {
    try {
      const demand = await storage.getDemand(parseInt(req.params.id));
      if (!demand) return res.status(404).json({ message: "需求不存在" });
      if (demand.parentId !== req.session.userId) return res.status(403).json({ message: "无权操作" });
      const updated = await storage.updateDemand(parseInt(req.params.id), req.body);
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/demands/:id", requireAuth, async (req, res) => {
    try {
      const demand = await storage.getDemand(parseInt(req.params.id));
      if (!demand) return res.status(404).json({ message: "需求不存在" });
      if (demand.parentId !== req.session.userId) return res.status(403).json({ message: "无权操作" });
      await storage.updateDemandStatus(parseInt(req.params.id), "cancelled");
      return res.json({ message: "已取消" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // =========== TEACHERS ===========
  app.get("/api/teachers", async (req, res) => {
    try {
      const teachers = await storage.getAllTeachers();
      return res.json(teachers);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/teacher/profile", requireAuth, async (req, res) => {
    const profile = await storage.getTeacherProfile(req.session.userId!);
    return res.json(profile || null);
  });

  app.put("/api/teacher/profile", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getTeacherProfile(req.session.userId!);
      const profileData = {
        ...req.body,
        skills: typeof req.body.skills === "string" ? req.body.skills : JSON.stringify(req.body.skills || []),
        serviceTypes: typeof req.body.serviceTypes === "string" ? req.body.serviceTypes : JSON.stringify(req.body.serviceTypes || []),
        serviceAreas: typeof req.body.serviceAreas === "string" ? req.body.serviceAreas : JSON.stringify(req.body.serviceAreas || []),
        availableTimes: typeof req.body.availableTimes === "string" ? req.body.availableTimes : JSON.stringify(req.body.availableTimes || []),
        certificates: typeof req.body.certificates === "string" ? req.body.certificates : JSON.stringify(req.body.certificates || []),
        demoVideos: typeof req.body.demoVideos === "string" ? req.body.demoVideos : JSON.stringify(req.body.demoVideos || []),
      };

      if (!existing) {
        const profile = await storage.createTeacherProfile({ userId: req.session.userId!, ...profileData });
        return res.json(profile);
      }
      const profile = await storage.updateTeacherProfile(req.session.userId!, profileData);
      return res.json(profile);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/teachers/recommend", requireAuth, async (req, res) => {
    try {
      const { demandId } = req.query;
      if (!demandId) return res.status(400).json({ message: "缺少需求ID" });
      const demand = await storage.getDemand(parseInt(demandId as string));
      if (!demand) return res.status(404).json({ message: "需求不存在" });
      const teachers = await storage.getAllTeachers();
      const scored = teachers
        .filter(t => t.profile)
        .map(t => ({ ...t, matchScore: calculateMatchScore(t, demand) }))
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 5);
      return res.json(scored);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/teachers/:id", async (req, res) => {
    try {
      const user = await storage.getUser(parseInt(req.params.id));
      if (!user || user.role !== "teacher") return res.status(404).json({ message: "老师不存在" });
      const profile = await storage.getTeacherProfile(user.id);
      const { password: _, ...safeUser } = user;
      return res.json({ ...safeUser, profile: profile || null });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // =========== ORDERS ===========
  app.post("/api/orders", requireAuth, async (req, res) => {
    try {
      const { demandId, teacherId, serviceDate, durationHours, totalAmount } = req.body;
      const platformFee = Math.round((totalAmount || 0) * 0.1);
      const teacherIncome = (totalAmount || 0) - platformFee;
      const order = await storage.createOrder({
        demandId,
        parentId: req.session.userId!,
        teacherId,
        serviceDate,
        durationHours,
        totalAmount,
        platformFee,
        teacherIncome,
        paymentStatus: "pending",
        serviceStatus: "scheduled",
      });
      return res.json(order);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/orders/my", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) return res.status(401).json({ message: "未登录" });
    let orderList: any[];
    if (user.role === "parent") {
      orderList = await storage.getOrdersByParent(user.id);
    } else if (user.role === "teacher") {
      orderList = await storage.getOrdersByTeacher(user.id);
    } else {
      orderList = await storage.getAllOrders();
    }
    return res.json(orderList);
  });

  app.get("/api/orders/:id", requireAuth, async (req, res) => {
    const order = await storage.getOrder(parseInt(req.params.id));
    if (!order) return res.status(404).json({ message: "订单不存在" });
    return res.json(order);
  });

  app.post("/api/orders/:id/accept", requireAuth, async (req, res) => {
    try {
      const order = await storage.getOrder(parseInt(req.params.id));
      if (!order) return res.status(404).json({ message: "订单不存在" });
      if (order.teacherId !== req.session.userId) return res.status(403).json({ message: "无权操作" });
      const updated = await storage.updateOrderStatus(parseInt(req.params.id), "in_progress", "paid");
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/orders/:id/complete", requireAuth, async (req, res) => {
    try {
      const order = await storage.getOrder(parseInt(req.params.id));
      if (!order) return res.status(404).json({ message: "订单不存在" });
      const updated = await storage.updateOrderStatus(parseInt(req.params.id), "completed");
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/orders/:id/cancel", requireAuth, async (req, res) => {
    try {
      const order = await storage.getOrder(parseInt(req.params.id));
      if (!order) return res.status(404).json({ message: "订单不存在" });
      const updated = await storage.updateOrderStatus(parseInt(req.params.id), "cancelled", "refunded");
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // =========== REVIEWS ===========
  app.post("/api/reviews", requireAuth, async (req, res) => {
    try {
      const review = await storage.createReview({
        ...req.body,
        reviewerId: req.session.userId!,
        photos: JSON.stringify(req.body.photos || []),
      });
      return res.json(review);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/reviews", async (req, res) => {
    try {
      const { teacherId } = req.query;
      if (!teacherId) return res.status(400).json({ message: "缺少老师ID" });
      const reviewList = await storage.getReviewsByTeacher(parseInt(teacherId as string));
      return res.json(reviewList);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // =========== ADMIN ===========
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    const allUsers = await storage.getAllUsers();
    return res.json(allUsers.map(({ password: _, ...u }) => u));
  });

  app.put("/api/admin/users/:id/status", requireAdmin, async (req, res) => {
    try {
      const user = await storage.updateUserStatus(parseInt(req.params.id), req.body.status);
      return res.json(user);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/teachers/pending", requireAdmin, async (req, res) => {
    const pending = await storage.getPendingTeachers();
    return res.json(pending.map(({ password: _, ...u }) => u));
  });

  app.post("/api/admin/teachers/:id/verify", requireAdmin, async (req, res) => {
    try {
      const profile = await storage.verifyTeacher(parseInt(req.params.id));
      return res.json(profile);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/orders", requireAdmin, async (req, res) => {
    const orderList = await storage.getAllOrders();
    return res.json(orderList);
  });

  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    const stats = await storage.getStats();
    return res.json(stats);
  });

  // =========== MATCH ===========
  app.post("/api/match/calculate", requireAuth, async (req, res) => {
    try {
      const { demandId, teacherId } = req.body;
      const demand = await storage.getDemand(demandId);
      if (!demand) return res.status(404).json({ message: "需求不存在" });
      const teacherUser = await storage.getUser(teacherId);
      if (!teacherUser) return res.status(404).json({ message: "老师不存在" });
      const profile = await storage.getTeacherProfile(teacherId);
      const score = calculateMatchScore({ ...teacherUser, profile }, demand);
      return res.json({ score });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
