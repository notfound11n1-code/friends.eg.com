const API_BASE = `${window.location.origin}/api`;
let token = localStorage.getItem("friends_admin_token") || localStorage.getItem("friends_user_token") || "";
let me = null;
let imageDataList = [];
let heroImageData = "";

const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const ordersSection = document.getElementById("ordersSection");
const reviewsSection = document.getElementById("reviewsSection");
const staffSection = document.getElementById("staffSection");
const usersSection = document.getElementById("usersSection");
const financeSection = document.getElementById("financeSection");

const loginMsg = document.getElementById("loginMsg");
const productMsg = document.getElementById("productMsg");
const heroMsg = document.getElementById("heroMsg");
const productsList = document.getElementById("productsList");
const heroList = document.getElementById("heroList");
const ordersList = document.getElementById("ordersList");
const reviewsList = document.getElementById("reviewsList");
const staffList = document.getElementById("staffList");
const usersList = document.getElementById("usersList");
const adminLogoutBtn = document.getElementById("adminLogoutBtn");

// Finance elements
const financeDateFrom = document.getElementById('financeDateFrom');
const financeDateTo = document.getElementById('financeDateTo');
const financeApplyBtn = document.getElementById('financeApply');
const financeThisWeekBtn = document.getElementById('financeThisWeek');
const financeThisMonthBtn = document.getElementById('financeThisMonth');
const financeThisYearBtn = document.getElementById('financeThisYear');
const financeExportBtn = document.getElementById('financeExport');
const financeMsg = document.getElementById('financeMsg');
const financeTable = document.getElementById('financeTable');
const financeTotalRevenueEl = document.getElementById('financeTotalRevenue');
const financeTotalOrdersEl = document.getElementById('financeTotalOrders');
const financeTotalItemsEl = document.getElementById('financeTotalItems');

// New admin sections
const supportSection = document.getElementById('supportSection');
const supportRefreshBtn = document.getElementById('supportRefresh');
const supportListEl = document.getElementById('supportList');

const supportQuestionsSection = document.getElementById('supportQuestionsSection');
const supportQuestionsRefreshBtn = document.getElementById('supportQuestionsRefresh');
const supportQuestionsListEl = document.getElementById('supportQuestionsList');

const returnsSection = document.getElementById('returnsSection');
const returnsRefreshBtn = document.getElementById('returnsRefresh');
const returnsListEl = document.getElementById('returnsList');

const couponsSection = document.getElementById('couponsSection');
const couponCodeInput = document.getElementById('couponCode');
const couponValueInput = document.getElementById('couponValue');
const couponTypeSelect = document.getElementById('couponType');
const createCouponBtn = document.getElementById('createCouponBtn');
const couponsListEl = document.getElementById('couponsList');
const couponsMsg = document.getElementById('couponsMsg');

const promotionsSection = document.getElementById('promotionsSection');
const promotionTitleInput = document.getElementById('promotionTitle');
const promotionTypeInput = document.getElementById('promotionType');
const promotionValueInput = document.getElementById('promotionValue');
const createPromotionBtn = document.getElementById('createPromotionBtn');
const promotionsListEl = document.getElementById('promotionsList');

const exportProductsSection = document.getElementById('exportProductsSection');
const exportProductsBtn = document.getElementById('exportProductsBtn');
const exportProductsMsg = document.getElementById('exportProductsMsg');

const kpiSection = document.getElementById('kpiSection');
const kpiPeriodSelect = document.getElementById('kpiPeriod');
const kpiRefreshBtn = document.getElementById('kpiRefresh');
const kpiTotalOrdersEl = document.getElementById('kpiTotalOrders');
const kpiRevenueEl = document.getElementById('kpiRevenue');
const kpiAovEl = document.getElementById('kpiAov');
const kpiTopListEl = document.getElementById('kpiTopList');

const prescriptionsSection = document.getElementById('prescriptionsSection');
const prescriptionsRefreshBtn = document.getElementById('prescriptionsRefresh');
const prescriptionsListEl = document.getElementById('prescriptionsList');

const staffNameInput = document.getElementById("staffName");
const staffEmailInput = document.getElementById("staffEmail");
const staffPasswordInput = document.getElementById("staffPassword");
const staffRoleInput = document.getElementById("staffRole");
const staffCreateMsg = document.getElementById("staffCreateMsg");
const createStaffBtn = document.getElementById("createStaffBtn");

const statusLabels = {
  pending: "قيد المراجعة",
  confirmed: "تم التأكيد",
  packed: "تم التغليف",
  shipped: "تم الشحن",
  delivered: "تم التوصيل",
  cancelled: "تم الإلغاء"
};

const getInitials = (name = "") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "؟";
  return parts.slice(0, 2).map(part => part[0]).join("");
};

const csvEscape = (value) => {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, "\"\"")}"`;
};

const downloadCsv = (filename, rows) => {
  const csvBody = rows.map(row => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([`\ufeff${csvBody}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const orderTokenFromUrl = new URLSearchParams(window.location.search).get("orderToken");

const formFields = {
  id: document.getElementById("pId"),
  name: document.getElementById("pName"),
  price: document.getElementById("pPrice"),
  category: document.getElementById("pCategory"),
  short: document.getElementById("pShort"),
  details: document.getElementById("pDetails"),
  usage: document.getElementById("pUsage"),
  discount: document.getElementById("pDiscount"),
  stock: document.getElementById("pStock"),
  brand: document.getElementById("pBrand"),
  sku: document.getElementById("pSku"),
  imageFile: document.getElementById("pImageFile"),
  imagePreview: document.getElementById("pImagePreview"),
  nameEn: document.getElementById("pNameEn"),
  categoryEn: document.getElementById("pCategoryEn"),
  shortEn: document.getElementById("pShortEn"),
  detailsEn: document.getElementById("pDetailsEn"),
  usageEn: document.getElementById("pUsageEn"),
  brandEn: document.getElementById("pBrandEn")
};

const heroFields = {
  id: document.getElementById("heroId"),
  title: document.getElementById("heroTitle"),
  text: document.getElementById("heroText"),
  badge: document.getElementById("heroBadge"),
  imageFile: document.getElementById("heroImageFile"),
  imagePreview: document.getElementById("heroImagePreview")
};

const productFormTitle = document.getElementById("productFormTitle");
const heroFormTitle = document.getElementById("heroFormTitle");
const enFieldsWrap = document.getElementById("productEnFields");
const toggleEnFieldsBtn = document.getElementById("toggleEnFields");

const hasPermission = (perm) => Array.isArray(me?.permissions) && me.permissions.includes(perm);

// Sidebar navigation buttons
const initSidebarNav = () => {
  const buttons = Array.from(document.querySelectorAll('.admin-nav-btn'));
  buttons.forEach(btn => {
    const target = btn.getAttribute('data-target');
    btn.addEventListener('click', () => {
      const el = document.getElementById(target);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
};

const api = async (path, options = {}) => {
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`; // attach Bearer token header`Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "request_failed");
  return data;
};

const showLogin = () => {
  loginSection.style.display = "block";
  dashboardSection.style.display = "none";
  ordersSection.style.display = "none";
  reviewsSection.style.display = "none";
  staffSection.style.display = "none";
  usersSection.style.display = "none";
  adminLogoutBtn.style.display = "none";
};

const showSectionsByPermissions = () => {
  loginSection.style.display = "none";
  adminLogoutBtn.style.display = "inline-flex";

  dashboardSection.style.display = hasPermission("catalog.manage") ? "block" : "none";
  ordersSection.style.display = hasPermission("orders.read") ? "block" : "none";
  reviewsSection.style.display = hasPermission("reviews.read") ? "block" : "none";
  staffSection.style.display = hasPermission("staff.manage") ? "block" : "none";
  usersSection.style.display = hasPermission("users.read") ? "block" : "none";
  financeSection.style.display = hasPermission("finance.read") ? "block" : "none";

  // additional panels
  supportSection && (supportSection.style.display = hasPermission('staff.manage') ? 'block' : 'none');
  supportQuestionsSection && (supportQuestionsSection.style.display = hasPermission('staff.manage') ? 'block' : 'none');
  returnsSection && (returnsSection.style.display = hasPermission('staff.manage') ? 'block' : 'none');
  couponsSection && (couponsSection.style.display = hasPermission('staff.manage') ? 'block' : 'none');
  promotionsSection && (promotionsSection.style.display = hasPermission('staff.manage') ? 'block' : 'none');
  exportProductsSection && (exportProductsSection.style.display = hasPermission('catalog.manage') ? 'block' : 'none');
  kpiSection && (kpiSection.style.display = hasPermission('staff.manage') ? 'block' : 'none');
  prescriptionsSection && (prescriptionsSection.style.display = hasPermission('staff.manage') ? 'block' : 'none');

  // show/hide sidebar buttons according to visible sections
  const navBtns = document.querySelectorAll('.admin-nav-btn');
  navBtns.forEach(b => {
    const t = b.getAttribute('data-target');
    const el = document.getElementById(t);
    if (!el) { b.style.display = 'none'; return; }
    b.style.display = (el.style.display && el.style.display !== 'none') ? 'inline-flex' : 'none';
  });
};

const getOrderFiltersQuery = () => {
  const status = document.getElementById("filterStatus")?.value || "";
  const dateFrom = document.getElementById("filterDateFrom")?.value || "";
  const dateTo = document.getElementById("filterDateTo")?.value || "";
  const q = document.getElementById("filterOrderQuery")?.value?.trim() || "";
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);
  if (q) params.set("q", q);
  return params.toString() ? `?${params.toString()}` : "";
};

const getUserFiltersQuery = () => {
  const country = document.getElementById("filterUserCountry")?.value || "";
  const type = document.getElementById("filterUserType")?.value || "";
  const phoneKey = document.getElementById("filterUserPhoneKey")?.value?.trim() || "";
  const letter = document.getElementById("filterUserLetter")?.value?.trim() || "";
  const q = document.getElementById("filterUserQuery")?.value?.trim() || "";
  const params = new URLSearchParams();
  if (country) params.set("country", country);
  if (type) params.set("roleType", type);
  if (phoneKey) params.set("phoneKey", phoneKey);
  if (letter) params.set("letter", letter);
  if (q) params.set("q", q);
  return params.toString() ? `?${params.toString()}` : "";
};

const loadImageFile = async (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const setPreviewList = (container, images = []) => {
  if (!container) return;
  const list = Array.isArray(images) ? images.filter(Boolean) : [];
  container.innerHTML = list.map(src => `<img src="${src}" alt="preview" />`).join("");
};

const getPreviewListSrc = (container) => {
  if (!container) return [];
  return Array.from(container.querySelectorAll("img"))
    .map(img => img.getAttribute("src"))
    .filter(Boolean);
};

const collectProductPayload = () => {
  const images = imageDataList.length ? imageDataList : getPreviewListSrc(formFields.imagePreview);
  const enPayload = {
    name: formFields.nameEn?.value.trim(),
    category: formFields.categoryEn?.value.trim(),
    short: formFields.shortEn?.value.trim(),
    details: formFields.detailsEn?.value.trim(),
    usage: formFields.usageEn?.value.trim(),
    brand: formFields.brandEn?.value.trim()
  };
  const hasEn = Object.values(enPayload).some(val => val);

  return {
    name: formFields.name.value.trim(),
    price: Number(formFields.price.value || 0),
    category: formFields.category.value.trim(),
    short: formFields.short.value.trim(),
    details: formFields.details.value.trim(),
    usage: formFields.usage.value.trim(),
    discount: formFields.discount.value.trim() || "لا يوجد",
    stock: Number(formFields.stock.value || 0),
    brand: formFields.brand.value.trim(),
    sku: formFields.sku.value.trim(),
    images,
    image: images[0] || "",
    i18n: hasEn ? { en: enPayload } : undefined
  };
};

const collectHeroPayload = () => ({
  title: heroFields.title.value.trim(),
  text: heroFields.text.value.trim(),
  badge: heroFields.badge.value.trim() || "عرض خاص",
  image: heroImageData || getPreviewSrc(heroFields.imagePreview)
});

const resetProductForm = () => {
  formFields.id.value = "";
  formFields.name.value = "";
  formFields.price.value = "";
  formFields.category.value = "";
  formFields.short.value = "";
  formFields.details.value = "";
  formFields.usage.value = "";
  formFields.discount.value = "";
  formFields.stock.value = "";
  formFields.brand.value = "";
  formFields.sku.value = "";
  formFields.imageFile.value = "";
  setPreviewList(formFields.imagePreview, []);
  imageDataList = [];
  if (formFields.nameEn) formFields.nameEn.value = "";
  if (formFields.categoryEn) formFields.categoryEn.value = "";
  if (formFields.shortEn) formFields.shortEn.value = "";
  if (formFields.detailsEn) formFields.detailsEn.value = "";
  if (formFields.usageEn) formFields.usageEn.value = "";
  if (formFields.brandEn) formFields.brandEn.value = "";
  if (enFieldsWrap) enFieldsWrap.style.display = "none";
  productFormTitle.textContent = "إضافة منتج جديد";
};

const resetHeroForm = () => {
  heroFields.id.value = "";
  heroFields.title.value = "";
  heroFields.text.value = "";
  heroFields.badge.value = "";
  heroFields.imageFile.value = "";
  setPreview(heroFields.imagePreview, "");
  heroImageData = "";
  heroFormTitle.textContent = "إضافة سلايد جديد";
};

const renderProducts = async () => {
  if (!hasPermission("catalog.manage")) return;
  const products = await api("/admin/products");
  productsList.innerHTML = products.map(product => {
    const imageBlock = product.image
      ? `<img src="${product.image}" alt="${product.name}" />`
      : `<div class="admin-thumb-empty">بدون صورة</div>`;
    const hasEn = product.i18n && product.i18n.en && product.i18n.en.name;
    const enBadge = hasEn ? `<span class="status-chip" style="margin-top:4px;">EN</span>` : "";
    return `
      <div class="admin-row">
        ${imageBlock}
        <div>
          <strong>${product.name}</strong>
          <p class="note">${product.category} | ${product.price} ج.م | مخزون: ${product.stock}</p>
          ${enBadge}
        </div>
        <div class="admin-row-actions">
          <button class="btn ghost" data-action="edit" data-id="${product.id}">تعديل</button>
          <button class="btn ghost" data-action="edit-en" data-id="${product.id}">إضافة EN</button>
          <button class="btn ghost" data-action="delete" data-id="${product.id}">حذف</button>
        </div>
      </div>
    `;
  }).join("") || "<p class='note'>لا توجد منتجات.</p>";
};

const renderHero = async () => {
  if (!hasPermission("catalog.manage")) return;
  const slides = await api("/admin/hero");
  heroList.innerHTML = slides.map(slide => {
    const imageBlock = slide.image
      ? `<img src="${slide.image}" alt="${slide.title}" />`
      : `<div class="admin-thumb-empty">بدون صورة</div>`;
    return `
      <div class="admin-row">
        ${imageBlock}
        <div>
          <strong>${slide.title}</strong>
          <p class="note">${slide.badge}</p>
        </div>
        <div class="admin-row-actions">
          <button class="btn ghost" data-hero-action="edit" data-id="${slide.id}">تعديل</button>
          <button class="btn ghost" data-hero-action="delete" data-id="${slide.id}">حذف</button>
        </div>
      </div>
    `;
  }).join("") || "<p class='note'>لا توجد سلايدات.</p>";
};

const buildStatusButtons = (orderId) => {
  const buttons = [];
  if (hasPermission("orders.support") || hasPermission("orders.shipping") || hasPermission("orders.delivered")) {
    buttons.push(`<button class="btn ghost" data-order-action="status" data-id="${orderId}" data-status="confirmed">تأكيد</button>`);
    buttons.push(`<button class="btn ghost" data-order-action="status" data-id="${orderId}" data-status="cancelled">إلغاء</button>`);
  }
  if (hasPermission("orders.shipping") || hasPermission("orders.delivered")) {
    buttons.push(`<button class="btn ghost" data-order-action="status" data-id="${orderId}" data-status="packed">تغليف</button>`);
    buttons.push(`<button class="btn ghost" data-order-action="status" data-id="${orderId}" data-status="shipped">شحن</button>`);
  }
  return `<div class="status-actions">${buttons.join("")}</div>`;
};

const renderOrders = async () => {
  if (!hasPermission("orders.read")) return;

  let orders = await api(`/admin/orders${getOrderFiltersQuery()}`);
  if (orderTokenFromUrl) {
    try {
      const focused = await api(`/admin/orders/access/${orderTokenFromUrl}`);
      orders = [focused, ...orders.filter(o => o.id !== focused.id)];
    } catch {
      // ignore bad token
    }
  }

  if (!orders.length) {
    ordersList.innerHTML = "<p class='note'>لا يوجد طلبات.</p>";
    return;
  }

  ordersList.innerHTML = orders.map(order => {
    const mark = orderTokenFromUrl && order.adminAccessToken === orderTokenFromUrl ? "style='border-color:#1b4fb8;'" : "";
    return `
      <div class="order-card" ${mark}>
        <div class="order-head">
          <strong>طلب #${order.id.slice(0, 8)}</strong>
          <span class="status-chip">${statusLabels[order.status] || order.status}</span>
        </div>
        <p class="note">${new Date(order.createdAt).toLocaleString("ar-EG")}</p>
        <p><strong>العميل:</strong> ${order.customer?.name || "-"} | ${order.customer?.phone || "-"}</p>
        <p><strong>العنوان:</strong> ${order.customer?.address || "-"}</p>
        <p><strong>الدفع:</strong> ${order.payment?.provider || "-"} | ${order.payment?.transferTo || "-"}</p>
        <p><strong>الإجمالي:</strong> ${order.totals?.total || 0} ج.م</p>
        <p><strong>المنتجات:</strong> ${(order.items || []).map(i => `${i.name} x${i.qty}`).join("، ")}</p>
        ${order.payment?.transferProofImage ? `<a class="btn ghost" href="${order.payment.transferProofImage}" target="_blank">إثبات التحويل</a>` : ""}
        ${buildStatusButtons(order.id)}
        ${hasPermission("orders.delivered") ? `
          <div class="admin-actions" style="margin-top:10px;">
            <input type="file" id="proof-${order.id}" accept="image/*" />
            <input type="text" id="note-${order.id}" placeholder="ملاحظة المندوب" />
            <button class="btn primary" data-order-action="delivered" data-id="${order.id}">تأكيد التوصيل + رابط تقييم</button>
          </div>
        ` : ""}
      </div>
    `;
  }).join("");
};

const notifyCustomerWhatsApp = (order) => {
  const phone = String(order.customer?.phone || "").replace(/\D/g, "");
  if (!phone || !order.lastNotification?.message) return;
  const fullMsg = String(order.lastNotification.message).replace(
    "/review.html?token=",
    `${window.location.origin}/review.html?token=`
  );
  window.open(`https://wa.me/2${phone}?text=${encodeURIComponent(fullMsg)}`, "_blank");
};

const updateOrderStatus = async (orderId, status) => {
  const order = await api(`/admin/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
  notifyCustomerWhatsApp(order);
  await renderOrders();
};

const markDelivered = async (orderId) => {
  const form = new FormData();
  form.append("courierNote", document.getElementById(`note-${orderId}`)?.value?.trim() || "");
  const file = document.getElementById(`proof-${orderId}`)?.files?.[0];
  if (file) form.append("deliveryProofImage", file);

  const order = await api(`/admin/orders/${orderId}/delivered`, {
    method: "PATCH",
    body: form
  });

  notifyCustomerWhatsApp(order);
  await renderOrders();
};

const renderReviews = async () => {
  if (!hasPermission("reviews.read")) return;
  const reviews = await api("/admin/reviews");
  if (!reviews.length) {
    reviewsList.innerHTML = "<p class='note'>لا توجد تقييمات.</p>";
    return;
  }

  reviewsList.innerHTML = reviews.map(review => `
    <div class="order-card">
      <div class="order-head">
        <strong>طلب #${review.orderId.slice(0, 8)}</strong>
        <span class="status-chip">تقييم المندوب: ${review.courierRating}/5</span>
      </div>
      <p><strong>العميل:</strong> ${review.customerName}</p>
      <p><strong>تعليق المندوب:</strong> ${review.courierComment || "بدون"}</p>
      ${(review.products || []).map(item => `
        <div class="order-card">
          <p><strong>${item.productName}</strong></p>
          <p>نجوم: ${item.stars}</p>
          <p>${item.comment || "بدون تعليق"}</p>
          ${hasPermission("reviews.manage") ? `
            <div class="admin-row-actions">
              <button class="btn ghost" data-review-action="show" data-review-id="${review.id}" data-product-review-id="${item.id}">عرض</button>
              <button class="btn ghost" data-review-action="hide" data-review-id="${review.id}" data-product-review-id="${item.id}">إخفاء</button>
              <span class="status-chip">${item.visible ? "معروض" : "مخفي"}</span>
            </div>
          ` : `<span class="status-chip">${item.visible ? "معروض" : "مخفي"}</span>`}
        </div>
      `).join("")}
    </div>
  `).join("");
};

const renderStaff = async () => {
  if (!hasPermission("staff.manage")) return;
  const staff = await api("/admin/staff");
  staffList.innerHTML = staff.map(user => `
    <div class="admin-row">
      <div>
        <strong>${user.name}</strong>
        <p class="note">${user.email}</p>
      </div>
      <div>
        <select data-staff-id="${user.id}" class="select-input">
          <option value="supervisor" ${user.role === "supervisor" ? "selected" : ""}>مشرف</option>
          <option value="shipping" ${user.role === "shipping" ? "selected" : ""}>موظف شحن</option>
          <option value="support" ${user.role === "support" ? "selected" : ""}>خدمة عملاء</option>
        </select>
      </div>
      <div class="admin-row-actions">
        <button class="btn primary" data-staff-action="save" data-staff-id="${user.id}">حفظ</button>
      </div>
    </div>
  `).join("") || "<p class='note'>لا يوجد موظفون.</p>";
};

const renderUsers = async () => {
  if (!hasPermission("users.read") || !usersList) return;
  const users = await api(`/admin/users${getUserFiltersQuery()}`);
  if (!users.length) {
    usersList.innerHTML = "<p class='note'>لا يوجد مستخدمون.</p>";
    return;
  }

  usersList.innerHTML = users.map(user => {
    const roleMap = {
      supervisor: "مشرف",
      shipping: "شحن",
      support: "خدمة عملاء"
    };
    const roleLabel = user.role && user.role !== "user" ? (roleMap[user.role] || "موظف") : "عميل";
    const roleClass = "status-chip";
    return `
      <div class="admin-row user-row">
        <div class="user-avatar">${getInitials(user.name)}</div>
        <div>
          <strong>${user.name || "بدون اسم"}</strong>
          <p class="note">البريد: ${user.email || "-"} | الهاتف: ${user.phone || "-"}</p>
          <p class="note">هاتف إضافي: ${user.altPhone || "-"} | الدولة: ${user.country || "-"}</p>
          <p class="note">العنوان: ${user.address || "-"}</p>
        </div>
        <div class="user-tags">
          <span class="${roleClass}">${roleLabel}</span>
        </div>
      </div>
    `;
  }).join("");
};

const exportUsersCsv = async () => {
  if (!hasPermission("users.read")) return;
  const users = await api(`/admin/users${getUserFiltersQuery()}`);
  const headers = ["الاسم", "البريد", "الهاتف", "هاتف إضافي", "الدولة", "العنوان", "النوع/الدور"];
  const rows = users.map(user => {
    const roleMap = {
      supervisor: "مشرف",
      shipping: "شحن",
      support: "خدمة عملاء",
      user: "عميل"
    };
    const roleLabel = roleMap[user.role] || "عميل";
    return [
      user.name || "",
      user.email || "",
      user.phone || "",
      user.altPhone || "",
      user.country || "",
      user.address || "",
      roleLabel
    ];
  });
  const today = new Date().toISOString().slice(0, 10);
  downloadCsv(`friends-users-${today}.csv`, [headers, ...rows]);
};

let _savingProduct = false;
const saveProduct = async () => {
  if (_savingProduct) return;
  const payload = collectProductPayload();
  if (!payload.name || !payload.category || payload.price <= 0) {
    productMsg.textContent = "الاسم والسعر والتصنيف مطلوبين.";
    return;
  }

  _savingProduct = true;
  const btn = document.getElementById("saveProductBtn");
  if (btn) { btn.disabled = true; btn.textContent = "...جاري الحفظ"; }
  productMsg.textContent = "";
  try {
    const id = Number(formFields.id.value || 0);
    if (id) {
      await api(`/admin/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } else {
      await api("/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }
    productMsg.textContent = id ? "تم تحديث المنتج." : "تم إضافة المنتج ✓";
    resetProductForm();
    await renderProducts();
  } catch (err) {
    productMsg.textContent = "تعذر حفظ المنتج: " + (err.message || "");
  } finally {
    _savingProduct = false;
    if (btn) { btn.disabled = false; btn.textContent = "حفظ المنتج"; }
  }
};

const saveHeroSlide = async () => {
  const payload = collectHeroPayload();
  if (!payload.title || !payload.text) {
    heroMsg.textContent = "عنوان السلايد والنص مطلوبين.";
    return;
  }

  const id = Number(heroFields.id.value || 0);
  if (id) {
    await api(`/admin/hero/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } else {
    await api("/admin/hero", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }
  heroMsg.textContent = id ? "تم تحديث السلايد." : "تم إضافة السلايد.";
  resetHeroForm();
  await renderHero();
};

const setReviewVisibility = async (reviewId, productReviewId, visible) => {
  await api(`/admin/reviews/${reviewId}/products/${productReviewId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visible })
  });
  await renderReviews();
};

const updateStaffRole = async (staffId) => {
  const select = document.querySelector(`select[data-staff-id="${staffId}"]`);
  const role = select?.value;
  if (!role) return;
  await api(`/admin/staff/${staffId}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role })
  });
  await renderStaff();
};

const createStaffAccount = async () => {
  if (!staffNameInput || !staffEmailInput || !staffPasswordInput || !staffRoleInput) return;
  staffCreateMsg.textContent = "";
  const name = staffNameInput.value.trim();
  const email = staffEmailInput.value.trim();
  const password = staffPasswordInput.value;
  const role = staffRoleInput.value;

  if (!name || !email || !password) {
    staffCreateMsg.textContent = "الاسم والبريد وكلمة المرور مطلوبة.";
    return;
  }
  if (password.length < 6) {
    staffCreateMsg.textContent = "كلمة المرور يجب أن تكون 6 أحرف أو أكثر.";
    return;
  }

  try {
    await api("/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role })
    });
    staffCreateMsg.textContent = "تم إنشاء حساب الموظف.";
    staffNameInput.value = "";
    staffEmailInput.value = "";
    staffPasswordInput.value = "";
    staffRoleInput.value = "supervisor";
    await renderStaff();
    await renderUsers();
  } catch (err) {
    if (err.message === "email_exists") {
      staffCreateMsg.textContent = "هذا البريد مستخدم بالفعل.";
      return;
    }
    if (err.message === "invalid_role") {
      staffCreateMsg.textContent = "الرجاء اختيار صلاحية صحيحة.";
      return;
    }
    staffCreateMsg.textContent = "تعذر إنشاء الحساب.";
  }
};

const loadDashboard = async () => {
  showSectionsByPermissions();
  await Promise.all([
    renderProducts(),
    renderHero(),
    renderOrders(),
    renderReviews(),
    renderStaff(),
    renderUsers(),
    renderSupportTickets().catch(()=>{}),
    renderReturns().catch(()=>{}),
    renderCoupons().catch(()=>{}),
    renderPromotions().catch(()=>{}),
    renderKpi().catch(()=>{}),
    renderPrescriptions().catch(()=>{})
  ]);
};

const login = async () => {
  loginMsg.textContent = "";
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;
  const data = await api("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!Array.isArray(data.user.permissions) || !data.user.permissions.length) {
    loginMsg.textContent = "هذا الحساب ليس ضمن فريق الإدارة.";
    return;
  }

  token = data.token;
  me = data.user;
  localStorage.setItem("friends_admin_token", token);
  localStorage.setItem("friends_user_token", token);
  localStorage.setItem("friends_user", JSON.stringify(data.user));
  await loadDashboard();
};

const verifyExistingToken = async () => {
  if (!token) {
    showLogin();
    return;
  }

  try {
    me = await api("/auth/me");
    if (!Array.isArray(me.permissions) || !me.permissions.length) throw new Error("forbidden");
    await loadDashboard();
  } catch {
    token = "";
    me = null;
    localStorage.removeItem("friends_admin_token");
    localStorage.removeItem("friends_user_token");
    localStorage.removeItem("friends_user");
    showLogin();
  }
};

document.getElementById("adminLoginBtn").addEventListener("click", () => {
  login().catch(() => {
    loginMsg.textContent = "تعذر تسجيل الدخول.";
  });
});

if (document.getElementById("applyOrderFilters")) {
  document.getElementById("applyOrderFilters").addEventListener("click", () => {
    renderOrders().catch(() => {
      alert("تعذر تطبيق الفلترة");
    });
  });
}

if (document.getElementById("applyUserFilters")) {
  document.getElementById("applyUserFilters").addEventListener("click", () => {
    renderUsers().catch(() => {
      alert("تعذر تطبيق فلترة المستخدمين");
    });
  });
}

if (document.getElementById("clearUserFilters")) {
  document.getElementById("clearUserFilters").addEventListener("click", () => {
    const country = document.getElementById("filterUserCountry");
    const type = document.getElementById("filterUserType");
    const phoneKey = document.getElementById("filterUserPhoneKey");
    const letter = document.getElementById("filterUserLetter");
    const q = document.getElementById("filterUserQuery");
    if (country) country.value = "";
    if (type) type.value = "";
    if (phoneKey) phoneKey.value = "";
    if (letter) letter.value = "";
    if (q) q.value = "";
    renderUsers().catch(() => {
      alert("تعذر تحديث القائمة");
    });
  });
}

if (document.getElementById("exportUsersBtn")) {
  document.getElementById("exportUsersBtn").addEventListener("click", () => {
    exportUsersCsv().catch(() => {
      alert("تعذر تصدير القائمة");
    });
  });
}

if (createStaffBtn) {
  createStaffBtn.addEventListener("click", () => {
    createStaffAccount().catch(() => {
      if (staffCreateMsg) staffCreateMsg.textContent = "تعذر إنشاء الحساب.";
    });
  });
}

document.getElementById("saveProductBtn")?.addEventListener("click", () => {
  saveProduct();
});

document.getElementById("saveHeroBtn")?.addEventListener("click", () => {
  saveHeroSlide().catch(() => {
    heroMsg.textContent = "تعذر حفظ السلايد.";
  });
});

document.getElementById("resetProductBtn")?.addEventListener("click", resetProductForm);
document.getElementById("resetHeroBtn")?.addEventListener("click", resetHeroForm);

toggleEnFieldsBtn?.addEventListener("click", () => {
  if (!enFieldsWrap) return;
  enFieldsWrap.style.display = enFieldsWrap.style.display === "none" ? "block" : "none";
});

formFields.imageFile?.addEventListener("change", async (event) => {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  imageDataList = await Promise.all(files.map(loadImageFile));
  setPreviewList(formFields.imagePreview, imageDataList);
});

heroFields.imageFile?.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  heroImageData = await loadImageFile(file);
  setPreview(heroFields.imagePreview, heroImageData);
});

productsList?.addEventListener("click", (event) => {
  const btn = event.target.closest("button");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const action = btn.dataset.action;

  const fillProductForm = (p, focusEn = false) => {
    formFields.id.value = p.id;
    formFields.name.value = p.name || "";
    formFields.price.value = p.price || 0;
    formFields.category.value = p.category || "";
    formFields.short.value = p.short || "";
    formFields.details.value = p.details || "";
    formFields.usage.value = p.usage || "";
    formFields.discount.value = p.discount || "لا يوجد";
    formFields.stock.value = p.stock || 0;
    formFields.brand.value = p.brand || "";
    formFields.sku.value = p.sku || "";
    const images = Array.isArray(p.images) && p.images.length ? p.images : (p.image ? [p.image] : []);
    setPreviewList(formFields.imagePreview, images);
    imageDataList = [];

    const en = p.i18n?.en || {};
    if (formFields.nameEn) formFields.nameEn.value = en.name || "";
    if (formFields.categoryEn) formFields.categoryEn.value = en.category || "";
    if (formFields.shortEn) formFields.shortEn.value = en.short || "";
    if (formFields.detailsEn) formFields.detailsEn.value = en.details || "";
    if (formFields.usageEn) formFields.usageEn.value = en.usage || "";
    if (formFields.brandEn) formFields.brandEn.value = en.brand || "";

    if (focusEn && enFieldsWrap) {
      enFieldsWrap.style.display = "block";
    }
    productFormTitle.textContent = focusEn
      ? `إضافة/تعديل EN للمنتج #${p.id}`
      : `تعديل المنتج #${p.id}`;
  };

  if (action === "edit" || action === "edit-en") {
    api("/admin/products").then(products => {
      const p = products.find(item => item.id === id);
      if (!p) return;
      fillProductForm(p, action === "edit-en");
    });
    return;
  }

  if (action === "delete") {
    api(`/admin/products/${id}`, { method: "DELETE" })
      .then(() => renderProducts())
      .catch(() => { productMsg.textContent = "تعذر حذف المنتج."; });
  }
});

heroList?.addEventListener("click", (event) => {
  const btn = event.target.closest("button");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const action = btn.dataset.heroAction;

  if (action === "edit") {
    api("/admin/hero").then(slides => {
      const s = slides.find(item => Number(item.id) === id);
      if (!s) return;
      heroFields.id.value = s.id;
      heroFields.title.value = s.title || "";
      heroFields.text.value = s.text || "";
      heroFields.badge.value = s.badge || "";
      setPreview(heroFields.imagePreview, s.image || "");
      heroImageData = s.image || "";
      heroFormTitle.textContent = `تعديل السلايد #${s.id}`;
    });
    return;
  }

  if (action === "delete") {
    api(`/admin/hero/${id}`, { method: "DELETE" })
      .then(() => renderHero())
      .catch(() => { heroMsg.textContent = "تعذر حذف السلايد."; });
  }
});

ordersList?.addEventListener("click", (event) => {
  const btn = event.target.closest("button");
  if (!btn) return;
  const action = btn.dataset.orderAction;
  const orderId = btn.dataset.id;

  if (action === "status") {
    updateOrderStatus(orderId, btn.dataset.status).catch(() => alert("تعذر تحديث الحالة"));
    return;
  }

  if (action === "delivered") {
    markDelivered(orderId).catch(() => alert("تعذر تأكيد التوصيل"));
  }
});

reviewsList?.addEventListener("click", (event) => {
  const btn = event.target.closest("button");
  if (!btn) return;
  const action = btn.dataset.reviewAction;
  if (!action) return;
  const reviewId = btn.dataset.reviewId;
  const productReviewId = btn.dataset.productReviewId;
  setReviewVisibility(reviewId, productReviewId, action === "show").catch(() => alert("تعذر تحديث التعليق"));
});

staffList?.addEventListener("click", (event) => {
  const btn = event.target.closest("button");
  if (!btn) return;
  if (btn.dataset.staffAction !== "save") return;
  updateStaffRole(btn.dataset.staffId).catch(() => alert("تعذر حفظ الدور"));
});

adminLogoutBtn.addEventListener("click", () => {
  token = "";
  me = null;
  localStorage.removeItem("friends_admin_token");
  localStorage.removeItem("friends_user_token");
  localStorage.removeItem("friends_user");
  showLogin();
});

verifyExistingToken().catch(() => showLogin());

/* ==================================================================
   Additional admin utilities and enhancements
   - Bulk operations (price update, CSV import/export)
   - Undo manager for recent changes
   - Activity log viewer stored in localStorage
   - Lightweight analytics (counts, top products)
   - Keyboard shortcuts and accessibility announcements
   Notes: These augmentations are client-side helpers to speed up
   administrative work while you refine backend integrations.
   ================================================================== */

// -------------------------- Activity Log ---------------------------
// Activity log stored in backend only
async function pushActivity(entry) {
  try {
    await api('/admin/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry })
    });
  } catch (e) {
    console.warn('pushActivity failed', e);
  }
}

async function readActivity(limit = 50) {
  try {
    return await api(`/admin/activity?limit=${Number(limit)}`);
  } catch (e) {
    console.warn('readActivity failed', e);
    return [];
  }
}

async function renderActivityPanel() {
  // create a small floating panel if not exists
  let panel = document.getElementById('adminActivityPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'adminActivityPanel';
    panel.style.position = 'fixed';
    panel.style.right = '12px';
    panel.style.bottom = '120px';
    panel.style.width = '320px';
    panel.style.maxHeight = '360px';
    panel.style.overflow = 'auto';
    panel.style.background = 'var(--card)';
    panel.style.border = '1px solid var(--line)';
    panel.style.boxShadow = '0 8px 26px rgba(0,0,0,0.06)';
    panel.style.borderRadius = '12px';
    panel.style.padding = '10px';
    panel.style.zIndex = 120;
    panel.style.fontSize = '13px';
    panel.style.color = 'var(--muted)';
    panel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><strong>Activity</strong><div><button id="adminActivityExport" class="btn ghost">تصدير</button> <button id="adminActivityClose" class="btn ghost">إغلاق</button></div></div><div id="adminActivityList"></div>`;
    document.body.appendChild(panel);
    document.getElementById('adminActivityClose').addEventListener('click', () => panel.remove());
  }
  const listEl = document.getElementById('adminActivityList');
  const items = await readActivity(50);
    listEl.innerHTML = (items || []).map(a => `<div style="margin-bottom:6px"><small style="color:var(--muted)">${a.time}</small><div>${escapeHtml(a.entry||'')}</div></div>`).join('');

    // attach export handler
    const exportBtn = document.getElementById('adminActivityExport');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        try {
          const res = await fetch(`${API_BASE}/admin/activity/export`, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
          if (!res.ok) throw new Error('failed');
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = 'activity_export.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        } catch (err) { alert('فشل تصدير السجل'); }
      });
    }
  }

// -------------------------- Undo Manager ---------------------------
// stores a small stack of reversible operations
// Undo manager using backend-only queue
async function pushUndo(action) {
  try {
    await api('/admin/undo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action)
    });
  } catch (e) {
    console.warn('pushUndo failed', e);
  }
}

async function popUndo() {
  try {
    return await api('/admin/undo/pop', { method: 'POST' });
  } catch (e) {
    console.warn('popUndo failed', e);
    return null;
  }
}

async function performUndo() {
  const action = await popUndo();
  if (!action) return alert('لا توجد تغييرات للتراجع عنها');
  try {
    if (action.type === 'product:create') {
      await api(`/admin/products/${action.payload.id}`, { method: 'DELETE' });
      await pushActivity(`تراجع: حذف المنتج ${action.payload.name}`);
      await renderProducts();
      return alert('تم التراجع عن الإضافة');
    }
    if (action.type === 'product:update') {
      await api(`/admin/products/${action.payload.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action.revert) });
      await pushActivity(`تراجع: استعادة المنتج ${action.revert.name}`);
      await renderProducts();
      return alert('تم التراجع واستعادة المنتج');
    }
    if (action.type === 'hero:create') {
      await api(`/admin/hero/${action.payload.id}`, { method: 'DELETE' });
      await pushActivity(`تراجع: حذف سلايد ${action.payload.title}`);
      await renderHero();
      return alert('تم التراجع عن إضافة السلايد');
    }
    alert('إجراء التراجع غير مدعوم لهذا النوع');
  } catch (err) {
    console.error(err);
    alert('فشل التراجع');
  }
}

// expose undo button on page
function ensureUndoButton() {
  let btn = document.getElementById('adminUndoBtn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'adminUndoBtn';
    btn.className = 'btn ghost';
    btn.textContent = 'تراجع (Undo)';
    btn.style.position = 'fixed';
    btn.style.left = '12px';
    btn.style.bottom = '120px';
    btn.style.zIndex = 120;
    document.body.appendChild(btn);
    btn.addEventListener('click', performUndo);
  }
}

// ------------------------ Bulk Price Update ------------------------
async function bulkUpdatePrices(percent, filter = {}) {
  if (!percent || isNaN(Number(percent))) return alert('أدخل رقم صالح للنسبة');
  if (!confirm(`تحديث الأسعار بنسبة ${percent}% على جميع المنتجات المتطابقة؟`)) return;
  try {
    const products = await api('/admin/products');
    const targets = products.filter(p => {
      if (filter.category && p.category !== filter.category) return false;
      if (filter.brand && p.brand !== filter.brand) return false;
      return true;
    });
    for (const p of targets) {
      const old = Object.assign({}, p);
      const newPrice = Number((p.price * (1 + Number(percent) / 100)).toFixed(2));
      await api(`/admin/products/${p.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({}, p, { price: newPrice })) });
      pushUndo({ type: 'product:update', payload: { id: p.id }, revert: old });
    }
    pushActivity(`تحديث الأسعار: ${percent}% على ${targets.length} منتجات`);
    alert('تم تحديث الأسعار بنجاح');
    renderProducts();
  } catch (err) {
    console.error(err);
    alert('فشل التحديث الجماعي');
  }
}

// UI helper to ask for percentage and run bulk update
function promptBulkUpdate() {
  const percent = prompt('أدخل النسبة المئوية (مثال: 10 أو -5):', '10');
  if (percent === null) return;
  bulkUpdatePrices(Number(percent)).catch(() => alert('تعذر إجراء التحديث'));
}

// --------------------------- CSV Import ----------------------------
// Accepts a products CSV with headers: name,price,category,brand,stock,sku,short,details
function parseCsv(text) {
  // very small CSV parser - assumes no embedded commas or newlines in fields
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(l => {
    const values = l.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i] || '');
    return obj;
  });
  return rows;
}

async function importProductsCsv(file) {
  if (!file) return alert('اختر ملف CSV');
  const text = await file.text();
  const rows = parseCsv(text);
  if (!rows.length) return alert('لا سطور في الملف');
  try {
    for (const r of rows) {
      const payload = {
        name: r.name || r.Name || 'منتج',
        price: Number(r.price || 0),
        category: r.category || r.Category || 'عام',
        brand: r.brand || r.Brand || '',
        stock: Number(r.stock || 0),
        sku: r.sku || r.SKU || '',
        short: r.short || r.Short || '',
        details: r.details || r.Details || ''
      };
      await api('/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }
    pushActivity(`استيراد منتجات من CSV: ${rows.length} منتجات`);
    alert('تم الاستيراد');
    renderProducts();
  } catch (err) {
    console.error(err);
    alert('فشل الاستيراد');
  }
}

// --------------------------- Analytics ----------------------------
async function computeAnalytics() {
  const products = await api('/admin/products');
  const orders = await api('/admin/orders');
  const users = await api('/admin/users');
  const totalProducts = products.length;
  const totalOrders = orders.length;
  const totalUsers = users.length;
  const revenue = orders.reduce((s, o) => s + Number(o.totals?.total || o.total || 0), 0);
  // compute top products by sold qty
  const productSales = {};
  orders.forEach(o => (o.items || []).forEach(it => { productSales[it.productId] = (productSales[it.productId] || 0) + (it.qty || 0); }));
  const top = Object.keys(productSales).map(id => ({ id, qty: productSales[id], name: (products.find(p => p.id == id) || {}).name || id })).sort((a,b)=>b.qty-a.qty).slice(0,5);
  return { totalProducts, totalOrders, totalUsers, revenue, top }; 
}

async function renderAnalyticsPanel() {
  const data = await computeAnalytics();
  let panel = document.getElementById('adminAnalyticsPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'adminAnalyticsPanel';
    panel.style.position = 'fixed';
    panel.style.left = '12px';
    panel.style.bottom = '12px';
    panel.style.width = '260px';
    panel.style.background = 'var(--card)';
    panel.style.padding = '10px';
    panel.style.border = '1px solid var(--line)';
    panel.style.borderRadius = '10px';
    panel.style.boxShadow = '0 8px 26px rgba(0,0,0,0.06)';
    panel.style.zIndex = 110;
    panel.innerHTML = `<strong>Analytics</strong><div id="adminAnalyticsContent"></div>`;
    document.body.appendChild(panel);
  }
  const el = document.getElementById('adminAnalyticsContent');
  el.innerHTML = `
    <div class="note">المنتجات: ${data.totalProducts}</div>
    <div class="note">الطلبات: ${data.totalOrders}</div>
    <div class="note">المستخدمين: ${data.totalUsers}</div>
    <div class="note">الإيرادات: ${data.revenue.toFixed(2)} ج.م</div>
    <div style="margin-top:8px"><strong>الأكثر مبيعاً</strong>${data.top.map(t=>`<div class="note">${t.name} • ${t.qty}</div>`).join('')}</div>
  `;
}

// ------------------------ Keyboard Shortcuts -----------------------
function installShortcuts() {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const q = prompt('ابحث عن منتج (اسم أو SKU):');
      if (q) {
        // simple search and highlight in product list
        api('/admin/products').then(products => {
          const found = products.find(p => (p.name||'').includes(q) || (p.sku||'').includes(q));
          if (found) {
            alert(`موجود: ${found.name} - SKU: ${found.sku}`);
          } else alert('لم يتم العثور');
        }).catch(()=>alert('تعذر البحث'));
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
      e.preventDefault();
      performUndo();
    }
  });
}

// ----------------------- Accessibility Announcer -------------------
function announce(message) {
  let el = document.getElementById('a11yAnnouncer');
  if (!el) {
    el = document.createElement('div');
    el.id = 'a11yAnnouncer';
    el.setAttribute('aria-live', 'polite');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
  }
  el.textContent = message;
}

// ------------------------- Light API fallback ----------------------
// If /api endpoints are not available (dev), we fallback to localStorage
async function apiFallback(path, options = {}) {
  try {
    return await api(path, options);
  } catch (err) {
    // fallback emulation for some endpoints
    // products
    const method = (options.method || 'GET').toUpperCase();
    if (path.startsWith('/admin/products')) {
      const key = STORAGE_KEYS.PRODUCTS || 'friends_products_v1';
      let list = loadFromStorage(key, []);
      if (method === 'GET') return list;
      if (method === 'POST') {
        const payload = JSON.parse(options.body || '{}');
        const item = Object.assign({ id: uid('prd'), createdAt: nowIso(), updatedAt: nowIso() }, payload);
        list.unshift(item);
        saveToStorage(key, list);
        pushActivity(`(local) إضافة منتج ${item.name}`);
        return item;
      }
      // PUT /admin/products/:id
      if (method === 'PUT') {
        const m = path.match(/\/admin\/products\/(.+)$/);
        if (m) {
          const id = m[1];
          const payload = JSON.parse(options.body || '{}');
          const idx = list.findIndex(p => String(p.id) === String(id));
          if (idx !== -1) {
            const prev = Object.assign({}, list[idx]);
            list[idx] = Object.assign(list[idx], payload, { updatedAt: nowIso() });
            saveToStorage(key, list);
            pushUndo({ type: 'product:update', payload: { id }, revert: prev });
            pushActivity(`(local) تحديث منتج ${list[idx].name}`);
            return list[idx];
          }
        }
      }
      if (method === 'DELETE') {
        const m = path.match(/\/admin\/products\/(.+)$/);
        if (m) {
          const id = m[1];
          list = list.filter(p => String(p.id) !== String(id));
          saveToStorage(key, list);
          pushActivity(`(local) حذف منتج ${id}`);
          return { success: true };
        }
      }
    }

    // hero endpoints fallback
    if (path.startsWith('/admin/hero')) {
      const key = STORAGE_KEYS.HERO || 'friends_hero_v1';
      let list = loadFromStorage(key, []);
      if (method === 'GET') return list;
      if (method === 'POST') {
        const payload = JSON.parse(options.body || '{}');
        const item = Object.assign({ id: uid('h'), createdAt: nowIso() }, payload);
        list.unshift(item);
        saveToStorage(key, list);
        pushActivity(`(local) إضافة سلايد ${item.title}`);
        return item;
      }
      if (method === 'PUT') {
        const m = path.match(/\/admin\/hero\/(.+)$/);
        if (m) {
          const id = m[1];
          const payload = JSON.parse(options.body || '{}');
          const idx = list.findIndex(h => String(h.id) === String(id));
          if (idx !== -1) {
            list[idx] = Object.assign(list[idx], payload);
            saveToStorage(key, list);
            pushActivity(`(local) تحديث سلايد ${list[idx].title}`);
            return list[idx];
          }
        }
      }
      if (method === 'DELETE') {
        const m = path.match(/\/admin\/hero\/(.+)$/);
        if (m) {
          const id = m[1];
          list = list.filter(h => String(h.id) !== String(id));
          saveToStorage(key, list);
          pushActivity(`(local) حذف سلايد ${id}`);
          return { success: true };
        }
      }
    }

    // orders
    if (path.startsWith('/admin/orders')) {
      const key = STORAGE_KEYS.ORDERS || 'friends_orders_v1';
      let list = loadFromStorage(key, []);
      if (method === 'GET') return list;
      const mPatch = path.match(/\/admin\/orders\/(.+)\/status$/);
      if (mPatch && method === 'PATCH') {
        const id = mPatch[1];
        const body = JSON.parse(options.body || '{}');
        const idx = list.findIndex(o => String(o.id) === String(id));
        if (idx !== -1) {
          list[idx].status = body.status;
          saveToStorage(key, list);
          pushActivity(`(local) تغيير حالة الطلب ${id} إلى ${body.status}`);
          return list[idx];
        }
      }
    }

    // fallback not implemented
    throw err;
  }
}

// override api() to attempt fallback when network fails
const originalApi = api;
api = async (path, options = {}) => {
  try {
    return await originalApi(path, options);
  } catch (e) {
    // fallback local emulation
    return await apiFallback(path, options);
  }
};

// ---------------------- Helper DOM utilities -----------------------
function setPreview(imgEl, src) {
  if (!imgEl) return;
  if (!src) { imgEl.src = ''; imgEl.classList.add('is-empty'); return; }
  imgEl.src = src;
  imgEl.classList.remove('is-empty');
}

// (preview helpers retained earlier in file)

// ----------------------- Initialization UI ------------------------
function initAdminExtras() {
  ensureUndoButton();
  installShortcuts();
  // small floating controls
  const c1 = document.createElement('div');
  c1.style.position = 'fixed';
  c1.style.right = '12px';
  c1.style.top = '100px';
  c1.style.zIndex = 110;
  c1.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px">
      <button id="adminShowActivity" class="btn ghost">شاهد اللوج</button>
      <button id="adminShowAnalytics" class="btn ghost">عرض التحليلات</button>
      <button id="adminBulkPrice" class="btn ghost">تحديث الأسعار</button>
      <label style="display:inline-flex;gap:6px;align-items:center"><input id="adminCsvInput" type="file" accept=",text/csv" style="display:none" /> <button id="adminImportCsv" class="btn ghost">استيراد CSV</button></label>
    </div>
  `;
  document.body.appendChild(c1);
  document.getElementById('adminShowActivity').addEventListener('click', renderActivityPanel);
  document.getElementById('adminShowAnalytics').addEventListener('click', renderAnalyticsPanel);
  document.getElementById('adminBulkPrice').addEventListener('click', promptBulkUpdate);
  const csvInput = document.getElementById('adminCsvInput');
  document.getElementById('adminImportCsv').addEventListener('click', () => csvInput.click());
  csvInput.addEventListener('change', (ev) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    importProductsCsv(f).catch(() => alert('فشل قراءة CSV'));
  });

  // announce we prepared extras
  announce('ميزات الإدارة الإضافية جاهزة');
  pushActivity('تم تهيئة ميزات الإدارة الإضافية');
}

// run extras after verify
verifyExistingToken().then(() => initAdminExtras()).catch(() => {/* ignore if not logged in */});

// ---------------------- Finance panel ----------------------
let _lastFinanceCsvRows = [];

const formatCurrency = (v) => (typeof v === 'number' ? v.toFixed(2) : String(v));

async function renderFinancePanel() {
  if (!financeSection) return;
  financeMsg.textContent = '';
  const params = new URLSearchParams();
  if (financeDateFrom?.value) params.set('dateFrom', financeDateFrom.value);
  if (financeDateTo?.value) params.set('dateTo', financeDateTo.value);
  try {
    const data = await api(`/admin/finance?${params.toString()}`);
    const summary = data.summary || { totalRevenue: 0, totalOrders: 0, totalItems: 0 };
    financeTotalRevenueEl.textContent = formatCurrency(summary.totalRevenue);
    financeTotalOrdersEl.textContent = String(summary.totalOrders);
    financeTotalItemsEl.textContent = String(summary.totalItems);

    const tx = data.transactions || [];
    // Build table
    if (!tx.length) {
      financeTable.innerHTML = '<div class="admin-row">لا توجد معاملات في النطاق الزمني المحدد.</div>';
      _lastFinanceCsvRows = [];
      return;
    }

    const rowsHtml = tx.map(o => {
      const itemsHtml = (o.items || []).map(i => `<div>${escapeHtml(i.name)} ×${i.qty} — ${formatCurrency(i.price)}</div>`).join('');
      return `
        <div class="admin-row">
          <div style="flex:1">
            <div><strong>الطلب:</strong> ${escapeHtml(String(o.id))}</div>
            <div><small>${new Date(o.createdAt).toLocaleString('ar-EG')}</small></div>
            <div><strong>العميل:</strong> ${escapeHtml(o.customerName||'')}</div>
            <div><strong>الهاتف:</strong> ${escapeHtml(o.customerPhone||'')}</div>
            <div><strong>العناصر:</strong> ${itemsHtml}</div>
          </div>
          <div style="min-width:240px">
            <div>المجموع: ${formatCurrency(o.total)}</div>
            <div>الشحن: ${formatCurrency(o.shipping)}</div>
            <div>الخصم: ${formatCurrency(o.discount)}</div>
            <div>الحالة: ${escapeHtml(o.status||'')}</div>
            <div>الدفع: ${escapeHtml(o.paymentMethod||'')}</div>
          </div>
        </div>
      `;
    }).join('');

    financeTable.innerHTML = rowsHtml;

    // Prepare CSV rows
    const csvRows = [];
    csvRows.push(['Order ID', 'Date', 'Customer', 'Email', 'Phone', 'Item', 'Qty', 'Item Price', 'Subtotal', 'Shipping', 'Discount', 'Total', 'Payment', 'Status']);
    tx.forEach(o => {
      (o.items || []).forEach(i => {
        csvRows.push([o.id, o.createdAt, o.customerName, o.customerEmail || '', o.customerPhone || '', i.name, String(i.qty), formatCurrency(i.price), formatCurrency(o.subtotal), formatCurrency(o.shipping), formatCurrency(o.discount), formatCurrency(o.total), o.paymentMethod || '', o.status || '']);
      });
    });
    _lastFinanceCsvRows = csvRows;
  } catch (err) {
    financeMsg.textContent = String(err.message || err);
    financeTable.innerHTML = '';
    _lastFinanceCsvRows = [];
  }
}

function presetThisWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = (day + 6) % 7; // make Monday start
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
  financeDateFrom.value = start.toISOString().slice(0,10);
  financeDateTo.value = new Date().toISOString().slice(0,10);
}
function presetThisMonth() {
  const now = new Date();
  financeDateFrom.value = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
  financeDateTo.value = new Date().toISOString().slice(0,10);
}
function presetThisYear() {
  const now = new Date();
  financeDateFrom.value = new Date(now.getFullYear(), 0, 1).toISOString().slice(0,10);
  financeDateTo.value = new Date().toISOString().slice(0,10);
}

// Event handlers
if (financeApplyBtn) financeApplyBtn.addEventListener('click', () => renderFinancePanel());
if (financeThisWeekBtn) financeThisWeekBtn.addEventListener('click', () => { presetThisWeek(); renderFinancePanel(); });
if (financeThisMonthBtn) financeThisMonthBtn.addEventListener('click', () => { presetThisMonth(); renderFinancePanel(); });
if (financeThisYearBtn) financeThisYearBtn.addEventListener('click', () => { presetThisYear(); renderFinancePanel(); });
if (financeExportBtn) financeExportBtn.addEventListener('click', () => {
  if (!_lastFinanceCsvRows || !_lastFinanceCsvRows.length) return alert('لا توجد بيانات للتصدير');
  downloadCsv(`finance-${(financeDateFrom?.value||'all')}-${(financeDateTo?.value||'all')}.csv`, _lastFinanceCsvRows);
});

// ------------------ Additional admin panels ------------------

// Support tickets
async function renderSupportTickets() {
  if (!supportSection) return;
  try {
    const list = await api('/admin/support/tickets');
    if (!Array.isArray(list) || !list.length) {
      supportListEl.innerHTML = '<div class="admin-row">لا توجد تذاكر.</div>';
      return;
    }
    supportListEl.innerHTML = list.map(t => {
      const lastMsg = (t.messages||[]).slice(-1)[0];
      return `
        <div class="admin-row">
          <div style="flex:1">
            <div><strong>#${escapeHtml(t.id)}</strong> ${escapeHtml(t.subject||'')}</div>
            <div><small>${new Date(t.updatedAt||t.createdAt).toLocaleString('ar-EG')}</small></div>
            <div class="note">الحالة: ${escapeHtml(t.status||'')}</div>
            <div class="note">آخر رسالة: ${escapeHtml(lastMsg?.text||'')}</div>
          </div>
          <div style="min-width:160px">
            <button class="btn ghost" data-ticket-reply="${t.id}">رد</button>
            <button class="btn ghost" data-ticket-open="${t.id}">افتح</button>
          </div>
        </div>
      `;
    }).join('');

    // attach handlers
    Array.from(supportListEl.querySelectorAll('[data-ticket-reply]')).forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        const id = btn.getAttribute('data-ticket-reply');
        const text = prompt('نص الرد:');
        if (!text) return;
        await api(`/admin/support/tickets/${id}/message`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text }) });
        await renderSupportTickets();
      });
    });
    Array.from(supportListEl.querySelectorAll('[data-ticket-open]')).forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-ticket-open');
        const list = await api('/admin/support/tickets');
        const t = list.find(x=>x.id===id);
        if (!t) return alert('التذكرة غير موجودة');
        alert(`التذكرة ${t.id}\nالموضوع: ${t.subject}\nالرسائل:\n${(t.messages||[]).map(m=>`${m.by||m.role}: ${m.text}`).join('\n')}`);
      });
    });
  } catch (err) {
    supportListEl.innerHTML = `<div class="admin-row">خطأ: ${escapeHtml(String(err.message||err))}</div>`;
  }
}
if (supportRefreshBtn) supportRefreshBtn.addEventListener('click', () => renderSupportTickets().catch(()=>{}));
if (supportQuestionsRefreshBtn) supportQuestionsRefreshBtn.addEventListener('click', () => renderSupportQuestions().catch(()=>{}));

// Support questions (product Q&A)
async function renderSupportQuestions() {
  if (!supportQuestionsSection) return;
  try {
    const list = await api('/admin/support/questions');
    if (!Array.isArray(list) || !list.length) { supportQuestionsListEl.innerHTML = '<div class="admin-row">لا توجد أسئلة.</div>'; return; }
    supportQuestionsListEl.innerHTML = list.map(q => `
      <div class="admin-row">
        <div style="flex:1">
          <div><strong>${escapeHtml(q.subject||'')}</strong> — ${escapeHtml(q.userEmail||'')}</div>
          <div class="note">التفاصيل: ${escapeHtml(q.message||'')}</div>
          <div class="note">المنتج: ${escapeHtml(q.productId||'')}</div>
        </div>
        <div style="min-width:160px">
          <button class="btn ghost" data-q-reply="${q.id}">رد</button>
        </div>
      </div>
    `).join('');
    Array.from(supportQuestionsListEl.querySelectorAll('[data-q-reply]')).forEach(btn => btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-q-reply');
      const reply = prompt('نص الرد:');
      if (!reply) return;
      await api(`/admin/support/${id}/reply`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ reply }) });
      await renderSupportQuestions();
    }));
  } catch (err) { supportQuestionsListEl.innerHTML = `<div class="admin-row">خطأ: ${escapeHtml(String(err.message||err))}</div>`; }
}

// Returns
async function renderReturns() {
  if (!returnsSection) return;
  try {
    const list = await api('/admin/returns');
    if (!Array.isArray(list) || !list.length) { returnsListEl.innerHTML = '<div class="admin-row">لا توجد طلبات إرجاع.</div>'; return; }
    returnsListEl.innerHTML = list.map(r => `
      <div class="admin-row">
        <div style="flex:1">
          <div><strong>طلب إرجاع #${escapeHtml(r.id)}</strong> لطلب ${escapeHtml(r.orderId)}</div>
          <div class="note">الحالة: ${escapeHtml(r.status||'')}</div>
          <div class="note">السبب: ${escapeHtml(r.reason)}</div>
          <div class="note">التفاصيل: ${escapeHtml(r.details||'')}</div>
        </div>
      </div>
    `).join('');
  } catch (err) { returnsListEl.innerHTML = `<div class="admin-row">خطأ: ${escapeHtml(String(err.message||err))}</div>`; }
}
if (returnsRefreshBtn) returnsRefreshBtn.addEventListener('click', () => renderReturns().catch(()=>{}));

// Coupons
async function renderCoupons() {
  if (!couponsSection) return;
  try {
    const list = await api('/admin/coupons');
    if (!Array.isArray(list) || !list.length) { couponsListEl.innerHTML = '<div class="admin-row">لا توجد كوبونات.</div>'; return; }
    couponsListEl.innerHTML = list.map(c => `
      <div class="admin-row">
        <div style="flex:1">
          <div><strong>${escapeHtml(c.code)}</strong> — ${escapeHtml(String(c.value))} (${escapeHtml(c.type)})</div>
          <div class="note">تاريخ الإنشاء: ${new Date(c.createdAt||'').toLocaleString()}</div>
        </div>
      </div>
    `).join('');
  } catch (err) { couponsListEl.innerHTML = `<div class="admin-row">خطأ: ${escapeHtml(String(err.message||err))}</div>`; }
}
if (createCouponBtn) createCouponBtn.addEventListener('click', async () => {
  try {
    const code = couponCodeInput.value.trim();
    const value = Number(couponValueInput.value||0);
    const type = couponTypeSelect.value;
    await api('/admin/coupons', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ code, value, type }) });
    couponsMsg.textContent = 'تم إنشاء الكوبون.';
    couponCodeInput.value = ''; couponValueInput.value = '';
    await renderCoupons();
  } catch (err) { couponsMsg.textContent = String(err.message||err); }
});

// Promotions
async function renderPromotions() {
  if (!promotionsSection) return;
  try {
    const list = await api('/admin/promotions');
    if (!Array.isArray(list) || !list.length) { promotionsListEl.innerHTML = '<div class="admin-row">لا توجد عروض.</div>'; return; }
    promotionsListEl.innerHTML = list.map(p => `
      <div class="admin-row">
        <div style="flex:1">
          <div><strong>${escapeHtml(p.title)}</strong> — ${escapeHtml(String(p.type))} ${p.value||''}</div>
          <div class="note">${p.start||''} — ${p.end||''}</div>
        </div>
        <div style="min-width:120px"><button class="btn ghost" data-promo-del="${p.id}">حذف</button></div>
      </div>
    `).join('');
    Array.from(promotionsListEl.querySelectorAll('[data-promo-del]')).forEach(btn => btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-promo-del');
      if (!confirm('حذف العرض؟')) return;
      await api(`/admin/promotions/${id}`, { method: 'DELETE' });
      await renderPromotions();
    }));
  } catch (err) { promotionsListEl.innerHTML = `<div class="admin-row">خطأ: ${escapeHtml(String(err.message||err))}</div>`; }
}
if (createPromotionBtn) createPromotionBtn.addEventListener('click', async () => {
  try {
    const title = promotionTitleInput.value.trim();
    const type = promotionTypeInput.value.trim();
    const value = promotionValueInput.value.trim();
    if (!title || !type) return alert('الرجاء إدخال العنوان والنوع');
    await api('/admin/promotions', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ title, type, value }) });
    promotionTitleInput.value = ''; promotionTypeInput.value=''; promotionValueInput.value='';
    await renderPromotions();
  } catch (err) { alert(String(err.message||err)); }
});

// Export products CSV
async function exportProductsCsv() {
  if (!exportProductsSection) return;
  try {
    const res = await fetch(`${API_BASE}/admin/export/products`, { headers: { Authorization: (token?`Bearer ${token}`:'') } });
    if (!res.ok) throw new Error('export_failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `products-${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    exportProductsMsg.textContent = 'تم التحميل.';
  } catch (err) { exportProductsMsg.textContent = String(err.message||err); }
}
if (exportProductsBtn) exportProductsBtn.addEventListener('click', () => exportProductsCsv().catch(()=>{}));

// KPI
async function renderKpi() {
  if (!kpiSection) return;
  try {
    const period = kpiPeriodSelect?.value || 'weekly';
    const data = await api(`/admin/kpi?period=${encodeURIComponent(period)}`);
    kpiTotalOrdersEl.textContent = String(data.totalOrders || 0);
    kpiRevenueEl.textContent = String(data.revenue || 0);
    kpiAovEl.textContent = String(data.aov || 0);
    kpiTopListEl.innerHTML = (data.top||[]).map(p=>`<div>${escapeHtml(p.name||p.id)} — ${p.qty}</div>`).join('');
  } catch (err) { kpiTopListEl.innerHTML = `<div>خطأ: ${escapeHtml(String(err.message||err))}</div>`; }
}
if (kpiRefreshBtn) kpiRefreshBtn.addEventListener('click', () => renderKpi().catch(()=>{}));

// Prescriptions
async function renderPrescriptions() {
  if (!prescriptionsSection) return;
  try {
    const list = await api('/admin/prescriptions');
    if (!Array.isArray(list) || !list.length) { prescriptionsListEl.innerHTML = '<div class="admin-row">لا توجد وصفات.</div>'; return; }
    prescriptionsListEl.innerHTML = list.map(p => `
      <div class="admin-row">
        <div style="flex:1">
          <div><strong>${escapeHtml(p.id)}</strong> — الحالة: ${escapeHtml(p.status || '')}</div>
          <div class="note">العميل: ${escapeHtml(p.customerName||'')} | تاريخ: ${new Date(p.createdAt||'').toLocaleString()}</div>
        </div>
        <div style="min-width:220px">
          <select data-pres-id="${p.id}" class="pres-status-select"><option value="pending">pending</option><option value="approved">approved</option><option value="converted">converted</option></select>
          <button class="btn ghost" data-pres-save="${p.id}">حفظ</button>
          <button class="btn ghost" data-pres-convert="${p.id}">تحويل إلى طلب</button>
        </div>
      </div>
    `).join('');
    Array.from(prescriptionsListEl.querySelectorAll('[data-pres-save]')).forEach(btn => btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-pres-save');
      const sel = prescriptionsListEl.querySelector(`select[data-pres-id="${id}"]`);
      const status = sel?.value;
      if (!status) return;
      await api(`/admin/prescriptions/${id}/status`, { method: 'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status }) });
      await renderPrescriptions();
    }));

    // convert prescription -> order
    Array.from(prescriptionsListEl.querySelectorAll('[data-pres-convert]')).forEach(btn => btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-pres-convert');
      const note = prompt('ملاحظات إضافية للطلب (اختياري)');
      try {
        const res = await api(`/admin/prescriptions/${id}/convert`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ note }) });
        alert('تم تحويل الوصفة إلى طلب: ' + (res.orderId || '—'));
        await renderPrescriptions();
      } catch (err) { alert('خطأ أثناء التحويل: ' + (err.message||err)); }
    }));
  } catch (err) { prescriptionsListEl.innerHTML = `<div class="admin-row">خطأ: ${escapeHtml(String(err.message||err))}</div>`; }
}
if (prescriptionsRefreshBtn) prescriptionsRefreshBtn.addEventListener('click', () => renderPrescriptions().catch(()=>{}));

/* End of admin extras */

