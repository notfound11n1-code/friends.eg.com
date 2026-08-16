const API_BASE = `${window.location.origin}/api`;
const t = (key, fallback = "") => (window.t ? window.t(key, fallback) : (fallback || key));
const trackBtn = document.getElementById("trackBtn");
const trackMsg = document.getElementById("trackMsg");
const trackResult = document.getElementById("trackResult");

let pollTimer = null;

const formatTemplate = (template, vars = {}) => String(template)
  .replace(/\{(\w+)\}/g, (_, key) => (key in vars ? vars[key] : ""));
const getStatusLabel = (status) => t(`status.${status}`, status || "");

const STEPS = [
  { key: "pending", label: "تم استلام الطلب", icon: "✓" },
  { key: "confirmed", label: "تم التأكيد", icon: "📋" },
  { key: "preparing", label: "جاري التجهيز", icon: "📦" },
  { key: "shipping", label: "خرج للتوصيل", icon: "🚚" },
  { key: "delivered", label: "تم التسليم", icon: "🎉" }
];

const getStepIndex = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "pending") return 0;
  if (s === "confirmed") return 1;
  if (s === "preparing" || s === "packed") return 2;
  if (s === "shipping" || s === "shipped") return 3;
  if (s === "delivered" || s === "completed") return 4;
  if (s === "cancelled") return -1;
  return 0;
};

const renderOrder = (order) => {
  const orderCode = order.id.slice(0, 8);
  const locale = (window.i18n?.getLang?.() || "ar") === "ar" ? "ar-EG" : "en-US";
  const curStep = getStepIndex(order.status);
  const isCancelled = order.status === "cancelled";

  trackResult.style.display = "block";
  trackResult.innerHTML = `
    <div class="track-card-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--line); padding-bottom:12px; margin-bottom:16px;">
      <div>
        <h4 style="margin:0; font-size:18px; color:var(--primary-dark);">${formatTemplate(t("track.order_number", "طلب #{code}"), { code: orderCode })}</h4>
        <small style="color:var(--muted);">${new Date(order.createdAt || Date.now()).toLocaleDateString(locale, { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</small>
      </div>
      <span class="badge" style="background:${isCancelled ? '#fee2e2' : 'var(--accent-soft)'}; color:${isCancelled ? '#b91c1c' : 'var(--primary-dark)'}; font-size:13px; padding:6px 12px;">
        ${getStatusLabel(order.status)}
      </span>
    </div>

    ${!isCancelled ? `
      <div class="track-stepper" style="display:flex; justify-content:space-between; position:relative; margin:24px 0 28px; padding:0 8px;">
        <div style="position:absolute; top:18px; left:20px; right:20px; height:4px; background:#e2e8f0; z-index:1;">
          <div style="height:100%; width:${Math.max(0, curStep) * 25}%; background:var(--primary); transition:width 0.4s ease;"></div>
        </div>
        ${STEPS.map((step, idx) => {
          const isDone = idx <= curStep;
          const isCurrent = idx === curStep;
          return `
            <div style="position:relative; z-index:2; display:flex; flex-direction:column; align-items:center; text-align:center; max-width:68px;">
              <div style="width:36px; height:36px; border-radius:50%; background:${isDone ? 'var(--primary)' : '#fff'}; border:2px solid ${isDone ? 'var(--primary)' : '#cbd5e1'}; color:${isDone ? '#fff' : '#64748b'}; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700; box-shadow:${isCurrent ? '0 0 0 4px var(--accent-soft)' : 'none'};">
                ${step.icon}
              </div>
              <span style="font-size:11px; margin-top:6px; font-weight:${isCurrent ? '700' : '500'}; color:${isCurrent ? 'var(--primary-dark)' : 'var(--muted)'}; line-height:1.2;">
                ${t(`track.step_${step.key}`, step.label)}
              </span>
            </div>
          `;
        }).join("")}
      </div>
    ` : `
      <div style="padding:12px; background:#fef2f2; border-radius:12px; color:#991b1b; margin-bottom:18px; font-size:14px;">
        ⚠️ هذا الطلب تم إلغاؤه. للتفاصيل يرجى التواصل مع خدمة العملاء.
      </div>
    `}

    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:18px; background:var(--light); padding:14px; border-radius:14px;">
      <div>
        <span style="font-size:12px; color:var(--muted); display:block;">${t("track.total_label", "إجمالي الطلب")}</span>
        <strong style="font-size:18px; color:var(--primary-dark);">${order.totals?.total || 0} ${t("label.currency", "ج.م")}</strong>
      </div>
      <div>
        <span style="font-size:12px; color:var(--muted); display:block;">${t("track.payment_method", "طريقة الدفع")}</span>
        <strong>${order.payment?.method === "vodafone_cash" ? "فودافون كاش / إنستاباي" : "الدفع عند الاستلام"}</strong>
      </div>
    </div>

    <h4 style="margin:16px 0 10px; font-size:15px; color:var(--primary-dark);">${t("track.products_title", "المنتجات")}</h4>
    <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:18px;">
      ${(order.items || []).map(item => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:#fff; border:1px solid var(--line); border-radius:10px;">
          <span style="font-weight:600; font-size:14px;">${item.name}</span>
          <span style="font-size:13px; color:var(--muted);">x${item.qty || item.quantity || 1} &bull; ${((item.price || 0) * (item.qty || item.quantity || 1))} ${t("label.currency", "ج.م")}</span>
        </div>
      `).join("")}
    </div>

    ${Array.isArray(order.statusHistory) && order.statusHistory.length ? `
      <h4 style="margin:16px 0 10px; font-size:15px; color:var(--primary-dark);">${t("track.status_history_title", "سجل التحديثات")}</h4>
      <div style="display:flex; flex-direction:column; gap:6px;">
        ${order.statusHistory.map(s => `
          <div style="font-size:12px; color:var(--muted); display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed var(--line);">
            <span>${new Date(s.at).toLocaleString(locale)}</span>
            <strong style="color:var(--ink);">${getStatusLabel(s.status)}</strong>
          </div>
        `).join("")}
      </div>
    ` : ""}

    ${order.status === "delivered" ? `
      <div style="margin-top:20px; text-align:center;">
        <a class="btn primary" href="review.html?orderId=${order.id}" style="display:inline-flex; align-items:center; gap:8px; text-decoration:none;">
          ⭐ <span>${t("action.review_order", "قيّم تجربتك مع هذا الطلب")}</span>
        </a>
      </div>
    ` : ""}
  `;
};

const fetchOrder = async (orderCode, phone) => {
  const res = await fetch(`${API_BASE}/orders/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderCode, phone })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "request_failed");
  return data;
};

const startTracking = async () => {
  const orderCode = document.getElementById("trackOrderCode").value.trim();
  const phone = document.getElementById("trackPhone").value.trim();
  if (!orderCode || !phone) {
    trackMsg.textContent = t("track.msg.missing_fields", "أدخل رقم الطلب والهاتف.");
    return;
  }

  const load = async () => {
    try {
      const order = await fetchOrder(orderCode, phone);
      renderOrder(order);
      trackMsg.textContent = t("track.msg.updated", "تم تحديث الحالة.");
    } catch {
      trackMsg.textContent = t("track.msg.not_found", "تعذر العثور على الطلب.");
      trackResult.style.display = "none";
    }
  };

  clearInterval(pollTimer);
  await load();
  pollTimer = setInterval(load, 10000);
};

// Check url query params ?code=...&phone=...
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("code")) {
  document.getElementById("trackOrderCode").value = urlParams.get("code");
}
if (urlParams.get("phone")) {
  document.getElementById("trackPhone").value = urlParams.get("phone");
}
if (urlParams.get("code") && urlParams.get("phone")) {
  startTracking();
}

trackBtn.addEventListener("click", () => {
  startTracking().catch(() => {
    trackMsg.textContent = t("track.msg.failed", "تعذر التتبع الآن.");
  });
});
