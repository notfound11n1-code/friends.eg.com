import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import dotenv from "dotenv";
import { WebSocket as ws } from "ws";
// Polyfill WebSocket for Node.js 20 (Supabase realtime needs it)
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = ws;
}
import { createClient } from "@supabase/supabase-js";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
// On Vercel, included files are relative to cwd; locally they are relative to server.js
let __dirname = path.dirname(__filename);
if (process.env.VERCEL) {
  // Try multiple paths where Vercel might place included files
  const candidates = [
    process.cwd(),
    path.resolve(__dirname, '..'),
    path.resolve(__dirname),
    '/var/task',
    '/var/task/user',
    path.dirname(__dirname),
  ];
  for (const c of candidates) {
    if (existsSync(path.join(c, 'index.html'))) {
      __dirname = c;
      break;
    }
  }
}

const useSupabase = String(process.env.USE_SUPABASE || "false").toLowerCase() === "true";
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey && useSupabase ? createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { 'x-client-info': 'friends-store' } },
  realtime: { params: { eventsPerSecond: 0 } },
  db: { schema: 'public' }
}) : null;

const app = express();
const PORT = 3000;

const DATA_DIR = path.join(__dirname, "data");
const PRODUCTS_PATH = path.join(DATA_DIR, "products.json");
const HERO_PATH = path.join(DATA_DIR, "hero.json");
const ORDERS_PATH = path.join(DATA_DIR, "orders.json");
const USERS_PATH = path.join(DATA_DIR, "users.json");
const REVIEWS_PATH = path.join(DATA_DIR, "reviews.json");
const UPLOAD_DIR = path.join(__dirname, "images", "uploads");

const JWT_SECRET = process.env.JWT_SECRET || "friends_production_secret_key_change_in_env_file_2024";
const TOKEN_EXPIRES = "7d";

const ADMIN_PASSWORD_SUPERVISOR = process.env.ADMIN_PASSWORD_SUPERVISOR;
const ADMIN_PASSWORD_SHIPPING = process.env.ADMIN_PASSWORD_SHIPPING;
const ADMIN_PASSWORD_SUPPORT = process.env.ADMIN_PASSWORD_SUPPORT;
const ADMIN_PASSWORD_FALLBACK = "admin123";

const discountCodes = {
  FRIENDS10: 0.1,
  WELCOME15: 0.15
};

const orderStatuses = ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"];

const statusLabels = {
  pending: "قيد المراجعة",
  confirmed: "تم التأكيد",
  packed: "تم التغليف",
  shipped: "تم الشحن",
  delivered: "تم التوصيل",
  cancelled: "تم الإلغاء"
};

const rolePermissions = {
  supervisor: ["orders.read", "orders.support", "orders.shipping", "orders.delivered", "catalog.manage", "reviews.read", "reviews.manage", "staff.manage", "users.read", "finance.read"],
  shipping: ["orders.read", "orders.shipping", "orders.delivered"],
  support: ["orders.read", "orders.support", "reviews.read"],
  sales: ["orders.read", "finance.read"],
  user: []
};

const normalizeRole = (role) => {
  if (role === "admin") return "supervisor";
  return role || "user";
};

const getRolePermissions = (role) => rolePermissions[normalizeRole(role)] || [];
const hasPermission = (role, permission) => getRolePermissions(role).includes(permission);

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await mkdir(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    } catch (error) {
      cb(error, UPLOAD_DIR);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const toUploadPath = (file) => (file ? `images/uploads/${file.filename}` : "");

const parseJsonField = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const sanitizePhone = (value = "") => String(value).replace(/\D/g, "");

// --- Case conversion utilities for Supabase compatibility ---
const camelToSnake = (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const snakeToCamel = (str) => str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

const convertKeysToSnake = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(convertKeysToSnake);
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[camelToSnake(key)] = convertKeysToSnake(value);
    }
    return result;
  }
  return obj;
};

const convertKeysToCamel = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(convertKeysToCamel);
  if (typeof obj === "object" && !(obj instanceof Date)) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[snakeToCamel(key)] = convertKeysToCamel(value);
    }
    return result;
  }
  return obj;
};

// --- Supabase column whitelists (only send known columns, store extras in data JSONB) ---
const SUPABASE_COLUMNS = {
  users: new Set(["id", "email", "phone", "name", "passwordHash", "role", "address", "country", "createdAt", "data"]),
  products: new Set(["id", "name", "short", "price", "category", "image", "images", "discount", "usage", "details", "brand", "sku", "stock", "rating", "reviews", "tags", "i18n", "data"]),
  hero: new Set(["id", "title", "text", "image", "link", "data"]),
  orders: new Set(["id", "data"]),
  reviews: new Set(["id", "data"]),
  tickets: new Set(["id", "data"]),
  returns: new Set(["id", "data"]),
};

const filterForSupabase = (table, row) => {
  const allowed = SUPABASE_COLUMNS[table];
  if (!allowed) return row;
  const filtered = {};
  const extra = {};
  for (const [key, value] of Object.entries(row)) {
    if (allowed.has(key)) {
      filtered[key] = value;
    } else if (value !== undefined && value !== null) {
      extra[key] = value;
    }
  }
  // Store extra fields in the data JSONB column
  if (Object.keys(extra).length > 0) {
    filtered.data = { ...(filtered.data && typeof filtered.data === "object" ? filtered.data : {}), ...extra };
  }
  return filtered;
};


const readJsonSafe = async (filePath, fallback) => {
  try {
    const raw = await readFile(filePath, "utf8");
    const cleaned = raw.replace(/^\uFEFF/, "").trim();
    if (!cleaned) return fallback;
    return JSON.parse(cleaned);
  } catch {
    return fallback;
  }
};

const writeJsonSafe = async (filePath, val) => {
  try {
    const dir = path.dirname(filePath);
    await mkdir(dir, { recursive: true });
    await writeFile(filePath, JSON.stringify(val, null, 2), "utf8");
  } catch (e) {
    console.warn("writeJsonSafe failed:", e.message);
  }
};

const ensureDataFiles = async () => {
  await mkdir(UPLOAD_DIR, { recursive: true });

  // When Supabase is enabled, skip local JSON file management
  if (supabase) {
    console.log("🔄 Using Supabase storage. Skipping local file setup.");
    return;
  }

  // Local JSON fallback - create empty files (no mock data)
  await mkdir(DATA_DIR, { recursive: true });

  try { await readFile(PRODUCTS_PATH, "utf8"); } catch {
    await writeJsonSafe(PRODUCTS_PATH, []);
  }

  try { await readFile(HERO_PATH, "utf8"); } catch {
    await writeJsonSafe(HERO_PATH, []);
  }

  try { await readFile(ORDERS_PATH, "utf8"); } catch {
    await writeJsonSafe(ORDERS_PATH, []);
  }

  let users = await readJsonSafe(USERS_PATH, []);
  if (!Array.isArray(users)) users = [];

  const normalized = users.map(user => ({ ...user, role: normalizeRole(user.role) }));
  const adminPasswords = {
    supervisor: ADMIN_PASSWORD_SUPERVISOR,
    shipping: ADMIN_PASSWORD_SHIPPING,
    support: ADMIN_PASSWORD_SUPPORT
  };
  const adminHashes = {
    supervisor: await bcrypt.hash(adminPasswords.supervisor || ADMIN_PASSWORD_FALLBACK, 10),
    shipping: await bcrypt.hash(adminPasswords.shipping || ADMIN_PASSWORD_FALLBACK, 10),
    support: await bcrypt.hash(adminPasswords.support || ADMIN_PASSWORD_FALLBACK, 10)
  };

  const defaultAdmins = [
    { email: "admin@friends.com", name: "Supervisor", role: "supervisor" },
    { email: "shipping@friends.com", name: "Shipping", role: "shipping" },
    { email: "support@friends.local", name: "Support", role: "support" }
  ];

  for (const admin of defaultAdmins) {
    const role = normalizeRole(admin.role);
    const existing = normalized.find(u => u.email.toLowerCase() === admin.email.toLowerCase());
    const passwordHash = adminHashes[role];

    if (existing) {
      existing.role = role;
      if (adminPasswords[role]) {
        existing.passwordHash = passwordHash;
      }
    } else {
      normalized.push({ id: uuidv4(), name: admin.name, email: admin.email, passwordHash, role });
    }
  }

  await writeJsonSafe(USERS_PATH, normalized);
};

const normalizeProduct = (product) => {
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  if (!images.length && product.image) images.push(product.image);
  return {
    ...product,
    images,
    image: images[0] || product.image || ""
  };
};

const readSupabaseTable = async (table, fallback = []) => {
  if (!supabase) return fallback;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const { data, error } = await supabase.from(table).select("*").abortSignal(controller.signal);
    clearTimeout(timeout);
    if (error) {
      console.warn(`Supabase read failed for ${table}:`, error.message);
      return fallback;
    }
    return convertKeysToCamel(data ?? fallback);
  } catch (e) {
    console.warn(`Supabase read error for ${table}:`, e.message);
    return fallback;
  }
};

const writeSupabaseTable = async (table, rows) => {
  if (!supabase) return false;
  
  // Filter to only known columns, store extras in data JSONB
  const filteredRows = (Array.isArray(rows) ? rows : [rows]).map(r => filterForSupabase(table, r));
  
  const tryWrite = async (rowsData, label) => {
    try {
      // First try upsert with onConflict
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const { error } = await supabase.from(table).upsert(rowsData, { onConflict: "id" }).abortSignal(controller.signal);
      clearTimeout(timeout);
      if (!error) return true;
      
      // If upsert fails (maybe no unique constraint), try plain insert
      if (rowsData.length === 1) {
        const controller2 = new AbortController();
        const timeout2 = setTimeout(() => controller2.abort(), 10000);
        const { error: error2 } = await supabase.from(table).insert(rowsData).abortSignal(controller2.signal);
        clearTimeout(timeout2);
        if (!error2) return true;
        console.warn(`Supabase ${label} insert failed for ${table}:`, error2.message, error2.code, error2.details);
      } else {
        console.warn(`Supabase ${label} upsert failed for ${table}:`, error.message, error.code, error.details);
      }
      return false;
    } catch (e) {
      console.warn(`Supabase ${label} write error for ${table}:`, e.message);
      return false;
    }
  };
  
  // Try original camelCase keys first (filtered)
  if (await tryWrite(filteredRows, "camelCase")) return true;
  
  // If camelCase failed, try snake_case conversion
  const snakeRows = filteredRows.map(convertKeysToSnake);
  if (await tryWrite(snakeRows, "snakeCase")) return true;
  
  return false;
};

const readProducts = async () => {
  if (supabase) {
    const items = await readSupabaseTable("products", []);
    if (!Array.isArray(items)) return [];
    // Merge data JSONB column back into product object
    return items.map(p => {
      const data = p.data || {};
      return normalizeProduct({ ...data, ...p });
    });
  }
  const items = await readJsonSafe(PRODUCTS_PATH, []);
  return Array.isArray(items) ? items.map(normalizeProduct) : [];
};
const writeProducts = async (products) => {
  if (supabase) {
    const rows = products.map(product => ({
      ...product,
      images: Array.isArray(product.images) ? product.images.filter(Boolean) : [],
      image: product.image || ""
    }));
    const ok = await writeSupabaseTable("products", rows);
    if (ok) return;
  }
  await writeJsonSafe(PRODUCTS_PATH, products);
};

const readHero = async () => {
  if (supabase) {
    const items = await readSupabaseTable("hero", []);
    return Array.isArray(items) ? items : [];
  }
  return readJsonSafe(HERO_PATH, []);
};
const writeHero = async (slides) => {
  if (supabase) {
    const ok = await writeSupabaseTable("hero", slides);
    if (ok) return;
  }
  await writeJsonSafe(HERO_PATH, slides);
};

const readOrders = async () => {
  if (supabase) {
    const items = await readSupabaseTable("orders", []);
    return Array.isArray(items) ? items : [];
  }
  return readJsonSafe(ORDERS_PATH, []);
};
const writeOrders = async (orders) => {
  if (supabase) {
    const ok = await writeSupabaseTable("orders", orders);
    if (ok) return;
  }
  await writeJsonSafe(ORDERS_PATH, orders);
};

const readUsers = async () => {
  if (supabase) {
    const items = await readSupabaseTable("users", []);
    if (!Array.isArray(items)) return [];
    return items.map(u => {
      // Merge data JSONB column back into user object (for extra fields like altPhone, termsAcceptedAt)
      const data = u.data || {};
      return {
        ...data,
        ...u,
        passwordHash: u.passwordHash || u.passwordhash || null,
        fullName: u.fullName || u.fullname || u.full_name || null,
        createdAt: u.createdAt || u.createdat || u.created_at || null
      };
    });
  }
  return readJsonSafe(USERS_PATH, []);
};
const writeUsers = async (users) => {
  if (supabase) {
    const ok = await writeSupabaseTable("users", users);
    if (ok) return;
  }
  await writeJsonSafe(USERS_PATH, users);
};

const readReviews = async () => {
  if (supabase) {
    const items = await readSupabaseTable("reviews", []);
    return Array.isArray(items) ? items : [];
  }
  return readJsonSafe(REVIEWS_PATH, []);
};
const writeReviews = async (reviews) => {
  if (supabase) {
    const ok = await writeSupabaseTable("reviews", reviews);
    if (ok) return;
  }
  await writeJsonSafe(REVIEWS_PATH, reviews);
};

const buildCategories = (items) => {
  const counts = items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});
  return Object.keys(counts).map(name => ({ name, count: counts[name] }));
};

const calculateTotals = (items, discountCode = "") => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const shipping = subtotal === 0 ? 0 : subtotal >= 300 ? 0 : 25;
  const rate = discountCodes[String(discountCode).toUpperCase()] || 0;
  const discount = Math.round(subtotal * rate);
  const total = Math.max(0, subtotal + shipping - discount);
  return { subtotal, shipping, discount, total };
};

const normalizeOrder = (order) => ({
  ...order,
  status: order.status || "pending",
  statusHistory: Array.isArray(order.statusHistory) ? order.statusHistory : [],
  customer: order.customer || {},
  payment: order.payment || {},
  reviewTokenUsed: Boolean(order.reviewTokenUsed),
  adminAccessToken: order.adminAccessToken || uuidv4()
});

// CORS Configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.static(__dirname, { extensions: ["html"] }));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const serveStaticFile = (req, res, next) => {
  const rawPath = req.path || "/";
  const safePath = rawPath.replace(/^\/+/, "");
  if (!safePath || safePath.includes("../") || !/\.(html|css|js|png|jpg|jpeg|gif|svg|webp|ico|json|woff|woff2|ttf|map)$/i.test(safePath)) {
    return next();
  }
  const filePath = path.join(__dirname, safePath);
  if (existsSync(filePath) && !filePath.includes("..")) {
    return res.sendFile(filePath);
  }
  return next();
};

app.get(/\.(html|css|js|png|jpg|jpeg|gif|svg|webp|ico|json|woff|woff2|ttf|map)$/i, serveStaticFile);

const pageRoutes = [
  ["/index", "/index.html"],
  ["/auth", "/auth.html"],
  ["/login", "/auth.html"],
  ["/register", "/auth.html#register"],
  ["/admin", "/admin.html"],
  ["/track", "/track.html"],
  ["/cart", "/cart.html"],
  ["/category", "/category.html"],
  ["/product", "/product.html"],
  ["/terms", "/terms.html"],
  ["/review", "/review.html"]
];

pageRoutes.forEach(([route, target]) => {
  app.get(route, (req, res) => {
    if (target.includes("#")) {
      return res.redirect(target);
    }
    res.sendFile(path.join(__dirname, target.replace(/^\//, "")));
  });
});


// Diagnostic endpoint to test Supabase write
app.get("/api/debug-write", async (req, res) => {
  if (!supabase) return res.json({ error: "supabase not configured" });
  try {
    // Test: try to upsert a test row to users table
    const testRow = { id: "test-diagnostic-" + Date.now(), name: "Test", email: "diagnostic@test.local", role: "user" };
    const snakeRow = convertKeysToSnake(testRow);
    const { data, error } = await supabase.from("users").insert([snakeRow]).select();
    
    // Clean up: delete the test row
    if (!error) {
      await supabase.from("users").delete().eq("id", testRow.id);
    }
    
    res.json({ 
      insertSuccess: !error, 
      error: error ? { message: error.message, code: error.code, details: error.details, hint: error.hint } : null,
      insertedData: data
    });
  } catch (e) {
    res.json({ error: e.message });
  }
});

// Diagnostic endpoint for products table schema
app.get("/api/debug-schema/:table", async (req, res) => {
  if (!supabase) return res.json({ error: "supabase not configured" });
  try {
    const { data, error } = await supabase.from(req.params.table).select("*").limit(1);
    if (error) {
      return res.json({ error: error.message, code: error.code, details: error.details, hint: error.hint });
    }
    if (data && data.length > 0) {
      return res.json({ columns: Object.keys(data[0]), sample: data[0] });
    }
    return res.json({ columns: [], message: "table is empty, no columns to show" });
  } catch (e) {
    res.json({ error: e.message });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get("/api/debug", async (req, res) => {
  try {
    const result = {
      useSupabase: useSupabase,
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      clientCreated: !!supabase,
      urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 35) : null
    };
    if (supabase) {
      const { data, error } = await supabase.from("users").select("id,email,role").limit(1);
      result.supabaseQuery = error ? { error: error.message } : { ok: true, count: data?.length };
    }
    res.json(result);
  } catch (e) {
    res.json({ error: e.message, useSupabase, hasUrl: !!supabaseUrl, clientCreated: !!supabase });
  }
});

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "unauthorized" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { ...payload, role: normalizeRole(payload.role) };
    next();
  } catch {
    res.status(401).json({ error: "invalid_token" });
  }
};

const requirePermission = (permission) => (req, res, next) => {
  if (!hasPermission(req.user?.role, permission)) {
    return res.status(403).json({ error: "forbidden" });
  }
  next();
};

const buildAuthPayload = (user) => ({
  id: user.id,
  email: user.email,
  phone: user.phone,
  altPhone: user.altPhone,
  address: user.address,
  country: user.country,
  role: normalizeRole(user.role),
  name: user.name,
  permissions: getRolePermissions(user.role)
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "credentials_required" });

    console.log("Login attempt for:", email);
    const users = await readUsers();
    console.log("Users found:", users.length);
    const user = users.find(u => u.email && u.email.toLowerCase() === String(email).trim().toLowerCase());
    if (!user) {
      console.log("User not found");
      return res.status(401).json({ error: "invalid_credentials" });
    }

    console.log("User found, comparing password...");
    console.log("passwordHash type:", typeof user.passwordHash, "length:", user.passwordHash?.length);
    
    if (!user.passwordHash || typeof user.passwordHash !== 'string') {
      console.log("No valid passwordHash, checking plaintext");
      if (user.password === password) {
        const authPayload = buildAuthPayload(user);
        const token = jwt.sign(authPayload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });
        return res.json({ token, user: authPayload });
      }
      return res.status(401).json({ error: "invalid_credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    console.log("bcrypt result:", ok);
    if (!ok) return res.status(401).json({ error: "invalid_credentials" });

    const authPayload = buildAuthPayload(user);
    const token = jwt.sign(authPayload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });
    res.json({ token, user: authPayload });
  } catch (e) {
    console.error("Login error:", e.message);
    res.status(500).json({ error: "login_failed", message: e.message });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
  const { name, email, password, phone, address, country, altPhone, termsAccepted } = req.body || {};
  // allow either email+password or phone-based registration
  const missingFields = [];
  if (!name) missingFields.push("name");
  if (!address) missingFields.push("address");
  if (!country) missingFields.push("country");
  if (!altPhone) missingFields.push("altPhone");
  if (!termsAccepted) missingFields.push("terms");
  if (!email && !phone) missingFields.push("contact");
  if (missingFields.length) {
    return res.status(400).json({ error: "missing_profile_fields", fields: missingFields });
  }
  if (email && String(password).length < 6) return res.status(400).json({ error: "weak_password" });
  const altPhoneSanitized = sanitizePhone(altPhone);
  if (altPhoneSanitized.length < 8) {
    return res.status(400).json({ error: "invalid_alt_phone" });
  }

  const users = await readUsers();
  if (email) {
    const normalizedEmail = String(email).trim().toLowerCase();
    if (users.some(u => u.email && u.email.toLowerCase() === normalizedEmail)) {
      return res.status(409).json({ error: "email_exists" });
    }
  }
  if (phone) {
    const sanitized = sanitizePhone(phone);
    if (users.some(u => u.phone && sanitizePhone(u.phone) === sanitized)) {
      return res.status(409).json({ error: "phone_exists" });
    }
  }

  const user = {
    id: uuidv4(),
    name: String(name).trim(),
    email: email ? String(email).trim().toLowerCase() : undefined,
    phone: phone ? sanitizePhone(phone) : undefined,
    altPhone: altPhoneSanitized,
    address: String(address).trim(),
    country: String(country).trim(),
    passwordHash: email ? await bcrypt.hash(password, 10) : undefined,
    role: "user",
    termsAcceptedAt: new Date().toISOString()
  };

  users.push(user);
  await writeUsers(users);

  const authPayload = buildAuthPayload(user);
  const token = jwt.sign(authPayload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });
  res.status(201).json({ token, user: authPayload });
  } catch (e) {
    console.error("Register error:", e.message);
    res.status(500).json({ error: "register_failed", message: e.message });
  }
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    phone: req.user.phone,
    altPhone: req.user.altPhone,
    address: req.user.address,
    country: req.user.country,
    role: req.user.role,
    permissions: getRolePermissions(req.user.role)
  });
});


app.post("/api/auth/oauth", async (req, res) => {
  const { email, name } = req.body || {};
  if (!email) return res.status(400).json({ error: "email_required" });
  const users = await readUsers();
  let user = users.find(u => u.email && u.email.toLowerCase() === String(email).trim().toLowerCase());
  if (!user) {
    user = {
      id: uuidv4(),
      name: String(name || "").trim() || email.split("@")[0],
      email: String(email).trim().toLowerCase(),
      role: "user"
    };
    users.push(user);
    await writeUsers(users);
  }
  const authPayload = buildAuthPayload(user);
  const token = jwt.sign(authPayload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });
  res.json({ token, user: authPayload });
});

app.post("/api/auth/phone", async (req, res) => {
  const { phone, name, address, country, altPhone, termsAccepted } = req.body || {};
  if (!phone) return res.status(400).json({ error: "phone_required" });
  const sanitized = sanitizePhone(phone);
  const users = await readUsers();
  let user = users.find(u => u.phone && sanitizePhone(u.phone) === sanitized);
  if (!user) {
    const missingFields = [];
    if (!name) missingFields.push("name");
    if (!address) missingFields.push("address");
    if (!country) missingFields.push("country");
    if (!altPhone) missingFields.push("altPhone");
    if (!termsAccepted) missingFields.push("terms");
    if (missingFields.length) {
      return res.status(400).json({ error: "missing_profile_fields", fields: missingFields });
    }
    const altPhoneSanitized = sanitizePhone(altPhone);
    if (altPhoneSanitized.length < 8) {
      return res.status(400).json({ error: "invalid_alt_phone" });
    }
    user = {
      id: uuidv4(),
      name: String(name).trim(),
      phone: sanitized,
      altPhone: altPhoneSanitized,
      address: String(address).trim(),
      country: String(country).trim(),
      role: "user",
      termsAcceptedAt: new Date().toISOString()
    };
    users.push(user);
    await writeUsers(users);
  }
  const authPayload = buildAuthPayload(user);
  const token = jwt.sign(authPayload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });
  res.json({ token, user: authPayload });
});

// return orders belonging to the authenticated user
app.get("/api/orders/my", requireAuth, async (req, res) => {
  const orders = await readOrders();
  const myOrders = orders.filter(order => {
    if (req.user.email && order.customer?.email) {
      return order.customer.email.toLowerCase() === req.user.email.toLowerCase();
    }
    if (req.user.phone && order.customer?.phone) {
      return sanitizePhone(order.customer.phone) === sanitizePhone(req.user.phone);
    }
    return false;
  });
  res.json(myOrders);
});

app.get("/api/products", async (req, res) => {
  const products = await readProducts();
  const { category, q } = req.query;
  let list = products;
  if (category) list = list.filter(item => item.category === category);
  if (q) {
    const term = String(q).toLowerCase();
    list = list.filter(item =>
      item.name.toLowerCase().includes(term) ||
      item.short.toLowerCase().includes(term) ||
      item.category.toLowerCase().includes(term)
    );
  }
  res.json(list);
});

app.get("/api/products/:id", async (req, res) => {
  const products = await readProducts();
  const item = products.find(p => p.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: "not_found" });
  res.json(item);
});

app.get("/api/products/:id/reviews", async (req, res) => {
  const productId = Number(req.params.id);
  const reviews = await readReviews();
  const visible = [];

  reviews.forEach(review => {
    (review.products || []).forEach(item => {
      if (item.productId === productId && item.visible) {
        visible.push({
          reviewId: review.id,
          customerName: review.customerName,
          stars: item.stars,
          comment: item.comment || "",
          createdAt: review.createdAt
        });
      }
    });
  });

  res.json(visible);
});

app.get("/api/categories", async (req, res) => {
  res.json(buildCategories(await readProducts()));
});

app.get("/api/hero", async (req, res) => {
  res.json(await readHero());
});

app.post("/api/orders", upload.single("transferProofImage"), async (req, res) => {
  const items = parseJsonField(req.body.items, []);
  const customer = parseJsonField(req.body.customer, {});
  const payment = parseJsonField(req.body.payment, {});
  const discountCode = String(req.body.discountCode || "");

  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: "items_required" });
  if (!customer.name || !customer.phone || !customer.address) return res.status(400).json({ error: "customer_required" });
  if (!payment.method || !payment.provider || !payment.transferTo) return res.status(400).json({ error: "payment_required" });

  const products = await readProducts();
  const enriched = items.map(item => {
    const product = products.find(p => p.id === Number(item.id));
    if (!product) return null;
    return { id: product.id, name: product.name, price: product.price, qty: Number(item.qty || 1), sku: product.sku };
  }).filter(Boolean);

  if (!enriched.length) return res.status(400).json({ error: "invalid_items" });

  const subtotal = enriched.reduce((sum, item) => sum + item.price * item.qty, 0);
  const couponMeta = await resolveCouponMeta(discountCode, subtotal);
  const totals = {
    subtotal,
    shipping: subtotal === 0 ? 0 : subtotal >= 300 ? 0 : 25,
    discount: couponMeta.valid ? (couponMeta.type === 'amount' ? Math.min(Number(couponMeta.value || 0), subtotal) : Math.round(subtotal * (couponMeta.rate || 0))) : 0,
    total: Math.max(0, subtotal + (subtotal === 0 ? 0 : subtotal >= 300 ? 0 : 25) - (couponMeta.valid ? (couponMeta.type === 'amount' ? Math.min(Number(couponMeta.value || 0), subtotal) : Math.round(subtotal * (couponMeta.rate || 0))) : 0))
  };

  const createdAt = new Date().toISOString();
  const order = {
    id: uuidv4(),
    createdAt,
    updatedAt: createdAt,
    status: "pending",
    statusHistory: [{ status: "pending", label: statusLabels.pending, at: createdAt, note: "تم استلام الطلب." }],
    adminAccessToken: uuidv4(),
    reviewToken: null,
    reviewTokenUsed: false,
    items: enriched,
    discountCode: couponMeta.valid ? discountCode : "",
    customer,
    payment: {
      method: payment.method,
      provider: payment.provider,
      transferTo: payment.transferTo,
      transferAccount: payment.transferAccount || "",
      transferProofImage: toUploadPath(req.file),
      transferRef: String(payment.transferRef || "")
    },
    totals
  };

  const orders = await readOrders();
  orders.unshift(order);
  await writeOrders(orders);
  res.status(201).json(order);
});

app.post("/api/orders/track", async (req, res) => {
  const { orderCode, phone } = req.body || {};
  if (!orderCode || !phone) return res.status(400).json({ error: "missing_fields" });

  const targetCode = String(orderCode).trim().toLowerCase();
  const targetPhone = sanitizePhone(phone);
  const orders = (await readOrders()).map(normalizeOrder);

  const order = orders.find(item =>
    item.id.toLowerCase().startsWith(targetCode) &&
    sanitizePhone(item.customer?.phone) === targetPhone
  );

  if (!order) return res.status(404).json({ error: "not_found" });

  res.json({
    id: order.id,
    createdAt: order.createdAt,
    status: order.status,
    statusLabel: statusLabels[order.status] || order.status,
    statusHistory: order.statusHistory,
    items: order.items,
    totals: order.totals,
    customer: { name: order.customer?.name || "", phone: order.customer?.phone || "" }
  });
});

app.get("/api/review/:token", async (req, res) => {
  const token = String(req.params.token || "");
  const orders = (await readOrders()).map(normalizeOrder);
  const order = orders.find(o => o.reviewToken === token || o.id === token || o.id.startsWith(token));
  if (!order) return res.status(404).json({ error: "not_found" });
  if (order.reviewTokenUsed) return res.status(410).json({ error: "token_used" });

  res.json({ orderId: order.id, reviewToken: order.reviewToken || order.id, customerName: order.customer?.name || "", items: order.items || [] });
});

app.post("/api/review/:token", async (req, res) => {
  const token = String(req.params.token || "");
  const payload = req.body || {};
  const courierRating = Number(payload.courierRating || 0);
  if (courierRating < 1 || courierRating > 5) return res.status(400).json({ error: "courier_rating_required" });

  const orders = await readOrders();
  const orderIndex = orders.findIndex(o => o.reviewToken === token || o.id === token || o.id.startsWith(token));
  if (orderIndex === -1) return res.status(404).json({ error: "not_found" });

  const order = normalizeOrder(orders[orderIndex]);
  if (order.reviewTokenUsed) return res.status(410).json({ error: "token_used" });

  const products = await readProducts();
  const productFeedback = Array.isArray(payload.productFeedback) ? payload.productFeedback : [];

  const normalizedProductFeedback = productFeedback
    .map(item => ({
      id: uuidv4(),
      productId: Number(item.productId),
      productName: String(item.productName || ""),
      stars: Number(item.stars || 0),
      comment: String(item.comment || "").trim(),
      visible: false
    }))
    .filter(item => item.productId > 0 && item.stars >= 1 && item.stars <= 5);

  normalizedProductFeedback.forEach(item => {
    const index = products.findIndex(p => p.id === item.productId);
    if (index === -1) return;
    const currentReviews = Number(products[index].reviews || 0);
    const currentRating = Number(products[index].rating || 0);
    const nextReviews = currentReviews + 1;
    const nextRating = ((currentRating * currentReviews) + item.stars) / nextReviews;
    products[index].reviews = nextReviews;
    products[index].rating = Number(nextRating.toFixed(1));
  });

  const review = {
    id: uuidv4(),
    orderId: order.id,
    customerName: order.customer?.name || "",
    customerPhone: order.customer?.phone || "",
    receivedConfirmed: payload.receivedConfirmed !== false,
    courierRating,
    courierComment: String(payload.courierComment || "").trim(),
    products: normalizedProductFeedback,
    createdAt: new Date().toISOString()
  };

  const reviews = await readReviews();
  reviews.unshift(review);

  order.reviewTokenUsed = true;
  order.receivedConfirmed = payload.receivedConfirmed !== false;
  order.reviewedAt = new Date().toISOString();
  orders[orderIndex] = order;

  await Promise.all([writeOrders(orders), writeReviews(reviews), writeProducts(products)]);
  res.status(201).json({ ok: true, reviewId: review.id });
});

app.get("/api/admin/orders", requireAuth, requirePermission("orders.read"), async (req, res) => {
  const { status = "", dateFrom = "", dateTo = "", q = "" } = req.query;
  let orders = (await readOrders()).map(normalizeOrder);

  if (status) orders = orders.filter(order => order.status === status);
  if (dateFrom) {
    const from = new Date(dateFrom).getTime();
    if (!Number.isNaN(from)) orders = orders.filter(order => new Date(order.createdAt).getTime() >= from);
  }
  if (dateTo) {
    const to = new Date(dateTo).getTime();
    if (!Number.isNaN(to)) orders = orders.filter(order => new Date(order.createdAt).getTime() <= to + (24 * 60 * 60 * 1000 - 1));
  }
  if (q) {
    const term = String(q).toLowerCase();
    orders = orders.filter(order =>
      order.id.toLowerCase().includes(term) ||
      String(order.customer?.name || "").toLowerCase().includes(term) ||
      String(order.customer?.phone || "").toLowerCase().includes(term)
    );
  }

  res.json(orders);
});

app.get("/api/admin/orders/access/:token", requireAuth, requirePermission("orders.read"), async (req, res) => {
  const token = String(req.params.token || "");
  const orders = (await readOrders()).map(normalizeOrder);
  const order = orders.find(o => o.adminAccessToken === token);
  if (!order) return res.status(404).json({ error: "not_found" });
  res.json(order);
});

app.patch("/api/admin/orders/:id/status", requireAuth, requirePermission("orders.read"), async (req, res) => {
  const { status } = req.body || {};
  if (!orderStatuses.includes(status)) return res.status(400).json({ error: "invalid_status" });
  if (status === "delivered") return res.status(400).json({ error: "use_delivered_endpoint" });

  if (["confirmed", "cancelled"].includes(status) && !hasPermission(req.user.role, "orders.support") && !hasPermission(req.user.role, "orders.shipping") && !hasPermission(req.user.role, "orders.delivered")) {
    return res.status(403).json({ error: "forbidden" });
  }

  if (["packed", "shipped"].includes(status) && !hasPermission(req.user.role, "orders.shipping") && !hasPermission(req.user.role, "orders.delivered")) {
    return res.status(403).json({ error: "forbidden" });
  }

  const orders = await readOrders();
  const index = orders.findIndex(order => order.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "not_found" });

  const next = normalizeOrder(orders[index]);
  const now = new Date().toISOString();
  next.status = status;
  next.updatedAt = now;
  next.statusHistory.push({ status, label: statusLabels[status], at: now, note: `تم تحديث الحالة إلى ${statusLabels[status]}` });

  const customerName = next.customer?.name || "العميل";
  const orderCode = next.id.slice(0, 8);
  next.lastNotification = {
    channel: "whatsapp",
    message: `مرحبًا ${customerName}، طلبك رقم ${orderCode} حالته الآن: ${statusLabels[status]}.`,
    sentAt: now
  };

  orders[index] = next;
  await writeOrders(orders);
  res.json(next);
});

app.patch("/api/admin/orders/:id/delivered", requireAuth, requirePermission("orders.delivered"), upload.single("deliveryProofImage"), async (req, res) => {
  const courierNote = String(req.body.courierNote || "");

  const orders = await readOrders();
  const index = orders.findIndex(order => order.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "not_found" });

  const next = normalizeOrder(orders[index]);
  const now = new Date().toISOString();
  const reviewToken = uuidv4();

  next.status = "delivered";
  next.updatedAt = now;
  next.reviewToken = reviewToken;
  next.reviewTokenUsed = false;
  next.delivery = {
    proofImage: toUploadPath(req.file),
    courierNote
  };
  next.statusHistory.push({ status: "delivered", label: statusLabels.delivered, at: now, note: "المندوب أكد التسليم." });

  const reviewPath = `/review.html?token=${reviewToken}`;
  const customerName = next.customer?.name || "العميل";
  const orderCode = next.id.slice(0, 8);
  next.lastNotification = {
    channel: "whatsapp",
    message: `مرحبًا ${customerName}، تم توصيل طلبك رقم ${orderCode}. من فضلك أكد الاستلام وقيّم التجربة من هنا: ${reviewPath}`,
    sentAt: now
  };

  orders[index] = next;
  await writeOrders(orders);
  res.json({ ...next, reviewPath });
});

app.get("/api/admin/reviews", requireAuth, requirePermission("reviews.read"), async (req, res) => {
  res.json(await readReviews());
});

app.patch("/api/admin/reviews/:reviewId/products/:productReviewId", requireAuth, requirePermission("reviews.manage"), async (req, res) => {
  const { visible } = req.body || {};
  const reviews = await readReviews();

  const reviewIndex = reviews.findIndex(r => r.id === req.params.reviewId);
  if (reviewIndex === -1) return res.status(404).json({ error: "review_not_found" });

  const productIndex = (reviews[reviewIndex].products || []).findIndex(p => p.id === req.params.productReviewId);
  if (productIndex === -1) return res.status(404).json({ error: "product_review_not_found" });

  reviews[reviewIndex].products[productIndex].visible = Boolean(visible);
  await writeReviews(reviews);
  res.json(reviews[reviewIndex].products[productIndex]);
});

app.get("/api/admin/staff", requireAuth, requirePermission("staff.manage"), async (req, res) => {
  const users = await readUsers();
  const staff = users
    .filter(u => ["supervisor", "shipping", "support", "admin"].includes(normalizeRole(u.role)))
    .map(u => ({ id: u.id, name: u.name, email: u.email, role: normalizeRole(u.role) }));
  res.json(staff);
});

app.post("/api/admin/staff", requireAuth, requirePermission("staff.manage"), async (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "missing_fields" });
  }
  if (!["supervisor", "shipping", "support"].includes(role)) {
    return res.status(400).json({ error: "invalid_role" });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: "weak_password" });
  }

  const users = await readUsers();
  const normalizedEmail = String(email).trim().toLowerCase();
  if (users.some(u => u.email && u.email.toLowerCase() === normalizedEmail)) {
    return res.status(409).json({ error: "email_exists" });
  }

  const user = {
    id: uuidv4(),
    name: String(name).trim(),
    email: normalizedEmail,
    passwordHash: await bcrypt.hash(password, 10),
    role
  };

  users.push(user);
  await writeUsers(users);
  res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

app.patch("/api/admin/staff/:id/role", requireAuth, requirePermission("staff.manage"), async (req, res) => {
  const { role } = req.body || {};
  if (!["supervisor", "shipping", "support"].includes(role)) {
    return res.status(400).json({ error: "invalid_role" });
  }

  const users = await readUsers();
  const index = users.findIndex(u => u.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "not_found" });

  users[index].role = role;
  await writeUsers(users);
  res.json({ id: users[index].id, name: users[index].name, email: users[index].email, role });
});

app.get("/api/admin/users", requireAuth, requirePermission("users.read"), async (req, res) => {
  const { country = "", phoneKey = "", letter = "", q = "", roleType = "" } = req.query || {};
  let users = await readUsers();

  const roleFilter = String(roleType || "").trim().toLowerCase();
  if (roleFilter === "customers") {
    users = users.filter(u => normalizeRole(u.role) === "user");
  } else if (roleFilter === "staff") {
    users = users.filter(u => normalizeRole(u.role) !== "user");
  }

  const countryNeedle = String(country || "").trim().toLowerCase();
  if (countryNeedle) {
    users = users.filter(u => String(u.country || "").trim().toLowerCase() === countryNeedle);
  }

  const phoneNeedle = sanitizePhone(phoneKey);
  if (phoneNeedle) {
    users = users.filter(u => {
      const mainPhone = sanitizePhone(u.phone || "");
      const altPhone = sanitizePhone(u.altPhone || "");
      return mainPhone.startsWith(phoneNeedle) || altPhone.startsWith(phoneNeedle);
    });
  }

  const letterNeedle = String(letter || "").trim().toLowerCase();
  if (letterNeedle) {
    users = users.filter(u => String(u.name || "").toLowerCase().includes(letterNeedle));
  }

  const qNeedle = String(q || "").trim().toLowerCase();
  const qPhone = sanitizePhone(q);
  if (qNeedle || qPhone) {
    users = users.filter(u => {
      const nameMatch = String(u.name || "").toLowerCase().includes(qNeedle);
      const emailMatch = String(u.email || "").toLowerCase().includes(qNeedle);
      const addressMatch = String(u.address || "").toLowerCase().includes(qNeedle);
      const countryMatch = String(u.country || "").toLowerCase().includes(qNeedle);
      const phoneMatch = qPhone
        ? sanitizePhone(u.phone || "").includes(qPhone) || sanitizePhone(u.altPhone || "").includes(qPhone)
        : false;
      return nameMatch || emailMatch || addressMatch || countryMatch || phoneMatch;
    });
  }

  users.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ar"));

  res.json(users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email || "",
    phone: u.phone || "",
    altPhone: u.altPhone || "",
    address: u.address || "",
    country: u.country || "",
    role: normalizeRole(u.role)
  })));
});

app.get("/api/admin/products", requireAuth, requirePermission("catalog.manage"), async (req, res) => {
  res.json(await readProducts());
});

app.post("/api/admin/products", requireAuth, requirePermission("catalog.manage"), async (req, res) => {
  try {
  const products = await readProducts();
  const payload = req.body || {};
  if (!payload.name || Number(payload.price) <= 0 || !payload.category) {
    return res.status(400).json({ error: "missing_fields" });
  }

  const images = Array.isArray(payload.images) ? payload.images.filter(Boolean) : [];
  if (!images.length && payload.image) images.push(payload.image);
  const en = payload.i18n?.en || {};
  const i18n = {
    en: {
      name: en.name ? String(en.name).trim() : "",
      category: en.category ? String(en.category).trim() : "",
      short: en.short ? String(en.short).trim() : "",
      details: en.details ? String(en.details).trim() : "",
      usage: en.usage ? String(en.usage).trim() : "",
      brand: en.brand ? String(en.brand).trim() : ""
    }
  };
  const hasEn = Object.values(i18n.en).some(Boolean);

  const id = products.length ? Math.max(...products.map(p => p.id)) + 1 : 1;
  const product = {
    id,
    name: payload.name,
    short: payload.short || "",
    price: Number(payload.price),
    category: payload.category,
    image: images[0] || "",
    images,
    discount: payload.discount || "لا يوجد",
    usage: payload.usage || "",
    details: payload.details || "",
    brand: payload.brand || "",
    sku: payload.sku || `FR-${id}`,
    stock: Number(payload.stock || 0),
    rating: Number(payload.rating || 0),
    reviews: Number(payload.reviews || 0),
    tags: Array.isArray(payload.tags) ? payload.tags : []
  };
  if (hasEn) product.i18n = i18n;

  products.push(product);
  await writeProducts(products);
  res.status(201).json(product);
  } catch (e) {
    console.error("Add product error:", e.message);
    res.status(500).json({ error: "product_add_failed", message: e.message });
  }
});

app.put("/api/admin/products/:id", requireAuth, requirePermission("catalog.manage"), async (req, res) => {
  try {
  const products = await readProducts();
  const id = Number(req.params.id);
  const index = products.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).json({ error: "not_found" });

  const payload = req.body || {};
  const nextPrice = payload.price === undefined ? products[index].price : Number(payload.price);
  const nextStock = payload.stock === undefined ? products[index].stock : Number(payload.stock);
  if (Number.isNaN(nextPrice) || nextPrice < 0) return res.status(400).json({ error: "invalid_price" });
  if (Number.isNaN(nextStock) || nextStock < 0) return res.status(400).json({ error: "invalid_stock" });

  const hasImagePayload = Object.prototype.hasOwnProperty.call(payload, "images") ||
    Object.prototype.hasOwnProperty.call(payload, "image");
  let images = products[index].images || (products[index].image ? [products[index].image] : []);
  if (hasImagePayload) {
    images = Array.isArray(payload.images) ? payload.images.filter(Boolean) : [];
    if (!images.length && payload.image) images.push(payload.image);
  }

  const currentI18n = products[index].i18n || {};
  let nextI18n = currentI18n;
  if (payload.i18n && payload.i18n.en) {
    const en = payload.i18n.en || {};
    const cleaned = {
      name: en.name ? String(en.name).trim() : "",
      category: en.category ? String(en.category).trim() : "",
      short: en.short ? String(en.short).trim() : "",
      details: en.details ? String(en.details).trim() : "",
      usage: en.usage ? String(en.usage).trim() : "",
      brand: en.brand ? String(en.brand).trim() : ""
    };
    const hasEn = Object.values(cleaned).some(Boolean);
    nextI18n = hasEn ? { ...currentI18n, en: cleaned } : currentI18n;
  }

  const updated = {
    ...products[index],
    ...payload,
    id,
    price: nextPrice,
    stock: nextStock,
    images,
    image: images[0] || "",
    i18n: nextI18n
  };
  products[index] = updated;
  await writeProducts(products);
  res.json(updated);
  } catch (e) {
    console.error("Update product error:", e.message);
    res.status(500).json({ error: "update_failed", message: e.message });
  }
});

app.delete("/api/admin/products/:id", requireAuth, requirePermission("catalog.manage"), async (req, res) => {
  try {
  const products = await readProducts();
  const id = Number(req.params.id);
  const next = products.filter(p => p.id !== id);
  if (next.length === products.length) return res.status(404).json({ error: "not_found" });
  // Delete from Supabase directly
  if (supabase) {
    await supabase.from("products").delete().eq("id", id);
  }
  await writeProducts(next);
  res.json({ ok: true });
  } catch (e) {
    console.error("Delete product error:", e.message);
    res.status(500).json({ error: "delete_failed", message: e.message });
  }
});

app.get("/api/admin/hero", requireAuth, requirePermission("catalog.manage"), async (req, res) => {
  res.json(await readHero());
});

app.post("/api/admin/hero", requireAuth, requirePermission("catalog.manage"), async (req, res) => {
  const hero = await readHero();
  const payload = req.body || {};
  if (!payload.title || !payload.text) return res.status(400).json({ error: "missing_fields" });

  const id = hero.length ? Math.max(...hero.map(s => s.id || 0)) + 1 : 1;
  const slide = {
    id,
    title: String(payload.title),
    text: String(payload.text),
    badge: String(payload.badge || "عرض خاص"),
    image: String(payload.image || "")
  };

  hero.push(slide);
  await writeHero(hero);
  res.status(201).json(slide);
});

app.put("/api/admin/hero/:id", requireAuth, requirePermission("catalog.manage"), async (req, res) => {
  const hero = await readHero();
  const id = Number(req.params.id);
  const index = hero.findIndex(s => Number(s.id) === id);
  if (index === -1) return res.status(404).json({ error: "not_found" });

  const updated = { ...hero[index], ...(req.body || {}), id };
  if (!updated.title || !updated.text) return res.status(400).json({ error: "missing_fields" });

  hero[index] = updated;
  await writeHero(hero);
  res.json(updated);
});

app.delete("/api/admin/hero/:id", requireAuth, requirePermission("catalog.manage"), async (req, res) => {
  const hero = await readHero();
  const id = Number(req.params.id);
  const next = hero.filter(s => Number(s.id) !== id);
  if (next.length === hero.length) return res.status(404).json({ error: "not_found" });
  await writeHero(next);
  res.json({ ok: true });
});

// ---------------------- Additional admin endpoints ------------------
const ACTIVITY_PATH = path.join(DATA_DIR, "activity.json");
const UNDO_PATH = path.join(DATA_DIR, "undo.json");
const PRESCRIPTIONS_PATH = path.join(DATA_DIR, "prescriptions.json");
const PROMOTIONS_PATH = path.join(DATA_DIR, "promotions.json");
const SUPPORT_PATH = path.join(DATA_DIR, "support_questions.json");
const TICKETS_PATH = path.join(DATA_DIR, "support_tickets.json");
const RETURNS_PATH = path.join(DATA_DIR, "returns.json");
const USER_LISTS_PATH = path.join(DATA_DIR, "user_lists.json");

const readActivities = async () => readJsonSafe(ACTIVITY_PATH, []);
const writeActivities = async (v) => writeJsonSafe(ACTIVITY_PATH, v);
const pushActivity = async (entry, user) => {
  try {
    const list = await readActivities();
    const item = { id: uuidv4(), time: new Date().toISOString(), entry: String(entry), user: user || null };
    list.unshift(item);
    await writeActivities(list.slice(0, 1000));
    return item;
  } catch (e) {
    console.warn('pushActivity error', e);
    return null;
  }
};

const readUndoQueue = async () => readJsonSafe(UNDO_PATH, []);
const writeUndoQueue = async (v) => writeJsonSafe(UNDO_PATH, v);

const readPrescriptions = async () => readJsonSafe(PRESCRIPTIONS_PATH, []);
const writePrescriptions = async (v) => writeJsonSafe(PRESCRIPTIONS_PATH, v);

const readPromotions = async () => readJsonSafe(PROMOTIONS_PATH, []);
const writePromotions = async (v) => writeJsonSafe(PROMOTIONS_PATH, v);
const readSupport = async () => readJsonSafe(SUPPORT_PATH, []);
const writeSupport = async (v) => writeJsonSafe(SUPPORT_PATH, v);

const resolveCouponMeta = async (code, subtotal = 0) => {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return { valid: false, code: "", type: "percent", value: 0, message: "missing_code" };

  const promos = await readPromotions();
  const promo = promos.find(p => String(p.code || "").toUpperCase() === normalized);
  if (promo) {
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      return { valid: false, code: normalized, type: promo.type || "percent", value: Number(promo.value || 0), message: "expired" };
    }
    if (promo.maxUses && (promo.uses || 0) >= promo.maxUses) {
      return { valid: false, code: normalized, type: promo.type || "percent", value: Number(promo.value || 0), message: "no_uses_left" };
    }
    if (String(promo.type || "amount").toLowerCase() === "percent") {
      return { valid: true, code: normalized, type: "percent", value: Number(promo.value || 0), rate: Number(promo.value || 0) / 100, message: "ok" };
    }
    return { valid: true, code: normalized, type: "amount", value: Number(promo.value || 0), rate: 0, message: "ok" };
  }

  const fallbackRate = discountCodes[normalized] || 0;
  if (!fallbackRate) return { valid: false, code: normalized, type: "percent", value: 0, message: "not_found" };
  return { valid: true, code: normalized, type: "percent", value: fallbackRate * 100, rate: fallbackRate, message: "ok" };
};
const readTickets = async () => readJsonSafe(TICKETS_PATH, []);
const writeTickets = async (v) => writeJsonSafe(TICKETS_PATH, v);
const readReturns = async () => readJsonSafe(RETURNS_PATH, []);
const writeReturns = async (v) => writeJsonSafe(RETURNS_PATH, v);
const readUserLists = async () => readJsonSafe(USER_LISTS_PATH, []);
const writeUserLists = async (v) => writeJsonSafe(USER_LISTS_PATH, v);

// Support Tickets (simple ticket + chat via messages array)
app.post('/api/support/tickets', requireAuth, async (req, res) => {
  const { title, subject, priority } = req.body || {};
  if (!title || !subject) return res.status(400).json({ error: 'missing_fields' });
  const list = await readTickets();
  const ticket = { id: uuidv4(), userId: req.user.id, userEmail: req.user.email, title: String(title), subject: String(subject), priority: priority || 'medium', status: 'open', createdAt: new Date().toISOString(), messages: [{ id: uuidv4(), by: req.user.email, role: 'user', text: String(subject), at: new Date().toISOString() }] };
  list.unshift(ticket);
  await writeTickets(list);
  await pushActivity(`تذكرة دعم جديدة: ${ticket.title} (${ticket.id})`, req.user.email);
  res.status(201).json(ticket);
});

app.get('/api/support/tickets', requireAuth, async (req, res) => {
  const list = await readTickets();
  const mine = list.filter(t => String(t.userId) === String(req.user.id));
  res.json(mine);
});

app.get('/api/support/tickets/:id', requireAuth, async (req, res) => {
  const list = await readTickets();
  const ticket = list.find(t => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'not_found' });
  if (String(ticket.userId) !== String(req.user.id) && !(req.user && req.user.permissions && req.user.permissions.includes('staff.manage'))) return res.status(403).json({ error: 'forbidden' });
  res.json(ticket);
});

app.post('/api/support/tickets/:id/message', requireAuth, async (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'missing_text' });
  const list = await readTickets();
  const idx = list.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found' });
  const ticket = list[idx];
  if (String(ticket.userId) !== String(req.user.id)) return res.status(403).json({ error: 'forbidden' });
  const msg = { id: uuidv4(), by: req.user.email, role: 'user', text: String(text), at: new Date().toISOString() };
  ticket.messages = ticket.messages || [];
  ticket.messages.push(msg);
  ticket.updatedAt = new Date().toISOString();
  await writeTickets(list);
  await pushActivity(`رسالة جديدة في تذكرة ${ticket.id} من ${req.user.email}`, req.user.email);
  res.json(msg);
});

// Admin ticket endpoints
app.get('/api/admin/support/tickets', requireAuth, requirePermission('staff.manage'), async (req, res) => {
  const list = await readTickets();
  res.json(list);
});

app.post('/api/admin/support/tickets/:id/message', requireAuth, requirePermission('staff.manage'), async (req, res) => {
  const { text, setStatus } = req.body || {};
  if (!text && !setStatus) return res.status(400).json({ error: 'missing_payload' });
  const list = await readTickets();
  const idx = list.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found' });
  if (text) {
    const msg = { id: uuidv4(), by: req.user.email, role: 'admin', text: String(text), at: new Date().toISOString() };
    list[idx].messages = list[idx].messages || [];
    list[idx].messages.push(msg);
  }
  if (setStatus) list[idx].status = setStatus;
  list[idx].updatedAt = new Date().toISOString();
  await writeTickets(list);
  await pushActivity(`رد إداري على التذكرة ${list[idx].id} بواسطة ${req.user.email}`, req.user.email);
  res.json(list[idx]);
});

// Recommendations: simple engine based on user's past orders
app.get('/api/recommendations', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const orders = await readOrders();
  const products = await readProducts();
  // collect categories and purchased product ids, with time-decay weighting for recent purchases
  const purchased = new Set();
  const categoryCount = {};
  const now = Date.now();
  orders.filter(o => String(o.customer?.id || o.userId) === String(userId)).forEach(o => {
    const ageDays = Math.max(1, (now - new Date(o.createdAt).getTime()) / (1000*60*60*24));
    const weight = 1 / Math.log2(ageDays + 1);
    (o.items || []).forEach(it => {
      purchased.add(String(it.id));
      const prod = products.find(p => String(p.id) === String(it.id));
      if (prod && prod.category) categoryCount[prod.category] = (categoryCount[prod.category] || 0) + ((it.qty || 1) * weight);
    });
  });
  // sort categories
  const favCategories = Object.entries(categoryCount).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
  let candidates = [];
  if (favCategories.length) {
    candidates = products.filter(p => favCategories.includes(p.category) && !purchased.has(String(p.id)));
  }
  if (!candidates.length) {
    // fallback: top-selling
    const sales = {};
    orders.forEach(o => (o.items||[]).forEach(i => sales[i.id] = (sales[i.id]||0) + (i.qty||1)));
    candidates = products.slice().sort((a,b)=> (sales[b.id]||0) - (sales[a.id]||0)).filter(p => !purchased.has(String(p.id))).slice(0,10);
  }
  res.json({ recommendations: candidates.slice(0,10) });
});

// Returns / Refunds
app.post('/api/returns', requireAuth, upload.array('photos', 6), async (req, res) => {
  const { orderId, reason, details } = req.body || {};
  if (!orderId || !reason) return res.status(400).json({ error: 'missing_fields' });
  const files = (req.files || []).map(f => `/images/uploads/${path.basename(f.path)}`);
  const list = await readReturns();
  const entry = { id: uuidv4(), userId: req.user.id, orderId: String(orderId), reason: String(reason), details: String(details || ''), photos: files, status: 'requested', createdAt: new Date().toISOString() };
  list.unshift(entry);
  await writeReturns(list);
  await pushActivity(`طلب إرجاع جديد: ${entry.id} (طلب ${orderId})`, req.user.email);
  res.status(201).json(entry);
});

app.get('/api/admin/returns', requireAuth, requirePermission('staff.manage'), async (req, res) => {
  const list = await readReturns();
  res.json(list);
});

// Invoice generation: return a simple HTML invoice for printing (can be saved as PDF client-side)
app.get('/api/orders/:id/invoice', requireAuth, async (req, res) => {
  const orders = await readOrders();
  const order = orders.find(o => String(o.id) === String(req.params.id));
  if (!order) return res.status(404).send('not found');
  // simple HTML
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${order.id}</title><style>body{font-family:Arial,serif}</style></head><body><h1>فاتورة طلب ${order.id}</h1><div>تاريخ: ${order.createdAt}</div><h3>العميل</h3><div>${order.customer?.name||''}</div><div>${order.customer?.phone||''}</div><h3>العناصر</h3><ul>${(order.items||[]).map(i=>`<li>${i.name} x${i.qty} - ${i.price} EGP</li>`).join('')}</ul><h3>المجموع</h3><div>${order.totals?.grand || calculateTotals(order.items).grand} </div></body></html>`;
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Smart lists: save/get user lists (saved, viewed, care lists)
app.get('/api/user/lists', requireAuth, async (req, res) => { const lists = await readUserLists(); res.json((lists||[]).filter(l => String(l.userId) === String(req.user.id))); });
app.post('/api/user/lists', requireAuth, async (req, res) => { const { name, type, items } = req.body || {}; if (!name) return res.status(400).json({ error: 'missing_name' }); const lists = await readUserLists(); const entry = { id: uuidv4(), userId: req.user.id, name: String(name), type: String(type||'saved'), items: items||[], createdAt: new Date().toISOString() }; lists.unshift(entry); await writeUserLists(lists); res.status(201).json(entry); });

// Coupons / Promotions: admin CRUD + user redeem
app.post('/api/admin/coupons', requireAuth, requirePermission('staff.manage'), async (req, res) => {
  const { code, value, type = 'amount', expiresAt, maxUses } = req.body || {};
  if (!code || !value) return res.status(400).json({ error: 'missing_fields' });
  const promos = await readPromotions();
  const p = { id: uuidv4(), code: String(code).toUpperCase(), value: Number(value), type: type, createdAt: new Date().toISOString(), expiresAt: expiresAt || null, uses: 0, maxUses: maxUses || null };
  promos.unshift(p); await writePromotions(promos); await pushActivity(`كوبون جديد ${p.code} بقيمة ${p.value}`, req.user.email); res.status(201).json(p);
});

app.get('/api/admin/coupons', requireAuth, requirePermission('staff.manage'), async (req, res) => { const promos = await readPromotions(); res.json(promos); });

app.get('/api/coupons/validate', requireAuth, async (req, res) => {
  const { code } = req.query || {};
  const meta = await resolveCouponMeta(code, 0);
  if (!meta.valid) return res.status(400).json({ error: meta.message || 'invalid_coupon', valid: false });
  res.json({ valid: true, coupon: { code: meta.code, type: meta.type, value: meta.value }, discountRate: meta.rate || 0 });
});

app.post('/api/coupons/redeem', requireAuth, async (req, res) => {
  const { code, orderId } = req.body || {};
  if (!code) return res.status(400).json({ error: 'missing_code' });
  const promos = await readPromotions();
  const idx = promos.findIndex(p => String(p.code).toUpperCase() === String(code).toUpperCase());
  if (idx === -1) {
    const fallback = discountCodes[String(code).toUpperCase()];
    if (!fallback) return res.status(404).json({ error: 'not_found' });
    return res.json({ success: true, coupon: { code: String(code).toUpperCase(), type: 'percent', value: fallback * 100 }, discountRate: fallback });
  }
  const p = promos[idx];
  if (p.expiresAt && new Date(p.expiresAt) < new Date()) return res.status(400).json({ error: 'expired' });
  if (p.maxUses && p.uses >= p.maxUses) return res.status(400).json({ error: 'no_uses_left' });
  p.uses = (p.uses||0) + 1; await writePromotions(promos);
  await pushActivity(`كوبون ${p.code} تم استخدامه من ${req.user.email} لطلب ${orderId||'N/A'}`, req.user.email);
  res.json({ success: true, coupon: p, discountRate: String(p.type).toLowerCase() === 'percent' ? Number(p.value || 0) / 100 : 0 });
});

// Support Q&A
app.post('/api/support/questions', requireAuth, async (req, res) => {
  const { subject, message, productId } = req.body || {};
  if (!subject || !message) return res.status(400).json({ error: 'missing_fields' });
  const list = await readSupport();
  const item = { id: uuidv4(), userId: req.user?.id || null, userEmail: req.user?.email || null, subject: String(subject), message: String(message), productId: productId || null, status: 'open', createdAt: new Date().toISOString(), replies: [] };
  list.unshift(item);
  await writeSupport(list);
  await pushActivity(`سؤال دعم جديد: ${item.subject} من ${item.userEmail || 'guest'}`, req.user?.email || null);
  res.status(201).json(item);
});

app.get('/api/admin/support/questions', requireAuth, requirePermission('staff.manage'), async (req, res) => {
  const list = await readSupport();
  res.json(list);
});

app.post('/api/admin/support/:id/reply', requireAuth, requirePermission('staff.manage'), async (req, res) => {
  const { reply } = req.body || {};
  if (!reply) return res.status(400).json({ error: 'reply_required' });
  const list = await readSupport();
  const idx = list.findIndex(q => q.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found' });
  const entry = { id: uuidv4(), by: req.user?.email || null, reply: String(reply), at: new Date().toISOString() };
  list[idx].replies = list[idx].replies || [];
  list[idx].replies.push(entry);
  list[idx].status = 'answered';
  await writeSupport(list);
  await pushActivity(`تم الرد على سؤال ${list[idx].id} بواسطة ${req.user?.email || 'staff'}`, req.user?.email || null);
  res.json(list[idx]);
});

// Public: get support questions (for product page display)
app.get('/api/support/questions', async (req, res) => {
  const { productId } = req.query || {};
  const list = await readSupport();
  const filtered = productId ? list.filter(q => String(q.productId) === String(productId)) : list;
  // return non-sensitive fields only
  const publicView = filtered.map(q => ({ id: q.id, subject: q.subject, message: q.message, productId: q.productId, status: q.status, createdAt: q.createdAt, replies: q.replies || [] }));
  res.json(publicView);
});

// Admin: export activity as CSV
app.get('/api/admin/activity/export', requireAuth, requirePermission('staff.manage'), async (req, res) => {
  const activity = await readJsonSafe(path.join(DATA_DIR, 'activity.json'), []);
  // building CSV
  const header = ['id','when','user','entry'];
  const rows = activity.map((a, i) => [a.id || i+1, a.when || a.createdAt || '', a.user || '', (a.entry || '').replace(/\r?\n/g, ' ')]);
  const csv = [header.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="activity_export.csv"');
  res.send(csv);
});

// Admin: approve/reject prescription
app.patch('/api/admin/prescriptions/:id', requireAuth, requirePermission('staff.manage'), async (req, res) => {
  const { status, note } = req.body || {};
  if (!['approved', 'rejected', 'pending'].includes(status)) return res.status(400).json({ error: 'invalid_status' });
  const list = await readPrescriptions();
  const idx = list.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found' });
  list[idx].status = status;
  list[idx].reviewNote = note || '';
  list[idx].reviewedAt = new Date().toISOString();
  await writePrescriptions(list);
  await pushActivity(`وصفة ${list[idx].id} تم تعيين حالتها إلى ${status}`, req.user?.email || null);
  res.json(list[idx]);
});

// Convert prescription to order (admin)
app.post('/api/admin/prescriptions/:id/convert', requireAuth, requirePermission('staff.manage'), async (req, res) => {
  const { items = [], customer = null, payment = null } = req.body || {};
  const list = await readPrescriptions();
  const idx = list.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found' });
  const prescription = list[idx];
  // create order using provided items or empty
  const products = await readProducts();
  const enriched = (items || []).map(it => {
    const prod = products.find(p => String(p.id) === String(it.id) || p.sku === it.sku);
    if (!prod) return null;
    return { id: prod.id, name: prod.name, price: prod.price, qty: Number(it.qty || 1), sku: prod.sku };
  }).filter(Boolean);
  if (!enriched.length) return res.status(400).json({ error: 'no_items' });
  const createdAt = new Date().toISOString();
  const order = {
    id: uuidv4(), createdAt, updatedAt: createdAt, status: 'pending', statusHistory: [{ status: 'pending', label: statusLabels.pending, at: createdAt }], adminAccessToken: uuidv4(), reviewToken: null, reviewTokenUsed: false, items: enriched, discountCode: '', customer: customer || { name: 'مراجعة وصفة', phone: '' }, payment: payment || { method: 'manual', provider: 'admin', transferTo: '' }, totals: calculateTotals(enriched)
  };
  const orders = await readOrders();
  orders.unshift(order);
  await writeOrders(orders);
  // mark prescription as converted
  list[idx].status = 'converted';
  list[idx].convertedAt = new Date().toISOString();
  list[idx].convertedOrderId = order.id;
  await writePrescriptions(list);
  await pushActivity(`وصفة ${list[idx].id} حوّلت إلى طلب ${order.id}`, req.user?.email || null);
  res.status(201).json(order);
});

app.post("/api/admin/activity", requireAuth, requirePermission("staff.manage"), async (req, res) => {
  const { entry } = req.body || {};
  if (!entry) return res.status(400).json({ error: "entry_required" });
  const list = await readActivities();
  const item = { id: uuidv4(), time: new Date().toISOString(), entry: String(entry), user: req.user?.email || null };
  list.unshift(item);
  await writeActivities(list.slice(0, 1000));
  res.status(201).json(item);
});

app.get("/api/admin/activity", requireAuth, requirePermission("staff.manage"), async (req, res) => {
  const limit = Number(req.query.limit || 100) || 100;
  const items = await readActivities();
  res.json(items.slice(0, limit));
});

app.post("/api/admin/undo", requireAuth, requirePermission("staff.manage"), async (req, res) => {
  const action = req.body || {};
  if (!action || !action.type) return res.status(400).json({ error: "invalid_action" });
  const q = await readUndoQueue();
  q.unshift({ id: uuidv4(), createdAt: new Date().toISOString(), by: req.user?.email || null, action });
  await writeUndoQueue(q.slice(0, 200));
  res.status(201).json({ ok: true });
});

app.post("/api/admin/undo/pop", requireAuth, requirePermission("staff.manage"), async (req, res) => {
  const q = await readUndoQueue();
  if (!q.length) return res.status(404).json({ error: "empty" });
  const item = q.shift();
  await writeUndoQueue(q);
  res.json(item.action || item);
});

// Simple product search + suggestions
app.get("/api/search", async (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  const category = String(req.query.category || "").trim();
  const limit = Math.min(50, Number(req.query.limit || 20));
  const products = await readProducts();
  if (!q) return res.json({ results: [], suggestions: [] });

  const results = products.filter(p => {
    if (category && p.category !== category) return false;
    return (p.name || "").toLowerCase().includes(q) || (p.short || "").toLowerCase().includes(q) || (p.brand || "").toLowerCase().includes(q);
  }).slice(0, limit);

  // suggestions: product name tokens that start with the query
  const suggestions = [];
  const tokens = new Set();
  for (const p of products) {
    (String(p.name || "").split(/\s+/) || []).forEach(t => tokens.add(t.toLowerCase()));
  }
  for (const t of tokens) {
    if (t.startsWith(q) && suggestions.length < 8) suggestions.push(t);
  }

  res.json({ results, suggestions });
});

// Prescriptions: user upload and admin review queue
app.post("/api/prescriptions", requireAuth, upload.single("image"), async (req, res) => {
  const notes = String(req.body.notes || "").trim();
  const img = toUploadPath(req.file);
  if (!img) return res.status(400).json({ error: "image_required" });
  const list = await readPrescriptions();
  const item = { id: uuidv4(), userId: req.user?.id || null, image: img, notes, status: "pending", createdAt: new Date().toISOString() };
  list.unshift(item);
  await writePrescriptions(list);
  res.status(201).json(item);
});

app.get("/api/admin/prescriptions", requireAuth, requirePermission("staff.manage"), async (req, res) => {
  const list = await readPrescriptions();
  res.json(list);
});

app.patch("/api/admin/prescriptions/:id/status", requireAuth, requirePermission("staff.manage"), async (req, res) => {
  const { status, note } = req.body || {};
  if (!["pending", "approved", "rejected"].includes(status)) return res.status(400).json({ error: "invalid_status" });
  const list = await readPrescriptions();
  const idx = list.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "not_found" });
  list[idx].status = status;
  list[idx].reviewedAt = new Date().toISOString();
  list[idx].reviewNote = String(note || "");
  list[idx].reviewedBy = req.user?.email || null;
  await writePrescriptions(list);
  await pushActivity(`وصفة ${list[idx].id} تم تحديث حالتها إلى ${status} بواسطة ${req.user?.email || 'system'}`);
  res.json(list[idx]);
});

// CSV export/import for products
const productsToCsv = (products) => {
  const headers = ["id","name","price","category","stock","sku","short","details","brand","tags"];
  const rows = products.map(p => headers.map(h => {
    const v = p[h] === undefined ? (h === 'tags' ? (Array.isArray(p.tags)?p.tags.join('|'):'') : '') : p[h];
    return `"${String(v).replace(/"/g,'""')}"`;
  }).join(','));
  return `${headers.join(',')}\n${rows.join('\n')}`;
};

app.get('/api/admin/export/products', requireAuth, requirePermission('catalog.manage'), async (req, res) => {
  const products = await readProducts();
  const csv = productsToCsv(products);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=products-${new Date().toISOString().slice(0,10)}.csv`);
  res.send('\ufeff' + csv);
});

app.post('/api/admin/import/products', requireAuth, requirePermission('catalog.manage'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file_required' });
  const buf = await readFile(req.file.path);
  const text = buf.toString('utf8');
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return res.status(400).json({ error: 'empty_file' });
  const headers = lines[0].split(',').map(h => h.replace(/"/g,'').trim());
  const rows = lines.slice(1).map(l => l.split(',').map(c => c.replace(/^"|"$/g,'').replace(/""/g,'"')));
  const products = await readProducts();
  for (const r of rows) {
    if (r.length < 2) continue;
    const obj = {};
    headers.forEach((h,i) => obj[h]=r[i]||'');
    const id = products.length ? Math.max(...products.map(p=>p.id))+1 : 1;
    products.push({
      id,
      name: obj.name || `Imported ${id}`,
      price: Number(obj.price || 0),
      category: obj.category || 'عام',
      stock: Number(obj.stock || 0),
      sku: obj.sku || `IMP-${id}`,
      short: obj.short || '',
      details: obj.details || '',
      brand: obj.brand || '',
      tags: obj.tags ? String(obj.tags).split('|') : []
    });
  }
  await writeProducts(products);
  res.json({ ok: true, imported: rows.length });
});

// KPI summary
app.get('/api/admin/kpi', requireAuth, requirePermission('staff.manage'), async (req, res) => {
  const period = String(req.query.period || 'weekly');
  const orders = (await readOrders()).map(normalizeOrder);
  const now = Date.now();
  let startTs = now - (7 * 24 * 60 * 60 * 1000);
  if (period === 'daily') startTs = now - (24 * 60 * 60 * 1000);
  if (period === 'monthly') startTs = now - (30 * 24 * 60 * 60 * 1000);
  const window = orders.filter(o => new Date(o.createdAt).getTime() >= startTs);
  const totalOrders = window.length;
  const revenue = window.reduce((s, o) => s + Number(o.totals?.total || 0), 0);
  const aov = totalOrders ? (revenue / totalOrders) : 0;
  const productSales = {};
  window.forEach(o => (o.items || []).forEach(i => { productSales[i.id] = (productSales[i.id] || 0) + (i.qty || 0); }));
  const products = await readProducts();
  const top = Object.keys(productSales).map(id => ({ id, qty: productSales[id], name: (products.find(p => String(p.id) === String(id))||{}).name || id })).sort((a,b)=>b.qty-a.qty).slice(0,5);
  res.json({ period, totalOrders, revenue, aov: Number(aov.toFixed(2)), top });
});

// Promotions CRUD
app.get('/api/admin/promotions', requireAuth, requirePermission('staff.manage'), async (req, res) => {
  res.json(await readPromotions());
});

app.post('/api/admin/promotions', requireAuth, requirePermission('staff.manage'), async (req, res) => {
  const payload = req.body || {};
  if (!payload.title || !payload.type) return res.status(400).json({ error: 'missing_fields' });
  const promos = await readPromotions();
  const p = { id: uuidv4(), title: String(payload.title), type: String(payload.type), value: payload.value || 0, start: payload.start || null, end: payload.end || null, target: payload.target || null, createdAt: new Date().toISOString() };
  promos.push(p);
  await writePromotions(promos);
  res.status(201).json(p);
});

app.put('/api/admin/promotions/:id', requireAuth, requirePermission('staff.manage'), async (req, res) => {
  const promos = await readPromotions();
  const idx = promos.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found' });
  promos[idx] = { ...promos[idx], ...(req.body || {}), id: promos[idx].id };
  await writePromotions(promos);
  res.json(promos[idx]);
});

app.delete('/api/admin/promotions/:id', requireAuth, requirePermission('staff.manage'), async (req, res) => {
  const promos = await readPromotions();
  const next = promos.filter(p => p.id !== req.params.id);
  if (next.length === promos.length) return res.status(404).json({ error: 'not_found' });
  await writePromotions(next);
  res.json({ ok: true });
});


// Finance report generator
const buildFinanceReport = (orders) => {
  const transactions = [];
  let totalRevenue = 0;
  let totalOrders = 0;
  let totalItems = 0;

  orders.forEach(order => {
    const created = order.createdAt || new Date().toISOString();
    const totals = order.totals || calculateTotals(order.items || []);
    const orderTotal = Number(totals.total || totals.grand || 0);
    totalRevenue += orderTotal;
    totalOrders += 1;
    const items = Array.isArray(order.items) ? order.items : [];
    let itemsCount = 0;
    items.forEach(i => itemsCount += Number(i.qty || 0));
    totalItems += itemsCount;

    transactions.push({
      id: order.id,
      createdAt: created,
      customerName: order.customer?.name || order.customer?.email || "",
      customerEmail: order.customer?.email || "",
      customerPhone: order.customer?.phone || "",
      items: items.map(i => ({ id: i.id || null, name: i.name || "", qty: Number(i.qty || 0), price: Number(i.price || 0) })),
      subtotal: Number(totals.subtotal || 0),
      shipping: Number(totals.shipping || 0),
      discount: Number(totals.discount || 0),
      total: orderTotal,
      paymentMethod: order.payment?.method || order.payment?.provider || "",
      status: order.status || "",
    });
  });

  return { transactions, summary: { totalRevenue, totalOrders, totalItems } };
};

app.get('/api/admin/finance', requireAuth, requirePermission('finance.read'), async (req, res) => {
  const { dateFrom = '', dateTo = '' } = req.query;
  let orders = (await readOrders()).map(normalizeOrder);

  if (dateFrom) {
    const from = new Date(dateFrom).getTime();
    if (!Number.isNaN(from)) orders = orders.filter(order => new Date(order.createdAt).getTime() >= from);
  }
  if (dateTo) {
    const to = new Date(dateTo).getTime();
    if (!Number.isNaN(to)) orders = orders.filter(order => new Date(order.createdAt).getTime() <= to + (24 * 60 * 60 * 1000 - 1));
  }

  const report = buildFinanceReport(orders);
  res.json(report);
});

const start = async () => {
  await ensureDataFiles();
  
  if (supabase && useSupabase) {
    console.log("✅ Supabase enabled — using cloud database");
  }
  
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FRIENDS backend running on http://0.0.0.0:${PORT}`);
  });
};

// Only start the server when running locally (not when imported by Vercel)
if (!process.env.VERCEL) {
  start();
}

// Export for Vercel
export default app;
