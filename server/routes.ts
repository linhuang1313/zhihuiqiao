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

// Mask education to tier
function maskEducation(education: string | null | undefined): string {
  if (!education) return "本科院校";
  const e = education.toLowerCase();
  const top985 = ["清华", "北大", "复旦", "交大", "浙大", "中科大", "南大", "哈工大", "西交", "人大"];
  if (top985.some(s => education.includes(s))) return "985院校";
  const is211 = ["武大", "华科", "中山", "厦大", "同济", "东南", "北航", "北理", "天大", "南开", "川大", "电子科大"];
  if (is211.some(s => education.includes(s))) return "211院校";
  if (e.includes("985")) return "985院校";
  if (e.includes("211")) return "211院校";
  return "本科院校";
}

// Mask teacher info for non-unlocked view
function maskTeacherInfo(teacher: any, isUnlocked: boolean) {
  if (isUnlocked) return { ...teacher, isUnlocked: true };
  const name = teacher.name && teacher.name.length > 0 ? teacher.name[0] + "**老师" : "**老师";
  return {
    id: teacher.id,
    name,
    city: teacher.city,
    phone: null,
    avatar: null,
    profile: teacher.profile ? {
      education: maskEducation(teacher.profile.education),
      major: null,
      degree: teacher.profile.degree,
      skills: teacher.profile.skills,
      serviceTypes: teacher.profile.serviceTypes,
      hourlyRateMin: teacher.profile.hourlyRateMin,
      hourlyRateMax: teacher.profile.hourlyRateMax,
      ratingAvg: teacher.profile.ratingAvg,
      totalOrders: teacher.profile.totalOrders,
      verified: teacher.profile.verified,
      bio: null,
      serviceAreas: teacher.profile.serviceAreas,
      availableTimes: teacher.profile.availableTimes,
      certificates: teacher.profile.certificates,
      demoVideos: teacher.profile.demoVideos,
    } : null,
    isUnlocked: false,
  };
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

      // Auto-match: notify top 5 verified teachers
      try {
        const teachers = await storage.getAllTeachers();
        const scored = teachers
          .filter(t => t.profile && t.profile.verified)
          .map(t => ({ ...t, matchScore: calculateMatchScore(t, demand) }))
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, 5);

        for (const teacher of scored) {
          if (teacher.matchScore > 0) {
            await storage.createNotification({
              userId: teacher.id,
              type: "match_demand",
              title: `新需求匹配：${demand.serviceCategory}`,
              content: `有家长在${demand.location || "未知地区"}寻找${demand.specificService || demand.serviceCategory}老师，孩子${demand.childAge}岁，预算¥${demand.budgetMin || 0}-${demand.budgetMax || "不限"}/小时，匹配度${teacher.matchScore}%`,
              relatedId: demand.id,
              relatedType: "demand",
              matchScore: teacher.matchScore,
              isRead: false,
            });
          }
        }
      } catch (matchErr) {
        // Don't fail demand creation if matching fails
        console.error("Auto-match notification error:", matchErr);
      }

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

  // =========== TEACHERS (with masking for parents) ===========
  app.get("/api/teachers", async (req, res) => {
    try {
      const teachers = await storage.getAllTeachers();
      const userId = req.session.userId;
      const role = req.session.role;

      // Admin sees full info
      if (role === "admin") {
        return res.json(teachers.map(t => {
          const { password: _, ...safe } = t;
          return { ...safe, isUnlocked: true };
        }));
      }

      // Parent sees masked info unless unlocked
      if (role === "parent" && userId) {
        const results = await Promise.all(teachers.map(async (t) => {
          const { password: _, ...safe } = t;
          const unlocked = await storage.isTeacherUnlocked(userId, t.id);
          return maskTeacherInfo(safe, unlocked);
        }));
        return res.json(results);
      }

      // Teacher viewing other teachers - also masked
      if (role === "teacher" && userId) {
        const results = teachers.map((t) => {
          const { password: _, ...safe } = t;
          // Teacher can see their own full profile
          if (t.id === userId) return { ...safe, isUnlocked: true };
          return maskTeacherInfo(safe, false);
        });
        return res.json(results);
      }

      // Not logged in - masked
      return res.json(teachers.map(t => {
        const { password: _, ...safe } = t;
        return maskTeacherInfo(safe, false);
      }));
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
      const teacherUser = await storage.getUser(parseInt(req.params.id));
      if (!teacherUser || teacherUser.role !== "teacher") return res.status(404).json({ message: "老师不存在" });
      const profile = await storage.getTeacherProfile(teacherUser.id);
      const { password: _, ...safeUser } = teacherUser;
      const fullTeacher = { ...safeUser, profile: profile || null };

      const userId = req.session.userId;
      const role = req.session.role;

      // Admin or teacher themselves see full info
      if (role === "admin" || (role === "teacher" && userId === teacherUser.id)) {
        return res.json({ ...fullTeacher, isUnlocked: true });
      }

      // Parent - check unlock status
      if (role === "parent" && userId) {
        const unlocked = await storage.isTeacherUnlocked(userId, teacherUser.id);
        return res.json(maskTeacherInfo(fullTeacher, unlocked));
      }

      // Not logged in or other roles - masked
      return res.json(maskTeacherInfo(fullTeacher, false));
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // =========== PACKAGES ===========
  app.get("/api/packages", async (_req, res) => {
    try {
      const packages = await storage.getActivePackages();
      return res.json(packages);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // =========== PURCHASES ===========
  app.post("/api/purchases", requireAuth, async (req, res) => {
    try {
      const { packageId } = req.body;
      const pkg = await storage.getPackage(packageId);
      if (!pkg || !pkg.isActive) return res.status(404).json({ message: "套餐不存在或已下架" });
      const purchase = await storage.createPurchase({
        userId: req.session.userId!,
        packageId: pkg.id,
        amount: pkg.price,
        unlockQuota: null,
        expiresAt: null,
        status: "pending",
        confirmedBy: null,
      });
      return res.json(purchase);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/purchases/my", requireAuth, async (req, res) => {
    try {
      const purchases = await storage.getPurchasesByUser(req.session.userId!);
      return res.json(purchases);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // =========== UNLOCK ===========
  app.get("/api/unlock/status", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const activePurchase = await storage.getActivePurchase(userId);
      const totalUnlocked = await storage.getUnlockCount(userId);
      return res.json({
        hasActivePackage: !!activePurchase,
        remainingUnlocks: activePurchase ? (activePurchase.unlockQuota ?? null) : 0,
        expiresAt: activePurchase?.expiresAt ?? null,
        totalUnlocked,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/unlock/:teacherId", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const teacherId = parseInt(req.params.teacherId);
      const teacherUser = await storage.getUser(teacherId);
      if (!teacherUser || teacherUser.role !== "teacher") {
        return res.status(404).json({ message: "老师不存在" });
      }

      // Already unlocked?
      const alreadyUnlocked = await storage.isTeacherUnlocked(userId, teacherId);
      if (alreadyUnlocked) {
        const profile = await storage.getTeacherProfile(teacherId);
        const { password: _, ...safeUser } = teacherUser;
        return res.json({ ...safeUser, profile: profile || null, isUnlocked: true });
      }

      // Check active purchase
      const activePurchase = await storage.getActivePurchase(userId);
      if (!activePurchase) {
        return res.status(402).json({ message: "没有有效套餐，请先购买" });
      }

      // Deduct quota if not unlimited
      if (activePurchase.unlockQuota !== null) {
        const newQuota = activePurchase.unlockQuota - 1;
        // Use raw update to set new quota
        const { db } = await import("./storage");
        const { userPurchases } = await import("@shared/schema");
        const { eq } = await import("drizzle-orm");
        db.update(userPurchases).set({ unlockQuota: newQuota }).where(eq(userPurchases.id, activePurchase.id)).run();
      }

      // Create unlock record
      await storage.createUnlockRecord({
        parentId: userId,
        teacherId,
        purchaseId: activePurchase.id,
      });

      // Return full teacher info
      const profile = await storage.getTeacherProfile(teacherId);
      const { password: _, ...safeUser } = teacherUser;
      return res.json({ ...safeUser, profile: profile || null, isUnlocked: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/unlock/records", requireAuth, async (req, res) => {
    try {
      const records = await storage.getUnlocksByParent(req.session.userId!);
      // Enrich with teacher info
      const enriched = await Promise.all(records.map(async (r) => {
        const teacher = await storage.getUser(r.teacherId);
        const profile = teacher ? await storage.getTeacherProfile(teacher.id) : null;
        return {
          ...r,
          teacher: teacher ? {
            id: teacher.id,
            name: teacher.name,
            city: teacher.city,
            avatar: teacher.avatar,
            profile: profile ? {
              education: profile.education,
              degree: profile.degree,
              skills: profile.skills,
              ratingAvg: profile.ratingAvg,
            } : null,
          } : null,
        };
      }));
      return res.json(enriched);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // =========== NOTIFICATIONS ===========
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const notifs = await storage.getNotificationsByUser(req.session.userId!);
      return res.json(notifs);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
    try {
      const count = await storage.getUnreadCount(req.session.userId!);
      return res.json({ count });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const notif = await storage.markAsRead(parseInt(req.params.id));
      if (!notif) return res.status(404).json({ message: "通知不存在" });
      return res.json(notif);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      await storage.markAllAsRead(req.session.userId!);
      return res.json({ message: "已全部标记为已读" });
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

  // Admin purchase management
  app.get("/api/admin/purchases", requireAdmin, async (req, res) => {
    try {
      const purchases = await storage.getAllPurchases();
      // Enrich with user + package info
      const enriched = await Promise.all(purchases.map(async (p) => {
        const user = await storage.getUser(p.userId);
        const pkg = await storage.getPackage(p.packageId);
        return { ...p, userName: user?.name, packageName: pkg?.name };
      }));
      return res.json(enriched);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/purchases/pending", requireAdmin, async (req, res) => {
    try {
      const purchases = await storage.getAllPendingPurchases();
      const enriched = await Promise.all(purchases.map(async (p) => {
        const user = await storage.getUser(p.userId);
        const pkg = await storage.getPackage(p.packageId);
        return { ...p, userName: user?.name, packageName: pkg?.name };
      }));
      return res.json(enriched);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/admin/purchases/:id/confirm", requireAdmin, async (req, res) => {
    try {
      const purchase = await storage.confirmPurchase(parseInt(req.params.id), req.session.userId!);
      if (!purchase) return res.status(404).json({ message: "购买记录不存在" });
      return res.json(purchase);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/revenue", requireAdmin, async (req, res) => {
    try {
      const allPurchases = await storage.getAllPurchases();
      const confirmed = allPurchases.filter(p => p.status === "confirmed");
      const totalRevenue = confirmed.reduce((sum, p) => sum + p.amount, 0);
      const pendingCount = allPurchases.filter(p => p.status === "pending").length;
      return res.json({ totalRevenue, totalPurchases: allPurchases.length, confirmedCount: confirmed.length, pendingCount });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
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
