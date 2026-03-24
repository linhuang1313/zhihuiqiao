import {
  type User, type InsertUser, users,
  type TeacherProfile, type InsertTeacherProfile, teacherProfiles,
  type Demand, type InsertDemand, demands,
  type Order, type InsertOrder, orders,
  type Review, type InsertReview, reviews,
  type MatchLog, type InsertMatchLog, matchLogs,
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

  // Stats
  getStats(): Promise<{
    totalUsers: number;
    totalTeachers: number;
    totalParents: number;
    totalOrders: number;
    totalDemands: number;
    completedOrders: number;
    gmv: number;
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

    return { totalUsers, totalTeachers, totalParents, totalOrders, completedOrders, gmv, totalDemands };
  }
}

export const storage = new DatabaseStorage();
