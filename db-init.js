import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize Supabase database schema on startup
 * This function checks if tables exist and creates them if needed
 * 
 * NOTE: Supabase doesn't allow raw SQL execution from client.
 * Tables MUST be created manually via SQL Editor first.
 * This function only validates that tables exist.
 */
export async function initializeSupabaseSchema(supabase) {
  if (!supabase) {
    console.log("⚠️  Supabase not configured. Using JSON storage.");
    return false;
  }

  try {
    console.log("🔄 Checking Supabase schema...");

    // Check if products table exists
    const { data, error } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true });

    if (!error) {
      console.log("✅ Supabase tables exist. Schema is ready.");
      return true;
    }

    // Tables don't exist - user needs to create them manually
    console.warn("\n⚠️  ⚠️  ⚠️  SUPABASE SCHEMA NOT FOUND ⚠️  ⚠️  ⚠️");
    console.warn("Please create the database tables manually:");
    console.warn("1. Go to Supabase Dashboard → SQL Editor");
    console.warn("2. Create a new query");
    console.warn("3. Copy and paste the contents of SUPABASE_SCHEMA.sql");
    console.warn("4. Click RUN");
    console.warn("\nAfter creating tables, restart this application.\n");

    return false;
  } catch (error) {
    console.error("❌ Failed to check Supabase schema:", error.message);
    console.log(
      "⚠️  Please run SUPABASE_SCHEMA.sql manually in Supabase SQL Editor"
    );
    return false;
  }
}

/**
 * Seed initial data to Supabase (products, users, coupons)
 */
export async function seedSupabaseData(supabase) {
  if (!supabase) return false;

  try {
    console.log("🌱 Seeding Supabase with initial data...");

    // Check if products already exist
    const { data: existingProducts, error: productError } = await supabase
      .from("products")
      .select("id", { count: "exact" });

    if (!productError && existingProducts && existingProducts.length > 0) {
      console.log("✅ Supabase already has data. Skipping seed.");
      return true;
    }

    // Seed hero slides
    const heroData = [
      {
        title: "أفضل المنتجات الطبية",
        text: "جودة عالية وأسعار منافسة",
        badge: "جديد",
        image: "images/hero-1.jpg",
        order_index: 1,
        active: true,
      },
      {
        title: "توصيل سريع وآمن",
        text: "نوصلك المنتج خلال 24 ساعة",
        badge: "توصيل سريع",
        image: "images/hero-2.jpg",
        order_index: 2,
        active: true,
      },
      {
        title: "أفضل الأسعار المضمونة",
        text: "نضمن لك أقل سعر في السوق",
        badge: "ضمان",
        image: "images/hero-3.jpg",
        order_index: 3,
        active: true,
      },
    ];

    const { error: heroError } = await supabase.from("hero").insert(heroData);
    if (heroError) console.warn("Hero seed warning:", heroError.message);
    else console.log("✅ Hero slides seeded");

    // Seed products
    const productsData = [
      {
        name: "جهاز قياس ضغط الدم الرقمي",
        description: "جهاز قياس ضغط دم ذكي وسريع وآمن",
        price: 450,
        category: "أجهزة قياس",
        image: "images/product-1.jpg",
        images: ["images/product-1.jpg"],
        sku: "BP-001",
        stock: 50,
        rating: 4.8,
        reviews: 120,
        featured: true,
        active: true,
      },
      {
        name: "كمامات طبية N95",
        description: "كمامات طبية معقمة حماية 99.9%",
        price: 5,
        category: "حماية",
        image: "images/product-2.jpg",
        images: ["images/product-2.jpg"],
        sku: "MASK-001",
        stock: 500,
        rating: 4.7,
        reviews: 300,
        featured: true,
        active: true,
      },
      {
        name: "ميزان حرارة رقمي",
        description: "ميزان حرارة رقمي دقيق بدون تلامس",
        price: 150,
        category: "أجهزة قياس",
        image: "images/product-3.jpg",
        images: ["images/product-3.jpg"],
        sku: "THERM-001",
        stock: 75,
        rating: 4.9,
        reviews: 85,
        featured: true,
        active: true,
      },
      {
        name: "عصابات طبية معقمة",
        description: "عصابات طبية معقمة للجروح",
        price: 20,
        category: "إسعافات أولية",
        image: "images/product-4.jpg",
        images: ["images/product-4.jpg"],
        sku: "BAND-001",
        stock: 200,
        rating: 4.5,
        reviews: 45,
        featured: false,
        active: true,
      },
      {
        name: "محلول معقم للجروح",
        description: "محلول معقم آمن وفعال للجروح",
        price: 30,
        category: "إسعافات أولية",
        image: "images/product-5.jpg",
        images: ["images/product-5.jpg"],
        sku: "CLEAN-001",
        stock: 150,
        rating: 4.6,
        reviews: 67,
        featured: false,
        active: true,
      },
    ];

    const { error: productInsertError } = await supabase
      .from("products")
      .insert(productsData);
    if (productInsertError)
      console.warn("Products seed warning:", productInsertError.message);
    else console.log("✅ Products seeded");

    // Seed coupons
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const couponsData = [
      {
        code: "FRIENDS10",
        discount_percent: 10,
        valid_from: now.toISOString(),
        valid_until: in30Days.toISOString(),
        active: true,
      },
      {
        code: "WELCOME15",
        discount_percent: 15,
        valid_from: now.toISOString(),
        valid_until: in7Days.toISOString(),
        active: true,
      },
      {
        code: "SUMMER20",
        discount_percent: 20,
        valid_from: now.toISOString(),
        valid_until: in60Days.toISOString(),
        active: true,
      },
    ];

    const { error: couponError } = await supabase
      .from("coupons")
      .insert(couponsData);
    if (couponError) console.warn("Coupons seed warning:", couponError.message);
    else console.log("✅ Coupons seeded");

    console.log("✅ Supabase seeding complete!");
    return true;
  } catch (error) {
    console.error("❌ Failed to seed Supabase:", error.message);
    return false;
  }
}

/**
 * Check Supabase connection
 */
export async function checkSupabaseConnection(supabase) {
  if (!supabase) return false;

  try {
    const { data, error } = await supabase.from("products").select("count()");
    if (error) {
      console.error("❌ Supabase connection failed:", error.message);
      return false;
    }
    console.log("✅ Supabase connection successful!");
    return true;
  } catch (error) {
    console.error("❌ Supabase connection error:", error.message);
    return false;
  }
}
