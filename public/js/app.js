/*
  FRIENDS Template - JS
  كل البيانات والوظائف هنا لتسهيل التعديل والإضافة.
*/

const API_BASE = `${window.location.origin}/api`;
let authUser = null;
let products = [];
let currentCategory = "";
const t = (key, fallback = "") => (window.t ? window.t(key, fallback) : (fallback || key));
const getCurrentLang = () => (window.i18n?.getLang?.() || "ar");
const getProductField = (product, field) => {
  if (!product) return "";
  const lang = getCurrentLang();
  if (lang === "en" && product.i18n?.en?.[field]) return product.i18n.en[field];
  return product[field] || "";
};
const getProductImages = (product) => {
  if (!product) return [];
  if (Array.isArray(product.images) && product.images.length) return product.images.filter(Boolean);
  return product.image ? [product.image] : [];
};
const getProductImage = (product) => getProductImages(product)[0] || "";

const buildCategories = (items) => {
  if (!Array.isArray(items) || !items.length) return [];
  const counts = items.reduce((acc, item) => {
    const name = getProductField(item, "category");
    if (!name) return acc;
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  return Object.keys(counts).map(name => ({ name, count: counts[name] }));
};

let categories = [];

let heroSlides = [];

// السلة (تخزين محلي)
const cart = JSON.parse(localStorage.getItem("friends_cart")) || [];

async function loadCatalog() {
  try {
    const [productsRes, categoriesRes, heroRes] = await Promise.all([
      fetch(`${API_BASE}/products`),
      fetch(`${API_BASE}/categories`),
      fetch(`${API_BASE}/hero`)
    ]);

    if (!productsRes.ok) {
      throw new Error("api_unavailable");
    }

    products = await productsRes.json();
    categories = buildCategories(products);
    heroSlides = heroRes.ok ? await heroRes.json() : [];
  } catch (error) {
    products = [];
    categories = [];
    heroSlides = [];
  }
}

// أدوات مساعدة
const formatTemplate = (template, vars = {}) => String(template)
  .replace(/\{(\w+)\}/g, (_, key) => (key in vars ? vars[key] : ""));
const getLocale = () => (getCurrentLang() === "ar" ? "ar-EG" : "en-US");
const formatPrice = (value) => {
  const formatter = new Intl.NumberFormat(getLocale());
  return `${formatter.format(value)} ${t("label.currency", "ج.م")}`;
};

const renderStars = (rating = 0) => {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let stars = "★".repeat(full);
  if (half) stars += "½";
  return stars;
};

const setImagePreview = (imgEl, src) => {
  if (!imgEl) return;
  if (src) {
    imgEl.setAttribute("src", src);
    imgEl.classList.remove("is-empty");
  } else {
    imgEl.removeAttribute("src");
    imgEl.classList.add("is-empty");
  }
};

const saveCart = () => {
  localStorage.setItem("friends_cart", JSON.stringify(cart));
};

const getAuthToken = () => localStorage.getItem("friends_user_token") || "";
const isAdminUser = (user) => {
  if (!user) return false;
  return user.role === "admin" || user.role === "supervisor";
};

async function hydrateAuthUser() {
  const token = getAuthToken();
  if (!token) {
    authUser = null;
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("invalid_token");
    authUser = await res.json();
    localStorage.setItem("friends_user", JSON.stringify(authUser));
  } catch {
    authUser = null;
    localStorage.removeItem("friends_user_token");
    localStorage.removeItem("friends_user");
  }
}

function renderAuthLinks() {
  const container = document.getElementById("authLinks");
  const adminLinks = document.querySelectorAll("[data-admin-link]");
  const adminVisible = isAdminUser(authUser);
  adminLinks.forEach((link) => {
    link.style.display = adminVisible ? "" : "none";
  });

  if (!container) return;
  if (!authUser) {
    container.innerHTML = `
      <a class="btn ghost" href="auth.html">${t("nav.login", "تسجيل دخول")}</a>
      <a class="btn primary" href="auth.html#register">${t("nav.register", "إنشاء حساب")}</a>
    `;
    return;
  }

  container.innerHTML = `
    <span class="auth-user">${t("label.hello", "مرحبًا")}, ${authUser.name}</span>
    ${adminVisible ? `<a class="btn ghost" href="admin.html">${t("nav.admin", "لوحة الأدمن")}</a>` : ""}
    <button class="btn primary" id="logoutBtn" type="button">${t("action.logout", "تسجيل خروج")}</button>
  `;

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("friends_user_token");
    localStorage.removeItem("friends_user");
    localStorage.removeItem("friends_admin_token");
    window.location.reload();
  });
}

const updateCartBadge = () => {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const badge = document.getElementById("cartCount");
  if (badge) badge.textContent = count;
  const headerBadge = document.getElementById("headerCartCount");
  if (headerBadge) {
    headerBadge.textContent = count;
    headerBadge.style.display = count > 0 ? "flex" : "none";
  }
};

const getQueryParam = (key) => {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
};

const getBaseUrl = () => `${window.location.protocol}//${window.location.host}`;

const normalizeArabic = (value = "") => String(value)
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[\u064B-\u065F]/g, "")
  .replace(/[\u0617-\u061A]/g, "")
  .replace(/[إأآا]/g, "ا")
  .replace(/ى/g, "ي")
  .replace(/ة/g, "ه")
  .replace(/ؤ/g, "و")
  .replace(/ئ/g, "ي")
  .replace(/[^\w\u0600-\u06FF\s-]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const normalizeLatin = (value = "") => String(value)
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[^\w\s-]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const normalizeText = (value = "") => {
  const lang = getCurrentLang();
  return lang === "ar" ? normalizeArabic(value) : normalizeLatin(value);
};

const getSearchText = (product) => normalizeText([
  getProductField(product, "name"),
  getProductField(product, "short"),
  getProductField(product, "category"),
  getProductField(product, "brand"),
  product.sku,
  getProductField(product, "details"),
  Array.isArray(product.tags) ? product.tags.join(" ") : ""
].join(" "));

// بناء كارد منتج (يستخدم في الصفحة الرئيسية وصفحة الأقسام)
function renderProducts(list, container) {
  if (!container) return;
  container.innerHTML = "";
  if (!Array.isArray(list) || list.length === 0) {
    container.innerHTML = `
      <div class="empty-catalog-state">
        <span class="empty-icon">📦</span>
        <h3>${t("products.none", "لا توجد منتجات حالياً")}</h3>
        <p>${t("products.none_sub", "سيتم إضافة وتحديث المنتجات والمستلزمات الطبية قريباً.")}</p>
      </div>
    `;
    return;
  }
  list.forEach(product => {
    const name = getProductField(product, "name");
    const short = getProductField(product, "short");
    const image = getProductImage(product);
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.id = product.id;
    card.innerHTML = `
      <img src="${image}" alt="${name} - FRIENDS Store" loading="lazy" />
      <h4>${name}</h4>
      <p>${short}</p>
      <div class="price">${formatPrice(product.price)}</div>
      <div class="meta-row">
        <div class="rating">${renderStars(product.rating)} <span>(${product.reviews})</span></div>
        <span>${t("label.in_stock", "المتوفر")}: ${product.stock}</span>
      </div>
      <button class="btn primary" data-id="${product.id}">${t("action.order_now", "اطلب الآن")}</button>
    `;

    // الضغط على الكارد يفتح صفحة المنتج
    card.addEventListener("click", (event) => {
      if (event.target.tagName === "BUTTON") return;
      window.location.href = `product.html?id=${product.id}`;
    });

    // زر الطلب يضيف للسلة مباشرة
    card.querySelector("button").addEventListener("click", () => addToCart(product));
    container.appendChild(card);
  });
}

// العروض في الصفحة الرئيسية
function renderOffers() {
  const offersGrid = document.getElementById("offersGrid");
  const offersSection = document.getElementById("offers");
  if (!offersGrid) return;
  offersGrid.innerHTML = "";
  const discounted = products.filter(p => p.discount && p.discount !== "لا يوجد" && p.discount !== "none");
  const offerItems = discounted.length ? discounted : products;
  if (!offerItems.length) {
    if (offersSection) offersSection.style.display = "none";
    return;
  }
  if (offersSection) offersSection.style.display = "";
  offerItems.slice(0, 4).forEach(product => {
    const card = document.createElement("div");
    card.className = "card";
    const badge = product.discount && product.discount !== "لا يوجد" ? product.discount : t("label.special_offer", "عرض خاص");
    const name = getProductField(product, "name");
    const short = getProductField(product, "short");
    card.innerHTML = `
      <span class="badge">${badge}</span>
      <h4>${name}</h4>
      <p>${short}</p>
      <div class="price">${formatPrice(product.price)}</div>
      <button class="btn ghost" data-id="${product.id}">${t("action.order_now", "اطلب الآن")}</button>
    `;
    card.querySelector("button").addEventListener("click", () => addToCart(product));
    offersGrid.appendChild(card);
  });
}

// الأقسام (يربط كل قسم بصفحة category.html)
function renderCategories() {
  const categoriesGrid = document.getElementById("categoriesGrid");
  const categoriesSection = document.getElementById("categories");
  if (!categoriesGrid) return;
  categoriesGrid.innerHTML = "";
  if (!categories.length) {
    if (categoriesSection) categoriesSection.style.display = "none";
    return;
  }
  if (categoriesSection) categoriesSection.style.display = "";
  categories.forEach(category => {
    const el = document.createElement("a");
    el.className = "category-pill";
    el.href = `category.html?category=${encodeURIComponent(category.name)}`;
    el.innerHTML = `<div>${category.name}</div><span>${category.count} ${t("label.products", "منتج")}</span>`;
    categoriesGrid.appendChild(el);
  });
}

// صفحة تفاصيل المنتج
function renderProductDetails() {
  const container = document.getElementById("productDetails");
  if (!container) return;
  if (!products.length) {
    container.innerHTML = `<p class='note'>${t("product.none", "لا توجد بيانات للمنتج حالياً.")}</p>`;
    return;
  }
  const id = Number(getQueryParam("id"));
  const product = products.find(item => item.id === id);
  if (!product) {
    container.innerHTML = `<p class='note'>${t("product.unavailable", "المنتج المطلوب غير متاح حالياً.")}</p>`;
    return;
  }
  let quantity = 1;
  const tags = product.tags && product.tags.length ? product.tags.join("، ") : t("label.none", "بدون");
  const name = getProductField(product, "name");
  const details = getProductField(product, "details");
  const usage = getProductField(product, "usage");
  const brand = getProductField(product, "brand");
  const category = getProductField(product, "category");
  const images = getProductImages(product);
  const mainImage = images[0] || "";
  const thumbs = images.map(src => `<button class="thumb" type="button" data-src="${src}"><img src="${src}" alt="${name} - صورة إضافية" loading="lazy" /></button>`).join("");

  // Update breadcrumb
  const bcCat = document.getElementById("breadcrumbCategory");
  const bcProd = document.getElementById("breadcrumbProduct");
  if (bcCat) bcCat.innerHTML = `<a href="category.html?category=${encodeURIComponent(category)}">${category}</a>`;
  if (bcProd) bcProd.textContent = name;

  container.innerHTML = `
    <div class="product-gallery">
      <img class="product-main" id="productMainImage" src="${mainImage}" alt="${name} - مستلزمات طبية من FRIENDS Store" />
      ${images.length > 1 ? `<div class="product-thumbs">${thumbs}</div>` : ""}
    </div>
    <div>
      <h1>${name}</h1>
      <p>${details}</p>
      <div class="meta-row">
        <div class="rating">${renderStars(product.rating)} <span>(${product.reviews})</span></div>
        <span>${product.discount && product.discount !== "لا يوجد" ? product.discount : t("label.special_offer", "عرض خاص")}</span>
      </div>
      <div class="product-meta">
        <div><strong>${t("label.brand", "الماركة")}:</strong> ${brand}</div>
        <div><strong>${t("label.sku", "الكود")}:</strong> ${product.sku}</div>
        <div><strong>${t("label.category", "التصنيف")}:</strong> ${category}</div>
        <div><strong>${t("label.in_stock", "المتوفر")}:</strong> ${product.stock} ${t("label.piece", "قطعة")}</div>
        <div><strong>${t("label.tags", "وسوم")}:</strong> ${tags}</div>
      </div>
      <p><strong>${t("label.usage", "الاستخدام")}:</strong> ${usage}</p>
      <div class="price">${formatPrice(product.price)}</div>
      <div class="qty-selector" aria-label="${t("label.qty_selector", "اختيار الكمية")}">
        <button type="button" data-action="dec">-</button>
        <strong id="detailQty">1</strong>
        <button type="button" data-action="inc">+</button>
      </div>
      <button class="btn primary" id="detailAdd">${t("action.add_to_cart", "أضف للسلة")}</button>
    </div>
  `;

  const thumbsEl = container.querySelector(".product-thumbs");
  if (thumbsEl) {
    thumbsEl.addEventListener("click", (event) => {
      const btn = event.target.closest("button");
      if (!btn) return;
      const src = btn.dataset.src;
      const main = document.getElementById("productMainImage");
      if (src && main) main.src = src;
    });
  }

  const qtyEl = document.getElementById("detailQty");
  container.querySelector(".qty-selector").addEventListener("click", (event) => {
    const action = event.target.dataset.action;
    if (!action) return;
    if (action === "inc") quantity += 1;
    if (action === "dec") quantity = Math.max(1, quantity - 1);
    qtyEl.textContent = quantity;
  });

  document.getElementById("detailAdd").addEventListener("click", () => addToCart(product, quantity));
  renderRelatedProducts(product);
  renderProductReviews(product.id);

  // Support Q&A: load existing and show Ask Pharmacist form
  const qaContainerId = 'productSupportQA';
  const qaHtml = `
    <div class="product-support" id="${qaContainerId}">
      <h4>أسئلة الدعم والردود</h4>
      <div id="supportList" class="support-list"></div>
      <div class="ask-pharmacist">
        <h5>اسأل الصيدلي</h5>
        <p class="note">اسأل عن تداخلات دوائية أو نصائح استخدام لهذا المنتج.</p>
        <textarea id="askQuestion" placeholder="اكتب سؤالك هنا" rows="3"></textarea>
        <button class="btn ghost" id="askSubmit">أرسل السؤال</button>
        <div id="askMsg" class="note"></div>
      </div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', qaHtml);

  const renderSupportList = (items) => {
    const el = document.getElementById('supportList');
    if (!el) return;
    if (!items || !items.length) { el.innerHTML = '<div class="note">لا توجد أسئلة بعد.</div>'; return; }
    el.innerHTML = items.map(q => `
      <div class="support-item">
        <div class="q">${escapeHtml(q.subject)} — <small>${new Date(q.createdAt).toLocaleString()}</small></div>
        <div class="msg">${escapeHtml(q.message)}</div>
        <div class="replies">${(q.replies||[]).map(r => `<div class="r"><strong>${escapeHtml(r.by||'فريق الدعم')}</strong>: ${escapeHtml(r.reply)} <small>${new Date(r.at).toLocaleString()}</small></div>`).join('')}</div>
      </div>
    `).join('');
  };

  const loadSupport = async () => {
    try {
      const res = await fetch(`${API_BASE}/support/questions?productId=${encodeURIComponent(product.id)}`);
      if (!res.ok) throw new Error('failed');
      const list = await res.json();
      renderSupportList(list);
    } catch (err) { const el = document.getElementById('supportList'); if (el) el.innerHTML = '<div class="note">تعذر جلب الأسئلة.</div>'; }
  };

  loadSupport();

  const askSubmit = document.getElementById('askSubmit');
  if (askSubmit) {
    askSubmit.addEventListener('click', async () => {
      const textarea = document.getElementById('askQuestion');
      const msg = document.getElementById('askMsg');
      if (!textarea || !textarea.value.trim()) { if (msg) msg.textContent = 'اكتب سؤالك أولاً.'; return; }
      try {
        const token = getAuthToken();
        const res = await fetch(`${API_BASE}/support/questions`, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: `Bearer ${token}` } : {}), body: JSON.stringify({ subject: `سؤال عن ${getProductField(product, 'name')}`, message: textarea.value.trim(), productId: product.id }) });
        if (!res.ok) throw new Error('failed');
        const data = await res.json();
        if (msg) msg.textContent = 'تم إرسال سؤالك. سيرد عليك فريقنا قريباً.';
        textarea.value = '';
        loadSupport();
      } catch (err) {
        if (msg) msg.textContent = 'تعذر إرسال السؤال. رجاءً حاول لاحقاً.';
      }
    });
  }

  // small helper
  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
}

function renderRelatedProducts(currentProduct) {
  const relatedGrid = document.getElementById("relatedGrid");
  if (!relatedGrid) return;
  if (!products.length) return;
  const related = products
    .filter(item => getProductField(item, "category") === getProductField(currentProduct, "category") && item.id !== currentProduct.id)
    .slice(0, 4);
  renderProducts(related.length ? related : products.filter(item => item.id !== currentProduct.id).slice(0, 4), relatedGrid);
}



// === Client-side SEO dynamic meta update ===
function updateProductSEO(product) {
  if (!product) return;
  const name = getProductField(product, "name");
  const desc = getProductField(product, "short") || getProductField(product, "description") || name;
  const image = getProductField(product, "image") || (product.images && product.images[0]) || "";
  const price = product.price || 0;
  const brand = getProductField(product, "brand") || "FRIENDS";
  const sku = product.sku || "";
  const category = getProductField(product, "category") || "";
  const availability = (product.stock && product.stock > 0) ? "InStock" : "OutOfStock";
  const canonical = `https://friendss.org/product?id=${product.id}`;
  const seoTitle = `${name} | FRIENDS Store - مستلزمات طبية`;

  document.title = seoTitle;
  setMeta("description", `${desc.substring(0, 160)}`);
  setMeta("robots", "index, follow, max-image-preview:large");
  setLink("canonical", canonical);
  setOG("title", seoTitle);
  setOG("description", desc.substring(0, 160));
  setOG("url", canonical);
  setOG("type", "product");
  if (image) setOG("image", image);
  setTwitter("title", seoTitle);
  setTwitter("description", desc.substring(0, 160));

  // Product Schema
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": name,
    "description": desc,
  };
  if (image) productSchema.image = image;
  if (sku) productSchema.sku = sku;
  if (brand) productSchema.brand = { "@type": "Brand", "name": brand };
  productSchema.offers = {
    "@type": "Offer",
    "price": String(price),
    "priceCurrency": "EGP",
    "availability": `https://schema.org/${availability}`
  };
  injectJSONLD("product-schema", productSchema);

  // Breadcrumb Schema
  if (category) {
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": "https://friendss.org/" },
        { "@type": "ListItem", "position": 2, "name": category, "item": `https://friendss.org/category?category=${encodeURIComponent(category)}` },
        { "@type": "ListItem", "position": 3, "name": name, "item": canonical }
      ]
    };
    injectJSONLD("breadcrumb-schema", breadcrumbSchema);
  }
}

function updateCategorySEO(categoryName, catProducts) {
  if (!categoryName) return;
  const count = catProducts.length;
  const seoTitle = `${categoryName} | FRIENDS Store - مستلزمات طبية`;
  const desc = `تسوق ${categoryName} من FRIENDS Store. منتجات طبية أصلية بأسعار مناسبة مع توصيل سريع. ${count} منتج متاح.`;
  const canonical = `https://friendss.org/category?category=${encodeURIComponent(categoryName)}`;

  document.title = seoTitle;
  setMeta("description", desc);
  setMeta("robots", "index, follow, max-image-preview:large");
  setLink("canonical", canonical);
  setOG("title", seoTitle);
  setOG("description", desc);
  setOG("url", canonical);
  setOG("type", "website");
  setTwitter("title", seoTitle);
  setTwitter("description", desc);

  // Breadcrumb Schema
  injectJSONLD("breadcrumb-schema", {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": "https://friendss.org/" },
      { "@type": "ListItem", "position": 2, "name": categoryName, "item": canonical }
    ]
  });

  // ItemList Schema
  injectJSONLD("itemlist-schema", {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": categoryName,
    "itemListElement": catProducts.map((p, i) => ({
      "@type": "ListItem", "position": i + 1, "name": getProductField(p, "name"),
      "url": `https://friendss.org/product?id=${p.id}`
    }))
  });
}

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}
function setLink(rel, href) {
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) { el = document.createElement("link"); el.setAttribute("rel", rel); document.head.appendChild(el); }
  el.setAttribute("href", href);
}
function setOG(prop, content) {
  let el = document.querySelector(`meta[property="og:${prop}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("property", `og:${prop}`); document.head.appendChild(el); }
  el.setAttribute("content", content);
}
function setTwitter(prop, content) {
  let el = document.querySelector(`meta[name="twitter:${prop}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", `twitter:${prop}`); document.head.appendChild(el); }
  el.setAttribute("content", content);
}
function injectJSONLD(id, data) {
  let el = document.getElementById(id);
  if (!el) { el = document.createElement("script"); el.type = "application/ld+json"; el.id = id; document.head.appendChild(el); }
  el.textContent = JSON.stringify(data);
}

// === SEO Client Functions ===

async function renderProductReviews(productId) {
  const container = document.getElementById("productReviews");
  if (!container) return;
  container.innerHTML = `<p class='note'>${t("review.loading", "جار تحميل التقييمات...")}</p>`;

  try {
    const res = await fetch(`${API_BASE}/products/${productId}/reviews`);
    if (!res.ok) throw new Error("reviews_failed");
    const reviews = await res.json();
    if (!Array.isArray(reviews) || !reviews.length) {
      container.innerHTML = `<p class='note'>${t("review.none", "لا توجد تقييمات معتمدة بعد.")}</p>`;
      return;
    }

    container.innerHTML = reviews.map(review => `
      <div class="order-card">
        <div class="order-head">
          <strong>${review.customerName || t("label.customer", "عميل")}</strong>
          <span class="status-chip">${"★".repeat(Number(review.stars || 0))}</span>
        </div>
        <p class="note">${new Date(review.createdAt).toLocaleDateString(getCurrentLang() === "ar" ? "ar-EG" : "en-US")}</p>
        <p>${review.comment || t("label.no_comment", "بدون تعليق")}</p>
      </div>
    `).join("");
  } catch {
    container.innerHTML = `<p class='note'>${t("review.load_failed", "تعذر تحميل التقييمات.")}</p>`;
  }
}

// صفحة الأقسام
function renderCategoryPage() {
  const title = document.getElementById("categoryTitle");
  const grid = document.getElementById("categoryGrid");
  if (!grid) return;

  const categoryName = getQueryParam("category") || categories[0]?.name;
  currentCategory = categoryName || "";
  if (title) title.textContent = categoryName;
  const bcCat = document.getElementById("breadcrumbCategory");
  if (bcCat) bcCat.textContent = categoryName;

  if (!categoryName) {
    grid.innerHTML = `<p class='note'>${t("categories.none", "لا توجد أقسام متاحة حالياً.")}</p>`;
    return;
  }

  const filtered = products.filter(product => {
    const localized = getProductField(product, "category");
    return localized === categoryName || product.category === categoryName;
  });
  renderProducts(filtered, grid);
}

// السلة
function renderCart() {
  const cartItems = document.getElementById("cartItems");
  const cartTotal = document.getElementById("cartTotal");
  const cartSubtotal = document.getElementById("cartSubtotal");
  const cartShipping = document.getElementById("cartShipping");
  const cartDiscount = document.getElementById("cartDiscount");
  if (!cartItems || !cartTotal || !cartSubtotal || !cartShipping || !cartDiscount) return;

  cartItems.innerHTML = "";
  if (cart.length === 0) {
    cartItems.innerHTML = `<p>${t("cart.empty_detail", "السلة فارغة. أضف منتجات لتظهر هنا.")}</p>`;
  }

  let subtotal = 0;
  cart.forEach(item => {
    const product = products.find(p => p.id === item.id);
    const displayName = product ? getProductField(product, "name") : item.name;
    const displayImage = product ? getProductImage(product) : item.image;
    subtotal += item.price * item.qty;
    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <img src="${displayImage}" alt="${displayName} - FRIENDS Store" loading="lazy" />
      <div>
        <h4>${displayName}</h4>
        <p>${formatPrice(item.price)} ${t("label.per_piece", "للقطعة")}</p>
        <p class="note">${t("label.total", "الإجمالي")}: ${formatPrice(item.price * item.qty)}</p>
      </div>
      <div class="qty-controls">
        <button class="btn ghost" data-action="dec" data-id="${item.id}">-</button>
        <strong>${item.qty}</strong>
        <button class="btn ghost" data-action="inc" data-id="${item.id}">+</button>
      </div>
      <button class="remove-btn" data-action="remove" data-id="${item.id}">${t("action.remove", "حذف")}</button>
    `;
    cartItems.appendChild(row);
  });

  const shipping = subtotal === 0 ? 0 : subtotal >= 300 ? 0 : 25;
  const discount = getDiscountAmount(subtotal);
  const total = Math.max(0, subtotal + shipping - discount);

  cartSubtotal.textContent = formatPrice(subtotal);
  cartShipping.textContent = formatPrice(shipping);
  cartDiscount.textContent = `- ${formatPrice(discount)}`;
  cartTotal.textContent = formatPrice(total);
}

function setupCartControls() {
  const cartItems = document.getElementById("cartItems");
  if (!cartItems) return;

  cartItems.addEventListener("click", (event) => {
    const btn = event.target.closest("button");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const action = btn.dataset.action;
    const item = cart.find(i => i.id === id);
    if (!item) return;

    if (action === "inc") item.qty = Math.min(item.qty + 1, item.stock || item.qty + 1);
    if (action === "dec") item.qty -= 1;
    if (action === "remove") item.qty = 0;
    if (item.qty <= 0) {
      const index = cart.findIndex(i => i.id === id);
      cart.splice(index, 1);
    }

    updateCartBadge();
    renderCart();
    saveCart();
  });
}

function addToCart(product, qty = 1) {
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    const limit = product.stock ? product.stock : existing.qty + qty;
    existing.qty = Math.min(existing.qty + qty, limit);
  } else {
    const limit = product.stock ? product.stock : qty;
    cart.push({
      id: product.id,
      name: getProductField(product, "name"),
      image: getProductImage(product),
      price: product.price,
      qty: Math.min(qty, limit),
      stock: product.stock || 0
    });
  }
  updateCartBadge();
  renderCart();
  saveCart();
}

// البحث في المنتجات
function setupSearch(targetGrid, getSourceList) {
  const input = document.getElementById("searchInput");
  const clearBtn = document.getElementById("searchClear");
  const meta = document.getElementById("searchMeta");
  const suggestionList = document.getElementById("searchSuggestions");
  const filterCategory = document.getElementById("filterCategory");
  const filterPriceMin = document.getElementById("filterPriceMin");
  const filterPriceMax = document.getElementById("filterPriceMax");
  const filterRating = document.getElementById("filterRating");
  const applyFiltersBtn = document.getElementById("applyFilters");
  const toggleFiltersBtn = document.getElementById("toggleFilters");
  const filtersPanel = document.getElementById("searchFilters");

  if (!input) return;

  // populate category filter with available categories
  if (filterCategory && categories.length) {
    filterCategory.innerHTML = `<option value="">${t("filter.all_categories", "كل الأقسام")}</option>` +
      categories.map(c => `<option value="${c.name}">${c.name}</option>`).join("");
  }

  const applySearch = () => {
    const term = normalizeText(input.value);
    const source = typeof getSourceList === "function" ? getSourceList() : products;
    let filtered = !term ? source : source.filter(product => getSearchText(product).includes(term));

    // apply filters
    if (filterCategory && filterCategory.value) {
      filtered = filtered.filter(p => {
        const localized = getProductField(p, "category");
        return localized === filterCategory.value || p.category === filterCategory.value;
      });
    }
    const min = Number(filterPriceMin?.value || 0);
    const max = Number(filterPriceMax?.value || 0);
    if (min > 0) filtered = filtered.filter(p => p.price >= min);
    if (max > 0) filtered = filtered.filter(p => p.price <= max);
    const rating = Number(filterRating?.value || 0);
    if (rating > 0) filtered = filtered.filter(p => Math.floor(p.rating) >= rating);

    renderProducts(filtered, targetGrid);
    if (meta) {
      meta.textContent = term
        ? t("search.results_found", `تم العثور على ${filtered.length} نتيجة.`).replace("{count}", filtered.length)
        : t("search.total_products", `إجمالي المنتجات: ${source.length}`).replace("{count}", source.length);
    }
    if (clearBtn) {
      clearBtn.style.display = term ? "inline-flex" : "none";
    }

    updateSuggestions(term, source);
  };

  let timer = null;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(applySearch, 150);
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      input.value = "";
      applySearch();
      input.focus();
    });
  }

  applyFiltersBtn?.addEventListener("click", applySearch);
  toggleFiltersBtn?.addEventListener("click", () => {
    if (filtersPanel.style.display === 'none') filtersPanel.style.display = '';
    else filtersPanel.style.display = 'none';
  });

  const refreshSearch = () => {
    if (filterCategory && categories.length) {
      filterCategory.innerHTML = `<option value="">${t("filter.all_categories", "كل الأقسام")}</option>` +
        categories.map(c => `<option value="${c.name}">${c.name}</option>`).join("");
    }
    applySearch();
  };

  window.__friendsSearchRefresh = window.__friendsSearchRefresh || [];
  window.__friendsSearchRefresh.push(refreshSearch);

  applySearch();
}

function updateSuggestions(term, source) {
  const list = document.getElementById("searchSuggestions");
  if (!list) return;
  const normalized = normalizeText(term || "");
  // If term is short, use local suggestions; otherwise query server for smarter suggestions
  if (!normalized || normalized.length < 2) {
    const options = (source || [])
      .filter(p => normalizeText(getProductField(p, "name")).startsWith(normalized))
      .slice(0, 6)
      .map(p => `<option value="${getProductField(p, "name").replace(/"/g,'')}"></option>`)
      .join('');
    list.innerHTML = options;
    return;
  }

  // fetch suggestions from backend
  fetch(`${API_BASE}/search?q=${encodeURIComponent(term)}&limit=8`) 
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(data => {
      const items = (data.suggestions && data.suggestions.length) ? data.suggestions : (data.results || []).map(r => getProductField(r, 'name'));
      const options = items.slice(0, 8).map(v => `<option value="${String(v).replace(/"/g,'')}"></option>`).join('');
      list.innerHTML = options;
    })
    .catch(() => {
      // fallback to local
      const options = (source || [])
        .filter(p => normalizeText(getProductField(p, "name")).startsWith(normalized))
        .slice(0, 6)
        .map(p => `<option value="${getProductField(p, "name").replace(/"/g,'')}"></option>`)
        .join('');
      list.innerHTML = options;
    });
}


const discountCodes = {
  FRIENDS10: 0.1,
  WELCOME15: 0.15
};

let activeCoupon = null;

async function applyCouponCode() {
  const input = document.getElementById("discountCode");
  const msg = document.getElementById("couponMsg");
  if (!input) return;
  const code = input.value.trim();
  if (!code) {
    activeCoupon = null;
    if (msg) msg.textContent = "";
    renderCart();
    return;
  }
  try {
    const token = getAuthToken ? getAuthToken() : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${API_BASE}/coupons/validate?code=${encodeURIComponent(code)}`, { headers });
    const data = await response.json();
    if (!response.ok || !data.valid) {
      activeCoupon = null;
      if (msg) msg.textContent = data.error === 'expired' ? 'انتهت صلاحية الكوبون.' : 'الكود غير صالح أو منتهي.';
      renderCart();
      return;
    }
    activeCoupon = { code: data.coupon.code, type: data.coupon.type, value: Number(data.coupon.value || 0) };
    if (msg) msg.textContent = `تم تطبيق الكوبون: ${activeCoupon.code}`;
    renderCart();
  } catch (error) {
    activeCoupon = null;
    if (msg) msg.textContent = 'تعذر التحقق من الكود.';
    renderCart();
  }
}

const paymentChannels = {
  "Vodafone Cash": { transferTo: "01097270537", transferAccount: "Vodafone Wallet - FRIENDS" },
  InstaPay: { transferTo: "01097270537@instapay", transferAccount: "InstaPay - FRIENDS" }
};

let transferProofFile = null;
const ADMIN_WHATSAPP = "201061806140";

function getDiscountRate() {
  if (activeCoupon && activeCoupon.type === 'percent') return Number(activeCoupon.value || 0) / 100;
  const input = document.getElementById("discountCode");
  if (!input) return 0;
  const code = input.value.trim().toUpperCase();
  return discountCodes[code] || 0;
}

function getDiscountAmount(subtotal = 0) {
  const input = document.getElementById("discountCode");
  if (activeCoupon && activeCoupon.type === 'amount') {
    return Math.min(Number(activeCoupon.value || 0), subtotal);
  }
  if (activeCoupon && activeCoupon.type === 'percent') {
    return Math.round(subtotal * (Number(activeCoupon.value || 0) / 100));
  }
  if (!input) return 0;
  const code = input.value.trim().toUpperCase();
  if (!discountCodes[code]) return 0;
  return Math.round(subtotal * discountCodes[code]);
}

function setupDiscountInput() {
  const input = document.getElementById("discountCode");
  const applyBtn = document.getElementById("applyCouponBtn");
  if (!input) return;
  input.addEventListener("input", () => {
    if (!input.value.trim()) {
      activeCoupon = null; renderCart();
    }
  });
  applyBtn?.addEventListener('click', applyCouponCode);
}

function setupPaymentMethod() {
  const methodSelect = document.getElementById("paymentMethod");
  const hint = document.getElementById("paymentHint");
  const transferToEl = document.getElementById("paymentTransferTo");
  const transferAccountEl = document.getElementById("paymentTransferAccount");
  const transferFile = document.getElementById("transferProof");
  const transferPreview = document.getElementById("transferPreview");

  if (!methodSelect) return;

  const applyPaymentInfo = () => {
    const option = methodSelect.options[methodSelect.selectedIndex];
    const provider = option?.dataset?.provider || "";
    const info = paymentChannels[provider];
    if (!provider || !info) {
      transferToEl.textContent = "-";
      transferAccountEl.textContent = "-";
      hint.textContent = t("payment.hint", "اختر طريقة الدفع لعرض رقم التحويل.");
      return;
    }
    transferToEl.textContent = info.transferTo;
    transferAccountEl.textContent = info.transferAccount;
    hint.textContent = formatTemplate(
      t("payment.hint_provider", "التحويل يتم عبر {provider}."),
      { provider }
    );
  };

  methodSelect.addEventListener("change", applyPaymentInfo);
  applyPaymentInfo();

  if (transferFile && transferPreview) {
    transferFile.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        setImagePreview(transferPreview, "");
        transferProofFile = null;
        return;
      }
      transferProofFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(transferPreview, String(reader.result || ""));
      };
      reader.readAsDataURL(file);
    });
  }
}

async function setupOrderConfirm() {
  const button = document.getElementById("confirmOrderBtn");
  const msg = document.getElementById("orderMsg");
  if (!button) return;

  button.addEventListener("click", async () => {
    msg.textContent = "";
    if (cart.length === 0) {
      msg.textContent = t("cart.empty", "السلة فارغة.");
      return;
    }

    const name = document.getElementById("customerName").value.trim();
    const phone = document.getElementById("customerPhone").value.trim();
    const address = document.getElementById("customerAddress").value.trim();
    const notes = document.getElementById("customerNotes").value.trim();
    const discountCode = document.getElementById("discountCode").value.trim();
    const paymentMethod = document.getElementById("paymentMethod");
    const selectedOption = paymentMethod.options[paymentMethod.selectedIndex];
    const provider = selectedOption?.dataset?.provider || "";
    const method = paymentMethod.value;
    const transferRef = document.getElementById("transferRef").value.trim();
    const paymentInfo = paymentChannels[provider];
    const email = authUser?.email || "";

    if (!name || !phone || !address) {
      msg.textContent = t("cart.msg.required_fields", "الاسم ورقم الهاتف والعنوان مطلوبين.");
      return;
    }
    if (!method || !provider || !paymentInfo) {
      msg.textContent = t("cart.msg.invalid_payment", "اختر طريقة دفع صالحة.");
      return;
    }
    if (!transferProofFile) {
      msg.textContent = t("cart.msg.proof_required", "من فضلك أضف صورة التحويل.");
      return;
    }

    try {
      const order = await sendOrderToBackend({
        discountCode,
        customer: { name, phone, address, notes, email },
        payment: {
          method,
          provider,
          transferTo: paymentInfo.transferTo,
          transferAccount: paymentInfo.transferAccount,
          transferProofImage: "",
          transferRef
        },
        transferProofFile
      });

      const adminLink = `${getBaseUrl()}/admin.html?orderToken=${order.adminAccessToken}`;
      const orderCode = order.id.slice(0, 8);
      const totalText = document.getElementById("cartTotal").textContent;

      const messageLines = [
        t("order.msg.new", "طلب جديد"),
        "",
        formatTemplate(t("order.msg.order_number", "رقم الطلب: {code}"), { code: orderCode }),
        "",
        formatTemplate(t("order.msg.total", "الإجمالي: {total}"), { total: totalText }),
        "",
        t("order.msg.products", "المنتجات:"),
        ...order.items.map(item => `- ${item.name} × ${item.qty ?? item.quantity ?? 1}`),
        "",
        formatTemplate(t("order.msg.customer", "العميل: {name}"), { name }),
        formatTemplate(t("order.msg.phone", "الهاتف: {phone}"), { phone }),
        "",
        t("order.msg.admin_link", "رابط الأدمن الخاص بك:"),
        adminLink
      ];

      const waUrl = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(messageLines.join("\n"))}`;
      window.open(waUrl, "_blank");

      msg.textContent = formatTemplate(
        t("cart.msg.confirmed", "تم تأكيد الطلب بنجاح. رقم الطلب: {code}"),
        { code: orderCode }
      );
      cart.length = 0;
      saveCart();
      updateCartBadge();
      renderCart();
      document.getElementById("transferProof").value = "";
      setImagePreview(document.getElementById("transferPreview"), "");
      transferProofFile = null;
    } catch (error) {
      msg.textContent = t("cart.msg.failed", "تعذر تأكيد الطلب. تأكد من تشغيل السيرفر.");
    }
  });
}

async function sendOrderToBackend(payload) {
  try {
    const formData = new FormData();
    formData.append("items", JSON.stringify(cart.map(item => ({ id: item.id, qty: item.qty }))));
    formData.append("discountCode", payload.discountCode || "");
    formData.append("customer", JSON.stringify(payload.customer || {}));
    formData.append("payment", JSON.stringify(payload.payment || {}));
    if (payload.transferProofFile) {
      formData.append("transferProofImage", payload.transferProofFile);
    }

    const res = await fetch(`${API_BASE}/orders`, {
      method: "POST",
      body: formData
    });
    if (!res.ok) throw new Error("order_failed");
    return res.json();
  } catch (error) {
    throw error;
  }
}

// تشغيل سلايدر الصفحة الرئيسية
function initHeroSlider() {
  const slidesContainer = document.getElementById("heroSlides");
  const heroSection = document.querySelector(".hero");
  if (!slidesContainer || typeof Swiper === "undefined") return;
  if (!heroSlides.length) {
    if (heroSection) heroSection.style.display = "none";
    return;
  }

  heroSlides.forEach(slide => {
    const el = document.createElement("div");
    el.className = "swiper-slide";
    el.innerHTML = `
      <div class="hero-slide">
        <div>
          <span class="badge">${slide.badge}</span>
          <h3>${slide.title}</h3>
          <p>${slide.text}</p>
          <button class="btn primary">${t("action.order_now", "اطلب الآن")}</button>
        </div>
        <img src="${slide.image}" alt="${slide.title} - FRIENDS Store" />
      </div>
    `;
    slidesContainer.appendChild(el);
  });

  slidesContainer.addEventListener("click", (event) => {
    if (!event.target.classList.contains("btn")) return;
    const section = document.getElementById("products");
    if (section) section.scrollIntoView({ behavior: "smooth" });
  });

  new Swiper(".hero-swiper", {
    loop: true,
    autoplay: {
      delay: 3500,
      disableOnInteraction: false
    },
    pagination: {
      el: ".swiper-pagination",
      clickable: true
    }
  });
}

// التهيئة حسب الصفحة
async function init() {
  await hydrateAuthUser();
  renderAuthLinks();
  await loadCatalog();
  const page = document.body.dataset.page;

  if (page === "home") {
    renderProducts(products, document.getElementById("productsGrid"));
    renderOffers();
    renderCategories();
    initHeroSlider();
    setupSearch(document.getElementById("productsGrid"), () => products);
  }

  if (page === "category") {
    renderCategoryPage();
    updateCategorySEO(currentCategory, products.filter(p => getProductField(p, "category") === currentCategory || p.category === currentCategory));
    setupSearch(document.getElementById("categoryGrid"), () => products.filter(product => {
      const localized = getProductField(product, "category");
      return localized === currentCategory || product.category === currentCategory;
    }));
  }

  if (page === "product") {
    renderProductDetails();
    const _pid = Number(getQueryParam("id"));
    const _product = products.find(p => p.id === _pid);
    if (_product) updateProductSEO(_product);
  }

  if (page === "cart") {
    renderCart();
    setupCartControls();
    setupDiscountInput();
    setupPaymentMethod();
    setupOrderConfirm();
  }

  updateCartBadge();
}

window.addEventListener("langchange", () => {
  categories = buildCategories(products);
  const page = document.body.dataset.page;

  if (page === "home") {
    renderProducts(products, document.getElementById("productsGrid"));
    renderOffers();
    renderCategories();
  }

  if (page === "category") {
    renderCategoryPage();
  }

  if (page === "product") {
    renderProductDetails();
  }

  if (page === "cart") {
    renderCart();
  }

  if (Array.isArray(window.__friendsSearchRefresh)) {
    window.__friendsSearchRefresh.forEach(fn => typeof fn === "function" && fn());
  }
});

init();


