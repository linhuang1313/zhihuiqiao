import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { users, teacherProfiles, demands, orders, reviews } from "../shared/schema.js";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite);

// Create tables first
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

const now = Date.now();

// Check if data already exists
const existingUsers = db.select().from(users).all();
if (existingUsers.length > 0) {
  console.log("数据已存在，跳过种子数据");
  process.exit(0);
}

console.log("创建种子数据...");

// Create admin
const admin = db.insert(users).values({
  username: "admin",
  password: "admin123",
  role: "admin",
  name: "系统管理员",
  phone: "13800000000",
  city: "北京",
  status: "active",
  createdAt: new Date(now - 90 * 86400000),
}).returning().get();

// Create parents
const parent1 = db.insert(users).values({
  username: "parent1",
  password: "123456",
  role: "parent",
  name: "王丽华",
  phone: "13811111111",
  city: "北京",
  status: "active",
  createdAt: new Date(now - 60 * 86400000),
}).returning().get();

const parent2 = db.insert(users).values({
  username: "parent2",
  password: "123456",
  role: "parent",
  name: "张明远",
  phone: "13822222222",
  city: "上海",
  status: "active",
  createdAt: new Date(now - 45 * 86400000),
}).returning().get();

const parent3 = db.insert(users).values({
  username: "parent3",
  password: "123456",
  role: "parent",
  name: "李秀英",
  phone: "13833333333",
  city: "北京",
  status: "active",
  createdAt: new Date(now - 30 * 86400000),
}).returning().get();

// Create teachers
const teacher1User = db.insert(users).values({
  username: "teacher1",
  password: "123456",
  role: "teacher",
  name: "陈晓雨",
  phone: "13844444444",
  city: "北京",
  status: "active",
  createdAt: new Date(now - 80 * 86400000),
}).returning().get();

const teacher2User = db.insert(users).values({
  username: "teacher2",
  password: "123456",
  role: "teacher",
  name: "刘志远",
  phone: "13855555555",
  city: "北京",
  status: "active",
  createdAt: new Date(now - 70 * 86400000),
}).returning().get();

const teacher3User = db.insert(users).values({
  username: "teacher3",
  password: "123456",
  role: "teacher",
  name: "赵思涵",
  phone: "13866666666",
  city: "上海",
  status: "active",
  createdAt: new Date(now - 65 * 86400000),
}).returning().get();

const teacher4User = db.insert(users).values({
  username: "teacher4",
  password: "123456",
  role: "teacher",
  name: "孙美琪",
  phone: "13877777777",
  city: "北京",
  status: "active",
  createdAt: new Date(now - 55 * 86400000),
}).returning().get();

const teacher5User = db.insert(users).values({
  username: "teacher5",
  password: "123456",
  role: "teacher",
  name: "周建国",
  phone: "13888888888",
  city: "北京",
  status: "active",
  createdAt: new Date(now - 40 * 86400000),
}).returning().get();

// Create teacher profiles
db.insert(teacherProfiles).values({
  userId: teacher1User.id,
  bio: "北京大学音乐学院钢琴系在读硕士，有丰富的儿童钢琴教学经验，曾获得多项钢琴比赛奖项。温柔耐心，擅长因材施教。",
  education: "北京大学",
  major: "音乐表演",
  degree: "硕士",
  skills: JSON.stringify(["钢琴", "音乐理论", "视唱练耳", "乐理"]),
  certificates: JSON.stringify(["钢琴教师资格证", "国家二级钢琴演奏员"]),
  demoVideos: JSON.stringify([]),
  hourlyRateMin: 150,
  hourlyRateMax: 300,
  serviceAreas: JSON.stringify(["海淀区", "朝阳区", "西城区"]),
  availableTimes: JSON.stringify(["工作日下午", "周末全天"]),
  totalOrders: 28,
  ratingAvg: 4.9,
  verified: true,
  serviceTypes: JSON.stringify(["音乐陪伴", "科目辅导"]),
}).run();

db.insert(teacherProfiles).values({
  userId: teacher2User.id,
  bio: "清华大学体育科学系本科在读，专业篮球运动员，曾代表学校参加CUBA联赛。热爱与孩子们一起运动，注重体育精神培养。",
  education: "清华大学",
  major: "体育科学",
  degree: "本科",
  skills: JSON.stringify(["篮球", "足球", "体能训练", "运动营养"]),
  certificates: JSON.stringify(["篮球裁判员证", "青少年体能训练证"]),
  demoVideos: JSON.stringify([]),
  hourlyRateMin: 120,
  hourlyRateMax: 200,
  serviceAreas: JSON.stringify(["朝阳区", "丰台区", "通州区"]),
  availableTimes: JSON.stringify(["周末全天", "工作日晚上"]),
  totalOrders: 15,
  ratingAvg: 4.7,
  verified: true,
  serviceTypes: JSON.stringify(["体育培训", "氛围陪伴"]),
}).run();

db.insert(teacherProfiles).values({
  userId: teacher3User.id,
  bio: "复旦大学数学系博士在读，曾获全国数学竞赛金牌。擅长将复杂数学问题简单化，让孩子轻松爱上数学。",
  education: "复旦大学",
  major: "数学",
  degree: "博士",
  skills: JSON.stringify(["数学辅导", "物理辅导", "竞赛数学", "高考辅导"]),
  certificates: JSON.stringify(["全国数学竞赛金牌", "教师资格证"]),
  demoVideos: JSON.stringify([]),
  hourlyRateMin: 200,
  hourlyRateMax: 400,
  serviceAreas: JSON.stringify(["浦东新区", "徐汇区", "长宁区"]),
  availableTimes: JSON.stringify(["工作日晚上", "周末全天"]),
  totalOrders: 42,
  ratingAvg: 4.95,
  verified: true,
  serviceTypes: JSON.stringify(["科目辅导", "氛围陪伴"]),
}).run();

db.insert(teacherProfiles).values({
  userId: teacher4User.id,
  bio: "北京外国语大学英语专业硕士，有海外留学经历，口语纯正流利。采用沉浸式英语教学法，帮助孩子快速提升英语口语能力。",
  education: "北京外国语大学",
  major: "英语语言文学",
  degree: "硕士",
  skills: JSON.stringify(["英语口语", "英语写作", "托福辅导", "儿童英语启蒙"]),
  certificates: JSON.stringify(["TESOL教师资格证", "雅思8.5分"]),
  demoVideos: JSON.stringify([]),
  hourlyRateMin: 180,
  hourlyRateMax: 350,
  serviceAreas: JSON.stringify(["东城区", "西城区", "海淀区", "朝阳区"]),
  availableTimes: JSON.stringify(["工作日下午", "工作日晚上", "周末全天"]),
  totalOrders: 33,
  ratingAvg: 4.8,
  verified: true,
  serviceTypes: JSON.stringify(["科目辅导", "氛围陪伴", "兴趣培养"]),
}).run();

db.insert(teacherProfiles).values({
  userId: teacher5User.id,
  bio: "中央美术学院油画系在读本科生，热爱绘画创作与儿童美术教育。擅长水彩、素描、儿童创意美术，让孩子在快乐中发现艺术的美。",
  education: "中央美术学院",
  major: "油画",
  degree: "本科",
  skills: JSON.stringify(["绘画", "水彩", "素描", "儿童创意美术", "书法"]),
  certificates: JSON.stringify(["美术教师资格证"]),
  demoVideos: JSON.stringify([]),
  hourlyRateMin: 100,
  hourlyRateMax: 180,
  serviceAreas: JSON.stringify(["石景山区", "海淀区", "丰台区"]),
  availableTimes: JSON.stringify(["周末全天", "工作日下午"]),
  totalOrders: 19,
  ratingAvg: 4.6,
  verified: false,
  serviceTypes: JSON.stringify(["兴趣培养", "音乐陪伴"]),
}).run();

// Create demands
const demand1 = db.insert(demands).values({
  parentId: parent1.id,
  childAge: 7,
  childGender: "女",
  serviceCategory: "音乐陪伴",
  specificService: "钢琴",
  serviceType: "home",
  location: "北京市海淀区",
  preferredTime: JSON.stringify(["周六上午", "周日上午"]),
  budgetMin: 150,
  budgetMax: 250,
  specialRequirements: "希望老师有耐心，孩子是初学者，零基础。",
  status: "matched",
  createdAt: new Date(now - 20 * 86400000),
}).returning().get();

const demand2 = db.insert(demands).values({
  parentId: parent1.id,
  childAge: 10,
  childGender: "男",
  serviceCategory: "体育培训",
  specificService: "篮球",
  serviceType: "center",
  location: "北京市朝阳区",
  preferredTime: JSON.stringify(["周六下午", "周日下午"]),
  budgetMin: 100,
  budgetMax: 200,
  specialRequirements: "孩子喜欢篮球，希望系统学习基础技巧。",
  status: "open",
  createdAt: new Date(now - 15 * 86400000),
}).returning().get();

const demand3 = db.insert(demands).values({
  parentId: parent2.id,
  childAge: 12,
  childGender: "女",
  serviceCategory: "科目辅导",
  specificService: "数学",
  serviceType: "online",
  location: "上海市浦东新区",
  preferredTime: JSON.stringify(["工作日晚上", "周末全天"]),
  budgetMin: 200,
  budgetMax: 350,
  specialRequirements: "初中数学，准备竞赛，希望老师有竞赛经验。",
  status: "open",
  createdAt: new Date(now - 10 * 86400000),
}).returning().get();

const demand4 = db.insert(demands).values({
  parentId: parent2.id,
  childAge: 8,
  childGender: "男",
  serviceCategory: "科目辅导",
  specificService: "英语口语",
  serviceType: "home",
  location: "上海市徐汇区",
  preferredTime: JSON.stringify(["周末全天"]),
  budgetMin: 150,
  budgetMax: 300,
  specialRequirements: "希望提升口语，孩子有一定英语基础。",
  status: "open",
  createdAt: new Date(now - 7 * 86400000),
}).returning().get();

const demand5 = db.insert(demands).values({
  parentId: parent3.id,
  childAge: 5,
  childGender: "女",
  serviceCategory: "兴趣培养",
  specificService: "绘画启蒙",
  serviceType: "home",
  location: "北京市石景山区",
  preferredTime: JSON.stringify(["周六全天", "周日上午"]),
  budgetMin: 80,
  budgetMax: 150,
  specialRequirements: "5岁小朋友，希望通过绘画培养审美，轻松有趣为主。",
  status: "open",
  createdAt: new Date(now - 5 * 86400000),
}).returning().get();

// Create orders
const order1 = db.insert(orders).values({
  demandId: demand1.id,
  parentId: parent1.id,
  teacherId: teacher1User.id,
  serviceDate: "2026-03-15",
  durationHours: 2,
  totalAmount: 400,
  platformFee: 40,
  teacherIncome: 360,
  paymentStatus: "paid",
  serviceStatus: "completed",
  createdAt: new Date(now - 18 * 86400000),
  completedAt: new Date(now - 8 * 86400000),
}).returning().get();

const order2 = db.insert(orders).values({
  demandId: demand2.id,
  parentId: parent1.id,
  teacherId: teacher2User.id,
  serviceDate: "2026-03-29",
  durationHours: 2,
  totalAmount: 300,
  platformFee: 30,
  teacherIncome: 270,
  paymentStatus: "paid",
  serviceStatus: "scheduled",
  createdAt: new Date(now - 5 * 86400000),
}).returning().get();

const order3 = db.insert(orders).values({
  demandId: demand3.id,
  parentId: parent2.id,
  teacherId: teacher3User.id,
  serviceDate: "2026-03-22",
  durationHours: 1.5,
  totalAmount: 450,
  platformFee: 45,
  teacherIncome: 405,
  paymentStatus: "paid",
  serviceStatus: "in_progress",
  createdAt: new Date(now - 3 * 86400000),
}).returning().get();

// Create reviews
db.insert(reviews).values({
  orderId: order1.id,
  reviewerId: parent1.id,
  revieweeId: teacher1User.id,
  rating: 5,
  comment: "陈老师非常有耐心，我女儿第一次学钢琴，老师用游戏化的方式让孩子爱上了音乐，强烈推荐！",
  photos: JSON.stringify([]),
  createdAt: new Date(now - 7 * 86400000),
}).run();

db.insert(reviews).values({
  orderId: order1.id,
  reviewerId: parent1.id,
  revieweeId: teacher2User.id,
  rating: 5,
  comment: "刘老师教篮球很专业，孩子跟着练了几次基础大有提升，很满意！",
  photos: JSON.stringify([]),
  createdAt: new Date(now - 6 * 86400000),
}).run();

db.insert(reviews).values({
  orderId: order3.id,
  reviewerId: parent2.id,
  revieweeId: teacher3User.id,
  rating: 5,
  comment: "赵老师讲题非常清晰，我女儿的数学成绩有了明显提升，课堂氛围也很好。",
  photos: JSON.stringify([]),
  createdAt: new Date(now - 2 * 86400000),
}).run();

db.insert(reviews).values({
  orderId: order2.id,
  reviewerId: parent1.id,
  revieweeId: teacher4User.id,
  rating: 4,
  comment: "孙老师英语很好，口语非常流利，孩子很喜欢和她一起练口语。",
  photos: JSON.stringify([]),
  createdAt: new Date(now - 1 * 86400000),
}).run();

db.insert(reviews).values({
  orderId: order1.id,
  reviewerId: parent3.id,
  revieweeId: teacher5User.id,
  rating: 4,
  comment: "周老师教绘画思路很独特，孩子非常开心，课堂很有趣！",
  photos: JSON.stringify([]),
  createdAt: new Date(now),
}).run();

console.log("✅ 种子数据创建完成！");
console.log("管理员账号: admin / admin123");
console.log("家长账号: parent1 / 123456");
console.log("老师账号: teacher1 / 123456");
