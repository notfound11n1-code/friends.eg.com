
const API_BASE = `${window.location.origin}/api`;
const t = (key, fallback = "") => (window.t ? window.t(key, fallback) : (fallback || key));

// messages
const loginMsg = document.getElementById("loginMsg");
const registerMsg = document.getElementById("registerMsg");

const setNote = (el, text = "", type = "info") => {
  if (!el) return;
  el.textContent = text;
  el.dataset.type = type;
};

// elements used later
const loginEmailEl = document.getElementById("loginEmail");
const loginPasswordEl = document.getElementById("loginPassword");
const loginPasswordLabel = document.getElementById("loginPasswordLabel");
const loginPhoneSection = document.getElementById("loginPhoneSection");
const loginPhoneCodeEl = document.getElementById("loginPhoneCode");
const sendLoginPhoneCodeBtn = document.getElementById("sendLoginPhoneCode");

const registerNameEl = document.getElementById("registerName");
const registerAddressEl = document.getElementById("registerAddress");
const registerCountryEl = document.getElementById("registerCountry");
const registerAltPhoneEl = document.getElementById("registerAltPhone");
const termsAgreeEl = document.getElementById("termsAgree");
const registerEmailEl = document.getElementById("registerEmail");
const registerPasswordEl = document.getElementById("registerPassword");
const registerPasswordLabel = document.getElementById("registerPasswordLabel");
const registerPhoneSection = document.getElementById("registerPhoneSection");
const registerPhoneCodeEl = document.getElementById("registerPhoneCode");
const sendRegisterPhoneCodeBtn = document.getElementById("sendRegisterPhoneCode");

const googleLoginBtn = document.getElementById("googleLogin");
const facebookLoginBtn = document.getElementById("facebookLogin");
const appleLoginBtn = document.getElementById("appleLogin");
const googleRegisterBtn = document.getElementById("googleRegister");
const facebookRegisterBtn = document.getElementById("facebookRegister");
const appleRegisterBtn = document.getElementById("appleRegister");

const profileBox = document.getElementById("profileBox");
const loginBox = document.getElementById("loginBox");
const registerBox = document.getElementById("registerBox");
const profileNameEl = document.getElementById("profileName");
const profileContactEl = document.getElementById("profileContact");
const logoutBtn = document.getElementById("logoutBtn");
const myOrdersList = document.getElementById("myOrdersList");

let myOrders = [];

const getStatusLabel = (status) => t(`status.${status}`, status || "");

const countries = [
  { value: "مصر", ar: "مصر", en: "Egypt" },
  { value: "السعودية", ar: "السعودية", en: "Saudi Arabia" },
  { value: "الإمارات", ar: "الإمارات", en: "United Arab Emirates" },
  { value: "الكويت", ar: "الكويت", en: "Kuwait" },
  { value: "قطر", ar: "قطر", en: "Qatar" },
  { value: "البحرين", ar: "البحرين", en: "Bahrain" },
  { value: "عمان", ar: "عمان", en: "Oman" },
  { value: "الأردن", ar: "الأردن", en: "Jordan" },
  { value: "لبنان", ar: "لبنان", en: "Lebanon" },
  { value: "العراق", ar: "العراق", en: "Iraq" },
  { value: "ليبيا", ar: "ليبيا", en: "Libya" },
  { value: "تونس", ar: "تونس", en: "Tunisia" },
  { value: "الجزائر", ar: "الجزائر", en: "Algeria" },
  { value: "المغرب", ar: "المغرب", en: "Morocco" },
  { value: "السودان", ar: "السودان", en: "Sudan" },
  { value: "اليمن", ar: "اليمن", en: "Yemen" },
  { value: "سوريا", ar: "سوريا", en: "Syria" },
  { value: "فلسطين", ar: "فلسطين", en: "Palestine" },
  { value: "تركيا", ar: "تركيا", en: "Turkey" },
  { value: "الهند", ar: "الهند", en: "India" },
  { value: "باكستان", ar: "باكستان", en: "Pakistan" },
  { value: "إندونيسيا", ar: "إندونيسيا", en: "Indonesia" },
  { value: "ماليزيا", ar: "ماليزيا", en: "Malaysia" },
  { value: "الولايات المتحدة", ar: "الولايات المتحدة", en: "United States" },
  { value: "المملكة المتحدة", ar: "المملكة المتحدة", en: "United Kingdom" },
  { value: "ألمانيا", ar: "ألمانيا", en: "Germany" },
  { value: "فرنسا", ar: "فرنسا", en: "France" },
  { value: "إسبانيا", ar: "إسبانيا", en: "Spain" },
  { value: "إيطاليا", ar: "إيطاليا", en: "Italy" },
  { value: "الصين", ar: "الصين", en: "China" },
  { value: "اليابان", ar: "اليابان", en: "Japan" },
  { value: "كوريا الجنوبية", ar: "كوريا الجنوبية", en: "South Korea" },
  { value: "البرازيل", ar: "البرازيل", en: "Brazil" },
  { value: "أستراليا", ar: "أستراليا", en: "Australia" },
  { value: "كندا", ar: "كندا", en: "Canada" },
  { value: "أخرى", ar: "أخرى", en: "Other" }
];

const renderCountryOptions = () => {
  if (!registerCountryEl) return;
  const lang = window.i18n?.getLang?.() || "ar";
  const current = registerCountryEl.value;
  registerCountryEl.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = t("auth.country_select", "اختر الدولة");
  registerCountryEl.appendChild(placeholder);

  countries.forEach((country) => {
    const option = document.createElement("option");
    option.value = country.value;
    option.textContent = lang === "en" ? country.en : country.ar;
    registerCountryEl.appendChild(option);
  });

  if (current) registerCountryEl.value = current;
};

const renderMyOrders = () => {
  if (!myOrdersList) return;
  myOrdersList.innerHTML = "";
  myOrders.forEach((order) => {
    const li = document.createElement("li");
    li.textContent = `#${order.id.slice(0, 8)} - ${getStatusLabel(order.status)}`;
    myOrdersList.appendChild(li);
  });
};

const setToken = (token, user) => {
  localStorage.setItem("friends_user_token", token);
  localStorage.setItem("friends_user", JSON.stringify(user));
  if (user.role === "admin") {
    localStorage.setItem("friends_admin_token", token);
  }
};

const api = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "request_failed");
  }
  return data;
};

// decide whether input string is phone
const looksLikePhone = (s) => /^\+?\d{8,}$/.test(s);
const normalizePhone = (s = "") => String(s).replace(/[^\d+]/g, "");
const isValidPhone = (s) => looksLikePhone(normalizePhone(s));
const hasTripleName = (name = "") => name.trim().split(/\s+/).filter(Boolean).length >= 3;

// normal login using our backend
const normalLogin = async (email, password) => {
  const data = await api("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  setToken(data.token, data.user);
  window.location.href = data.user.role === "admin" ? "admin.html" : "index.html";
};

async function login() {
  setNote(loginMsg, "");
  const raw = loginEmailEl.value.trim();

  const password = loginPasswordEl.value;
  if (!raw || !password) {
    setNote(loginMsg, t("auth.msg.enter_email_password", "من فضلك أدخل البريد وكلمة المرور."), "error");
    return;
  }
  try {
    await normalLogin(raw, password);
  } catch (error) {
    setNote(loginMsg, t("auth.msg.invalid_credentials", "بيانات الدخول غير صحيحة."), "error");
  }
}

async function register() {
  setNote(registerMsg, "");
  const name = registerNameEl.value.trim();
  const address = registerAddressEl.value.trim();
  const country = registerCountryEl.value.trim();
  const altPhoneRaw = registerAltPhoneEl.value.trim();
  const altPhone = normalizePhone(altPhoneRaw);
  const termsAccepted = !!termsAgreeEl?.checked;
  const raw = registerEmailEl.value.trim();

  if (!hasTripleName(name)) {
    setNote(registerMsg, t("auth.msg.triple_name_required", "من فضلك اكتب الاسم الثلاثي الكامل بدون اختصارات."), "error");
    return;
  }
  if (!address || address.length < 12) {
    setNote(registerMsg, t("auth.msg.address_required", "من فضلك اكتب العنوان التفصيلي بشكل واضح."), "error");
    return;
  }
  if (!country) {
    setNote(registerMsg, t("auth.msg.country_required", "من فضلك اختر الدولة."), "error");
    return;
  }
  if (!isValidPhone(altPhone)) {
    setNote(registerMsg, t("auth.msg.alt_phone_required", "أدخل رقم تواصل إضافي صحيح."), "error");
    return;
  }
  if (!termsAccepted) {
    setNote(registerMsg, t("auth.msg.terms_required", "يجب الموافقة على الشروط والأحكام وسياسة الاسترجاع."), "error");
    return;
  }

  if (looksLikePhone(raw)) {
    if (!phoneConfirmation) {
      setNote(registerMsg, t("auth.msg.send_code_prompt", "اضغط على إرسال رمز ثم أدخل الرمز."), "info");
      return;
    }
    const code = registerPhoneCodeEl.value.trim();
    if (!code) {
      setNote(registerMsg, t("auth.msg.enter_code", "أدخل رمز التحقق."), "error");
      return;
    }
    try {
      const userCred = await phoneConfirmation.confirm(code);
      await phoneLogin(userCred.user.phoneNumber, {
        name,
        address,
        country,
        altPhone,
        termsAccepted: true
      });
    } catch (err) {
      if (err.message === "invalid_alt_phone") {
        setNote(registerMsg, t("auth.msg.alt_phone_invalid", "رقم التواصل الإضافي غير صحيح."), "error");
        return;
      }
      if (err.message === "missing_profile_fields" || err.message === "terms_required") {
        setNote(registerMsg, t("auth.msg.complete_profile", "من فضلك أكمل البيانات ووافق على الشروط."), "error");
        return;
      }
      if (err.message === "phone_exists") {
        setNote(registerMsg, t("auth.msg.phone_exists", "رقم الهاتف مستخدم بالفعل."), "error");
        return;
      }
      setNote(registerMsg, t("auth.msg.phone_register_failed", "تعذر إنشاء الحساب بالهاتف."), "error");
    }
    return;
  }

  const email = raw;
  const password = registerPasswordEl.value;
  if (!email || !password) {
    setNote(registerMsg, t("auth.msg.fill_all_fields", "من فضلك املأ كل الحقول."), "error");
    return;
  }

  try {
    const data = await api("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        address,
        country,
        altPhone,
        termsAccepted: true
      })
    });
    setToken(data.token, data.user);
    window.location.href = "index.html";
  } catch (error) {
    if (error.message === "email_exists") {
      setNote(registerMsg, t("auth.msg.email_exists", "هذا البريد مستخدم بالفعل."), "error");
      return;
    }
    if (error.message === "weak_password") {
      setNote(registerMsg, t("auth.msg.weak_password", "كلمة المرور يجب أن تكون 6 أحرف أو أكثر."), "error");
      return;
    }
    if (error.message === "invalid_alt_phone") {
      setNote(registerMsg, t("auth.msg.alt_phone_invalid", "رقم التواصل الإضافي غير صحيح."), "error");
      return;
    }
    if (error.message === "missing_profile_fields" || error.message === "terms_required") {
      setNote(registerMsg, t("auth.msg.complete_profile", "من فضلك املأ البيانات المطلوبة ووافق على الشروط."), "error");
      return;
    }
    setNote(registerMsg, t("auth.msg.register_failed", "تعذر إنشاء الحساب."), "error");
  }
}

document.getElementById("loginBtn").addEventListener("click", () => {
  login().catch(err => {
    setNote(loginMsg, t("auth.msg.login_error", "حدث خطأ أثناء تسجيل الدخول."), "error");
  });
});

document.getElementById("registerBtn").addEventListener("click", () => {
  register().catch(err => {
    setNote(registerMsg, t("auth.msg.register_error", "حدث خطأ أثناء إنشاء الحساب."), "error");
  });
});

// Tab switching for mobile
const tabLogin = document.getElementById("tabLogin");
const tabRegister = document.getElementById("tabRegister");
const authTabs = document.getElementById("authTabs");

const switchAuthTab = (activeTab) => {
  if (profileBox && profileBox.style.display !== "none") {
    if (authTabs) authTabs.style.display = "none";
    return;
  }
  if (window.innerWidth >= 768) {
    if (loginBox) loginBox.style.display = "";
    if (registerBox) registerBox.style.display = "";
    return;
  }
  if (activeTab === "register") {
    if (loginBox) loginBox.style.display = "none";
    if (registerBox) registerBox.style.display = "block";
    if (tabLogin) { tabLogin.classList.remove("active"); tabLogin.style.background = "transparent"; tabLogin.style.color = "var(--muted)"; }
    if (tabRegister) { tabRegister.classList.add("active"); tabRegister.style.background = "#fff"; tabRegister.style.color = "var(--primary-dark)"; }
  } else {
    if (loginBox) loginBox.style.display = "block";
    if (registerBox) registerBox.style.display = "none";
    if (tabLogin) { tabLogin.classList.add("active"); tabLogin.style.background = "#fff"; tabLogin.style.color = "var(--primary-dark)"; }
    if (tabRegister) { tabRegister.classList.remove("active"); tabRegister.style.background = "transparent"; tabRegister.style.color = "var(--muted)"; }
  }
};

if (tabLogin) tabLogin.onclick = () => switchAuthTab("login");
if (tabRegister) tabRegister.onclick = () => switchAuthTab("register");

// profile handling
async function loadProfile() {
  const token = localStorage.getItem('friends_user_token');
  if (!token) return;
  try {
    const me = await api('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    // show profile
    profileNameEl.textContent = me.name;
    profileContactEl.textContent = me.email || me.phone || '';
    loginBox.style.display = 'none';
    registerBox.style.display = 'none';
    if (authTabs) authTabs.style.display = 'none';
    profileBox.style.display = '';
    // load orders
    myOrders = await api('/orders/my', { headers: { Authorization: `Bearer ${token}` } });
    renderMyOrders();
  } catch (e) {
    console.log('profile load failed', e);
  }
}

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('friends_user_token');
  localStorage.removeItem('friends_user');
  window.location.reload();
});

loadProfile();

renderCountryOptions();

window.addEventListener("langchange", () => {
  renderCountryOptions();
  renderMyOrders();
});

if (window.location.hash === "#register") {
  switchAuthTab("register");
  document.getElementById("registerName").focus();
} else {
  switchAuthTab("login");
  document.getElementById("loginEmail").focus();
}

window.addEventListener("resize", () => {
  if (profileBox && profileBox.style.display !== "none") return;
  if (window.innerWidth >= 768) {
    if (loginBox) loginBox.style.display = "";
    if (registerBox) registerBox.style.display = "";
  } else {
    if (tabRegister?.classList.contains("active")) {
      switchAuthTab("register");
    } else {
      switchAuthTab("login");
    }
  }
});
