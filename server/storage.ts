import {
  type User, type InsertUser, users,
  type TeacherProfile, type InsertTeacherProfile, teacherProfiles,
  type Demand, type InsertDemand, demands,
  type Order, type InsertOrder, orders,
  type Review, type InsertReview, reviews,
  type MatchLog, type InsertMatchLog, matchLogs,
  type UnlockPackage, type InsertUnlockPackage, unlockPackages,
  type UserPurchase, type InsertUserPurchase, userPurchases,
  type UnlockRecord, type InsertUnlockRecord, unlockRecords,
  type Notification, type InsertNotification, notifications,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and, desc, sql } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'parent',
    name TEXT NOT NULL,
    phone TEXT,
    avatar TEXT,
    city TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS teacher_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    bio TEXT,
    education TEXT,
    major TEXT,
    degree TEXT,
    skills TEXT NOT NULL DEFAULT '[]',
    certificates TEXT NOT NULL DEFAULT '[]',
    demo_videos TEXT NOT NULL DEFAULT '[]',
    hourly_rate_min INTEGER,
    hourly_rate_max INTEGER,
    service_areas TEXT NOT NULL DEFAULT '[]',
    available_times TEXT NOT NULL DEFAULT '[]',
    total_orders INTEGER NOT NULL DEFAULT 0,
    rating_avg REAL NOT NULL DEFAULT 0,
    verified INTEGER NOT NULL DEFAULT 0,
    service_types TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS demands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER NOT NULL REFERENCES users(id),
    child_age INTEGER NOT NULL,
    child_gender TEXT,
    service_category TEXT NOT NULL,
    specific_service TEXT,
    service_type TEXT NOT NULL,
    location TEXT,
    preferred_time TEXT NOT NULL DEFAULT '[]',
    budget_min INTEGER,
    budget_max INTEGER,
    special_requirements TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    demand_id INTEGER NOT NULL REFERENCES demands(id),
    parent_id INTEGER NOT NULL REFERENCES users(id),
    teacher_id INTEGER NOT NULL REFERENCES users(id),
    service_date TEXT,
    duration_hours REAL,
    total_amount INTEGER,
    platform_fee INTEGER,
    teacher_income INTEGER,
    payment_status TEXT NOT NULL DEFAULT 'pending',
    service_status TEXT NOT NULL DEFAULT 'scheduled',
    created_at INTEGER,
    completed_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    reviewer_id INTEGER NOT NULL REFERENCES users(id),
    reviewee_id INTEGER NOT NULL REFERENCES users(id),
    rating INTEGER NOT NULL,
    comment TEXT,
    photos TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS match_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL REFERENCES users(id),
    demand_id INTEGER NOT NULL REFERENCES demands(id),
    match_score INTEGER NOT NULL DEFAULT 0,
    action_type TEXT NOT NULL,
    result TEXT NOT NULL DEFAULT 'success',
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS unlock_packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    unlock_count INTEGER,
    duration_days INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS user_purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    package_id INTEGER NOT NULL REFERENCES unlock_packages(id),
    amount REAL NOT NULL,
    unlock_quota INTEGER,
    expires_at INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    confirmed_by INTEGER,
    created_at INTEGER,
    confirmed_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS unlock_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER NOT NULL REFERENCES users(id),
    teacher_id INTEGER NOT NULL REFERENCES users(id),
    purchase_id INTEGER NOT NULL REFERENCES user_purchases(id),
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    related_id INTEGER,
    related_type TEXT,
    match_score INTEGER,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER
  );

  INSERT OR IGNORE INTO unlock_packages (id, name, description, price, unlock_count, duration_days, is_active, sort_order)
  VALUES
  (1, '单次解锁', '解锁3位老师的完整资料', 19.9, 3, NULL, 1, 1),
  (2, '精选解锁', '解锁5位老师的完整资料', 39.9, 5, NULL, 1, 2),
  (3, '季度卡', '3个月内无限解锁老师资料', 99.0, NULL, 90, 1, 3),
  (4, '年度卡', '12个月内无限解锁老师资料', 249.0, NULL, 365, 1, 4);

  -- Seed users
  INSERT OR IGNORE INTO users (id, username, password, role, name, phone, city, status, created_at)
  VALUES
  (1, 'admin', 'admin123', 'admin', '管理员', '13800000000', '北京', 'active', 1700000000000),
  (2, 'parent1', '123456', 'parent', '李明', '13900001111', '北京', 'active', 1700000100000),
  (3, 'parent2', '123456', 'parent', '王芳', '13900002222', '上海', 'active', 1700000200000),
  (4, 'parent3', '123456', 'parent', '赵强', '13900003333', '广州', 'active', 1700000300000),
  (5, 'teacher1', '123456', 'teacher', '张小明', '13800001111', '北京', 'active', 1700000400000),
  (6, 'teacher2', '123456', 'teacher', '刘艺', '13800002222', '上海', 'active', 1700000500000),
  (7, 'teacher3', '123456', 'teacher', '陈思远', '13800003333', '北京', 'active', 1700000600000),
  (8, 'teacher4', '123456', 'teacher', '周雅', '13800004444', '广州', 'active', 1700000700000),
  (9, 'teacher5', '123456', 'teacher', '吴天', '13800005555', '深圳', 'active', 1700000800000);

  -- Seed teacher profiles
  INSERT OR IGNORE INTO teacher_profiles (id, user_id, bio, education, major, degree, skills, certificates, demo_videos, hourly_rate_min, hourly_rate_max, service_areas, available_times, total_orders, rating_avg, verified, service_types)
  VALUES
  (1, 5, '北大钢琴专业在读，10年钢琴经验，擅长古典和流行钢琴教学', '北京大学', '音乐学', '硕士', '["钢琴","乐理","视唱练耳"]', '["钢琴十级","乐理高级"]', '[]', 150, 250, '["海淀区","朝阳区"]', '["周末","工作日晚上"]', 28, 4.8, 1, '["音乐陪伴","科目辅导"]'),
  (2, 6, '复旦数学系研究生，高考数学满分，3年辅导经验', '复旦大学', '数学', '硕士', '["数学","物理","奥数"]', '["高中数学教师资格证"]', '[]', 120, 200, '["浦东新区","徐汇区"]', '["周末","工作日晚上"]', 35, 4.9, 1, '["科目辅导"]'),
  (3, 7, '体育大学篮球专业，曾获全国大学生篮球赛冠军', '北京体育大学', '运动训练', '本科', '["篮球","体能训练","羽毛球"]', '["篮球教练证","急救证"]', '[]', 100, 180, '["朝阳区","通州区"]', '["周末全天","工作日下午"]', 20, 4.6, 1, '["体育培训"]'),
  (4, 8, '中山大学英语专业，雅思8分，专注少儿英语启蒙', '中山大学', '英语', '本科', '["英语口语","英语阅读","自然拼读"]', '["英语专八","雅思8分"]', '[]', 100, 160, '["天河区","越秀区"]', '["周末","工作日晚上"]', 15, 4.7, 0, '["科目辅导","兴趣培养"]'),
  (5, 9, '深圳大学美术学院，擅长儿童绘画启蒙和创意美术', '深圳大学', '美术学', '本科', '["绘画","水彩","素描","创意美术"]', '["美术教师资格证"]', '[]', 80, 150, '["南山区","福田区"]', '["周末全天"]', 12, 4.5, 0, '["兴趣培养","氛围陪伴"]');

  -- Seed demands
  INSERT OR IGNORE INTO demands (id, parent_id, child_age, child_gender, service_category, specific_service, service_type, location, preferred_time, budget_min, budget_max, special_requirements, status, created_at)
  VALUES
  (1, 2, 8, '女', '音乐陪伴', '钢琴陪练', 'home', '北京市海淀区', '["周末下午"]', 150, 250, '希望老师有耐心，孩子刚学半年', 'open', 1700001000000),
  (2, 2, 8, '女', '科目辅导', '数学辅导', 'home', '北京市海淀区', '["工作日晚上"]', 100, 200, '三年级数学，需要提高计算能力', 'open', 1700001100000),
  (3, 3, 12, '男', '体育培训', '篮球训练', 'center', '上海市浦东新区', '["周末上午"]', 100, 180, '初中生，想加入校队', 'matched', 1700001200000),
  (4, 3, 6, '女', '兴趣培养', '绘画启蒙', 'home', '上海市徐汇区', '["周末"]', 80, 150, '幼儿园大班，培养艺术兴趣', 'open', 1700001300000),
  (5, 4, 10, '男', '科目辅导', '英语口语', 'online', '广州市天河区', '["周末","工作日晚上"]', 100, 160, '四年级，英语基础薄弱', 'open', 1700001400000);

  -- Seed orders
  INSERT OR IGNORE INTO orders (id, demand_id, parent_id, teacher_id, service_date, duration_hours, total_amount, platform_fee, teacher_income, payment_status, service_status, created_at, completed_at)
  VALUES
  (1, 1, 2, 5, '2024-01-15', 2.0, 300, 30, 270, 'paid', 'completed', 1700002000000, 1700010000000),
  (2, 3, 3, 7, '2024-01-20', 1.5, 180, 18, 162, 'paid', 'completed', 1700002100000, 1700011000000),
  (3, 2, 2, 6, '2024-02-01', 2.0, 240, 24, 216, 'paid', 'in_progress', 1700002200000, NULL);

  -- Seed reviews
  INSERT OR IGNORE INTO reviews (id, order_id, reviewer_id, reviewee_id, rating, comment, photos, created_at)
  VALUES
  (1, 1, 2, 5, 5, '张老师非常专业，孩子很喜欢上课，钢琴进步很大！', '[]', 1700012000000),
  (2, 1, 5, 2, 5, '家长很配合，孩子也很乖巧认真', '[]', 1700012100000),
  (3, 2, 3, 7, 4, '陈老师教学认真，篮球技术提升明显', '[]', 1700012200000),
  (4, 2, 7, 3, 5, '孩子很有天赋，训练积极', '[]', 1700012300000),
  (5, 3, 2, 6, 5, '刘老师数学讲解很清晰，孩子成绩提高了', '[]', 1700012400000);
`);

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStatus(id: number, status: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;

  // Teacher Profiles
  getTeacherProfile(userId: number): Promise<TeacherProfile | undefined>;
  getTeacherProfileById(id: number): Promise<TeacherProfile | undefined>;
  createTeacherProfile(profile: InsertTeacherProfile): Promise<TeacherProfile>;
  updateTeacherProfile(userId: number, profile: Partial<InsertTeacherProfile>): Promise<TeacherProfile | undefined>;
  getAllTeachers(): Promise<(User & { profile: TeacherProfile | null })[]>;
  getPendingTeachers(): Promise<(User & { profile: TeacherProfile | null })[]>;
  verifyTeacher(userId: number): Promise<TeacherProfile | undefined>;

  // Demands
  createDemand(demand: InsertDemand): Promise<Demand>;
  getDemand(id: number): Promise<Demand | undefined>;
  getDemandsByParent(parentId: number): Promise<Demand[]>;
  getOpenDemands(): Promise<Demand[]>;
  updateDemand(id: number, data: Partial<InsertDemand>): Promise<Demand | undefined>;
  updateDemandStatus(id: number, status: string): Promise<Demand | undefined>;

  // Orders
  createOrder(order: InsertOrder): Promise<Order>;
  getOrder(id: number): Promise<Order | undefined>;
  getOrdersByParent(parentId: number): Promise<Order[]>;
  getOrdersByTeacher(teacherId: number): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  updateOrderStatus(id: number, serviceStatus: string, paymentStatus?: string): Promise<Order | undefined>;

  // Reviews
  createReview(review: InsertReview): Promise<Review>;
  getReviewsByTeacher(teacheeId: number): Promise<Review[]>;

  // Match Logs
  createMatchLog(log: InsertMatchLog): Promise<MatchLog>;

  // Unlock Packages
  getAllPackages(): Promise<UnlockPackage[]>;
  getActivePackages(): Promise<UnlockPackage[]>;
  getPackage(id: number): Promise<UnlockPackage | undefined>;
  createPackage(pkg: InsertUnlockPackage): Promise<UnlockPackage>;
  updatePackage(id: number, data: Partial<InsertUnlockPackage>): Promise<UnlockPackage | undefined>;

  // User Purchases
  createPurchase(purchase: InsertUserPurchase): Promise<UserPurchase>;
  getPurchase(id: number): Promise<UserPurchase | undefined>;
  getPurchasesByUser(userId: number): Promise<UserPurchase[]>;
  getActivePurchase(userId: number): Promise<UserPurchase | undefined>;
  confirmPurchase(id: number, adminId: number): Promise<UserPurchase | undefined>;
  getAllPendingPurchases(): Promise<UserPurchase[]>;
  getAllPurchases(): Promise<UserPurchase[]>;

  // Unlock Records
  createUnlockRecord(record: InsertUnlockRecord): Promise<UnlockRecord>;
  getUnlocksByParent(parentId: number): Promise<UnlockRecord[]>;
  isTeacherUnlocked(parentId: number, teacherId: number): Promise<boolean>;
  getUnlockCount(parentId: number): Promise<number>;

  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  getUnreadCount(userId: number): Promise<number>;
  markAsRead(id: number): Promise<Notification | undefined>;
  markAllAsRead(userId: number): Promise<void>;

  // Stats
  getStats(): Promise<{
    totalUsers: number;
    totalTeachers: number;
    totalParents: number;
    totalOrders: number;
    totalDemands: number;
    completedOrders: number;
    gmv: number;
    totalRevenue: number;
    totalUnlocks: number;
    pendingPurchases: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.username, username)).get();
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return db.insert(users).values({
      ...insertUser,
      createdAt: new Date(),
    }).returning().get();
  }

  async updateUserStatus(id: number, status: string): Promise<User | undefined> {
    return db.update(users).set({ status }).where(eq(users.id, id)).returning().get();
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt)).all();
  }

  // Teacher Profiles
  async getTeacherProfile(userId: number): Promise<TeacherProfile | undefined> {
    return db.select().from(teacherProfiles).where(eq(teacherProfiles.userId, userId)).get();
  }

  async getTeacherProfileById(id: number): Promise<TeacherProfile | undefined> {
    return db.select().from(teacherProfiles).where(eq(teacherProfiles.id, id)).get();
  }

  async createTeacherProfile(profile: InsertTeacherProfile): Promise<TeacherProfile> {
    return db.insert(teacherProfiles).values(profile).returning().get();
  }

  async updateTeacherProfile(userId: number, profile: Partial<InsertTeacherProfile>): Promise<TeacherProfile | undefined> {
    return db.update(teacherProfiles).set(profile).where(eq(teacherProfiles.userId, userId)).returning().get();
  }

  async getAllTeachers(): Promise<(User & { profile: TeacherProfile | null })[]> {
    const teacherUsers = db.select().from(users).where(eq(users.role, "teacher")).all();
    return Promise.all(teacherUsers.map(async (u) => {
      const profile = await this.getTeacherProfile(u.id);
      return { ...u, profile: profile || null };
    }));
  }

  async getPendingTeachers(): Promise<(User & { profile: TeacherProfile | null })[]> {
    const allTeachers = await this.getAllTeachers();
    return allTeachers.filter(t => t.profile && !t.profile.verified);
  }

  async verifyTeacher(userId: number): Promise<TeacherProfile | undefined> {
    return db.update(teacherProfiles).set({ verified: true }).where(eq(teacherProfiles.userId, userId)).returning().get();
  }

  // Demands
  async createDemand(demand: InsertDemand): Promise<Demand> {
    return db.insert(demands).values({
      ...demand,
      createdAt: new Date(),
    }).returning().get();
  }

  async getDemand(id: number): Promise<Demand | undefined> {
    return db.select().from(demands).where(eq(demands.id, id)).get();
  }

  async getDemandsByParent(parentId: number): Promise<Demand[]> {
    return db.select().from(demands).where(eq(demands.parentId, parentId)).orderBy(desc(demands.createdAt)).all();
  }

  async getOpenDemands(): Promise<Demand[]> {
    return db.select().from(demands).where(eq(demands.status, "open")).orderBy(desc(demands.createdAt)).all();
  }

  async updateDemand(id: number, data: Partial<InsertDemand>): Promise<Demand | undefined> {
    return db.update(demands).set(data).where(eq(demands.id, id)).returning().get();
  }

  async updateDemandStatus(id: number, status: string): Promise<Demand | undefined> {
    return db.update(demands).set({ status }).where(eq(demands.id, id)).returning().get();
  }

  // Orders
  async createOrder(order: InsertOrder): Promise<Order> {
    return db.insert(orders).values({
      ...order,
      createdAt: new Date(),
    }).returning().get();
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return db.select().from(orders).where(eq(orders.id, id)).get();
  }

  async getOrdersByParent(parentId: number): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.parentId, parentId)).orderBy(desc(orders.createdAt)).all();
  }

  async getOrdersByTeacher(teacherId: number): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.teacherId, teacherId)).orderBy(desc(orders.createdAt)).all();
  }

  async getAllOrders(): Promise<Order[]> {
    return db.select().from(orders).orderBy(desc(orders.createdAt)).all();
  }

  async updateOrderStatus(id: number, serviceStatus: string, paymentStatus?: string): Promise<Order | undefined> {
    const updateData: any = { serviceStatus };
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (serviceStatus === "completed") updateData.completedAt = new Date();
    return db.update(orders).set(updateData).where(eq(orders.id, id)).returning().get();
  }

  // Reviews
  async createReview(review: InsertReview): Promise<Review> {
    const created = await db.insert(reviews).values({
      ...review,
      createdAt: new Date(),
    }).returning().get();
    // Update teacher's average rating
    const teacherReviews = await this.getReviewsByTeacher(review.revieweeId);
    if (teacherReviews.length > 0) {
      const avg = teacherReviews.reduce((sum, r) => sum + r.rating, 0) / teacherReviews.length;
      await db.update(teacherProfiles).set({ ratingAvg: avg }).where(eq(teacherProfiles.userId, review.revieweeId)).run();
    }
    return created;
  }

  async getReviewsByTeacher(revieweeId: number): Promise<Review[]> {
    return db.select().from(reviews).where(eq(reviews.revieweeId, revieweeId)).orderBy(desc(reviews.createdAt)).all();
  }

  // Match Logs
  async createMatchLog(log: InsertMatchLog): Promise<MatchLog> {
    return db.insert(matchLogs).values({
      ...log,
      createdAt: new Date(),
    }).returning().get();
  }

  // Unlock Packages
  async getAllPackages(): Promise<UnlockPackage[]> {
    return db.select().from(unlockPackages).orderBy(unlockPackages.sortOrder).all();
  }

  async getActivePackages(): Promise<UnlockPackage[]> {
    return db.select().from(unlockPackages).where(eq(unlockPackages.isActive, true)).orderBy(unlockPackages.sortOrder).all();
  }

  async getPackage(id: number): Promise<UnlockPackage | undefined> {
    return db.select().from(unlockPackages).where(eq(unlockPackages.id, id)).get();
  }

  async createPackage(pkg: InsertUnlockPackage): Promise<UnlockPackage> {
    return db.insert(unlockPackages).values(pkg).returning().get();
  }

  async updatePackage(id: number, data: Partial<InsertUnlockPackage>): Promise<UnlockPackage | undefined> {
    return db.update(unlockPackages).set(data).where(eq(unlockPackages.id, id)).returning().get();
  }

  // User Purchases
  async createPurchase(purchase: InsertUserPurchase): Promise<UserPurchase> {
    return db.insert(userPurchases).values({
      ...purchase,
      createdAt: new Date(),
    }).returning().get();
  }

  async getPurchase(id: number): Promise<UserPurchase | undefined> {
    return db.select().from(userPurchases).where(eq(userPurchases.id, id)).get();
  }

  async getPurchasesByUser(userId: number): Promise<UserPurchase[]> {
    return db.select().from(userPurchases).where(eq(userPurchases.userId, userId)).orderBy(desc(userPurchases.createdAt)).all();
  }

  async getActivePurchase(userId: number): Promise<UserPurchase | undefined> {
    const purchases = db.select().from(userPurchases)
      .where(and(eq(userPurchases.userId, userId), eq(userPurchases.status, "confirmed")))
      .orderBy(desc(userPurchases.createdAt))
      .all();
    const now = new Date();
    return purchases.find(p => {
      if (p.expiresAt && p.expiresAt < now) return false;
      if (p.unlockQuota !== null && p.unlockQuota <= 0) return false;
      return true;
    });
  }

  async confirmPurchase(id: number, adminId: number): Promise<UserPurchase | undefined> {
    const purchase = await this.getPurchase(id);
    if (!purchase) return undefined;
    const pkg = await this.getPackage(purchase.packageId);
    if (!pkg) return undefined;
    const expiresAt = pkg.durationDays ? new Date(Date.now() + pkg.durationDays * 86400000) : null;
    return db.update(userPurchases).set({
      status: "confirmed",
      confirmedBy: adminId,
      confirmedAt: new Date(),
      unlockQuota: pkg.unlockCount ?? null,
      expiresAt,
    }).where(eq(userPurchases.id, id)).returning().get();
  }

  async getAllPendingPurchases(): Promise<UserPurchase[]> {
    return db.select().from(userPurchases).where(eq(userPurchases.status, "pending")).orderBy(desc(userPurchases.createdAt)).all();
  }

  async getAllPurchases(): Promise<UserPurchase[]> {
    return db.select().from(userPurchases).orderBy(desc(userPurchases.createdAt)).all();
  }

  // Unlock Records
  async createUnlockRecord(record: InsertUnlockRecord): Promise<UnlockRecord> {
    return db.insert(unlockRecords).values({
      ...record,
      createdAt: new Date(),
    }).returning().get();
  }

  async getUnlocksByParent(parentId: number): Promise<UnlockRecord[]> {
    return db.select().from(unlockRecords).where(eq(unlockRecords.parentId, parentId)).orderBy(desc(unlockRecords.createdAt)).all();
  }

  async isTeacherUnlocked(parentId: number, teacherId: number): Promise<boolean> {
    const record = db.select().from(unlockRecords)
      .where(and(eq(unlockRecords.parentId, parentId), eq(unlockRecords.teacherId, teacherId)))
      .get();
    return !!record;
  }

  async getUnlockCount(parentId: number): Promise<number> {
    const records = db.select().from(unlockRecords).where(eq(unlockRecords.parentId, parentId)).all();
    return records.length;
  }

  // Notifications
  async createNotification(notification: InsertNotification): Promise<Notification> {
    return db.insert(notifications).values({
      ...notification,
      createdAt: new Date(),
    }).returning().get();
  }

  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).all();
  }

  async getUnreadCount(userId: number): Promise<number> {
    const unread = db.select().from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .all();
    return unread.length;
  }

  async markAsRead(id: number): Promise<Notification | undefined> {
    return db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id)).returning().get();
  }

  async markAllAsRead(userId: number): Promise<void> {
    db.update(notifications).set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .run();
  }

  // Stats
  async getStats() {
    const allUsers = await this.getAllUsers();
    const totalUsers = allUsers.length;
    const totalTeachers = allUsers.filter(u => u.role === "teacher").length;
    const totalParents = allUsers.filter(u => u.role === "parent").length;
    const allOrders = await this.getAllOrders();
    const totalOrders = allOrders.length;
    const completedOrders = allOrders.filter(o => o.serviceStatus === "completed").length;
    const gmv = allOrders.filter(o => o.totalAmount).reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const allDemands = db.select().from(demands).all();
    const totalDemands = allDemands.length;

    const confirmedPurchases = db.select().from(userPurchases).where(eq(userPurchases.status, "confirmed")).all();
    const totalRevenue = confirmedPurchases.reduce((sum, p) => sum + p.amount, 0);
    const totalUnlocks = db.select().from(unlockRecords).all().length;
    const pendingPurchases = db.select().from(userPurchases).where(eq(userPurchases.status, "pending")).all().length;

    return { totalUsers, totalTeachers, totalParents, totalOrders, completedOrders, gmv, totalDemands, totalRevenue, totalUnlocks, pendingPurchases };
  }
}

export const storage = new DatabaseStorage();
