const API_BASE = `${window.location.origin}/api`;
const t = (key, fallback = "") => (window.t ? window.t(key, fallback) : (fallback || key));
const params = new URLSearchParams(window.location.search);
let token = params.get("token") || params.get("orderId") || params.get("code") || "";

const reviewCard = document.getElementById("reviewCard");
const reviewProducts = document.getElementById("reviewProducts");
const reviewOrderInfo = document.getElementById("reviewOrderInfo");
const reviewMsg = document.getElementById("reviewMsg");

let orderData = null;

const formatTemplate = (template, vars = {}) => String(template)
  .replace(/\{(\w+)\}/g, (_, key) => (key in vars ? vars[key] : ""));

const api = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "request_failed");
  return data;
};

const renderProducts = (items) => {
  reviewProducts.innerHTML = items.map(item => `
    <div class="order-card">
      <p><strong>${item.name}</strong> (x${item.qty})</p>
      <label class="input-label">${t("review.product_rating_label", "تقييم المنتج (اختياري)")}</label>
      <select class="select-input" data-field="stars" data-product-id="${item.id}" data-product-name="${item.name}">
        <option value="">${t("review.product_no_rating", "بدون تقييم")}</option>
        <option value="5">5</option>
        <option value="4">4</option>
        <option value="3">3</option>
        <option value="2">2</option>
        <option value="1">1</option>
      </select>
      <label class="input-label">${t("review.product_comment_label", "تعليق المنتج (اختياري)")}</label>
      <input data-field="comment" data-product-id="${item.id}" data-product-name="${item.name}" type="text" placeholder="${t("review.product_comment_placeholder", "رأيك في المنتج")}" />
    </div>
  `).join("");
};

const loadReviewOrder = async () => {
  if (!token) {
    reviewOrderInfo.textContent = t("review.msg.invalid_link", "رابط غير صالح.");
    return;
  }

  try {
    orderData = await api(`/review/${token}`);
    reviewOrderInfo.textContent = formatTemplate(
      t("review.order_info", "طلب رقم {code} - {name}"),
      { code: orderData.orderId.slice(0, 8), name: orderData.customerName }
    );
    renderProducts(orderData.items || []);
    reviewCard.style.display = "block";
  } catch (error) {
    if (error.message === "token_used") {
      reviewOrderInfo.textContent = t("review.msg.token_used", "تم استخدام رابط التقييم من قبل.");
      return;
    }
    reviewOrderInfo.textContent = t("review.msg.expired", "الرابط غير صالح أو منتهي.");
  }
};

const collectProductFeedback = () => {
  const byProduct = new Map();
  document.querySelectorAll("[data-product-id]").forEach(el => {
    const id = Number(el.dataset.productId);
    const name = String(el.dataset.productName || "");
    const field = el.dataset.field;
    if (!byProduct.has(id)) {
      byProduct.set(id, { productId: id, productName: name, stars: 0, comment: "" });
    }
    const item = byProduct.get(id);
    if (field === "stars") item.stars = Number(el.value || 0);
    if (field === "comment") item.comment = el.value.trim();
  });

  return Array.from(byProduct.values()).filter(item => item.stars > 0 || item.comment);
};

const submitReview = async () => {
  reviewMsg.textContent = "";
  const courierRating = Number(document.getElementById("courierRating").value || 0);
  if (courierRating < 1 || courierRating > 5) {
    reviewMsg.textContent = t("review.msg.courier_required", "تقييم المندوب إجباري.");
    return;
  }

  const payload = {
    receivedConfirmed: document.getElementById("receivedConfirmed").value === "yes",
    courierRating,
    courierComment: document.getElementById("courierComment").value.trim(),
    productFeedback: collectProductFeedback()
  };

  try {
    await api(`/review/${token}` , {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    reviewMsg.textContent = t("review.msg.success", "شكرا، تم إرسال تقييمك بنجاح.");
    document.getElementById("submitReviewBtn").disabled = true;
  } catch (error) {
    if (error.message === "token_used") {
      reviewMsg.textContent = t("review.msg.token_used_submit", "هذا الرابط تم استخدامه بالفعل.");
      return;
    }
    reviewMsg.textContent = t("review.msg.failed", "تعذر إرسال التقييم.");
  }
};

document.getElementById("submitReviewBtn").addEventListener("click", () => {
  submitReview().catch(() => {
    reviewMsg.textContent = t("review.msg.unexpected", "خطأ غير متوقع.");
  });
});

loadReviewOrder().catch(() => {
  reviewOrderInfo.textContent = t("review.msg.load_failed", "تعذر تحميل الطلب.");
});
