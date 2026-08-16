/*
  FRIENDS Store - UI Interaction & Mobile Management
  - Pure mobile enhancements scoped strictly for mobile breakpoints
  - Desktop UI remains 100% untouched
*/

(() => {
  // SVG Icons
  const ICONS = {
    hamburger: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`,
    globe: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`,
    home: `<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
    categories: `<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect></svg>`,
    orders: `<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`,
    account: `<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
    close: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
  };

  const getT = (key, fallback) => (window.i18n?.t ? window.i18n.t(key, fallback) : (window.t ? window.t(key, fallback) : fallback));
  const getLang = () => (window.i18n?.getLang ? window.i18n.getLang() : (localStorage.getItem("friends_lang") || "ar"));

  // 1. Setup Mobile Header (Hamburger + Brand + Language Icon)
  const setupMobileHeader = () => {
    const headerInner = document.querySelector(".site-header .header-inner");
    if (!headerInner) return;

    // Check / create Hamburger button
    let hamburger = document.getElementById("mobileHamburger");
    if (!hamburger) {
      hamburger = document.createElement("button");
      hamburger.type = "button";
      hamburger.id = "mobileHamburger";
      hamburger.className = "mobile-hamburger mobile-only";
      hamburger.setAttribute("aria-label", "القائمة");
      hamburger.setAttribute("data-i18n-aria", "nav.menu");
      hamburger.innerHTML = ICONS.hamburger;
      headerInner.insertBefore(hamburger, headerInner.firstChild);
    }

    // Check / create Language Switcher Icon button & popup (placed directly next to brand logo)
    let langWrap = document.getElementById("mobileLangWrap");
    if (!langWrap) {
      langWrap = document.createElement("div");
      langWrap.id = "mobileLangWrap";
      langWrap.className = "mobile-lang-wrap mobile-only";
      langWrap.innerHTML = `
        <button type="button" class="mobile-lang-btn" id="mobileLangBtn" aria-label="تغيير اللغة" data-i18n-aria="action.language">
          ${ICONS.globe}
        </button>
        <div class="mobile-lang-dropdown" id="mobileLangDropdown" style="display:none;">
          <button type="button" class="mobile-lang-opt" data-lang="ar">
            <span>العربية</span>
            <span class="lang-check" data-check="ar">✓</span>
          </button>
          <button type="button" class="mobile-lang-opt" data-lang="en">
            <span>English</span>
            <span class="lang-check" data-check="en">✓</span>
          </button>
        </div>
      `;

      // Insert directly after brand link so it sits right next to the logo
      const brand = headerInner.querySelector(".brand");
      if (brand && brand.nextSibling) {
        headerInner.insertBefore(langWrap, brand.nextSibling);
      } else if (brand) {
        brand.after(langWrap);
      } else {
        headerInner.appendChild(langWrap);
      }
    }

    // Update active check in dropdown
    const updateLangChecks = () => {
      const cur = getLang();
      document.querySelectorAll(".mobile-lang-opt").forEach(btn => {
        const isCur = btn.getAttribute("data-lang") === cur;
        btn.classList.toggle("active", isCur);
        const check = btn.querySelector(".lang-check");
        if (check) check.style.display = isCur ? "inline-block" : "none";
      });
    };
    updateLangChecks();

    // Toggle dropdown
    const langBtn = document.getElementById("mobileLangBtn");
    const langDropdown = document.getElementById("mobileLangDropdown");

    if (langBtn && langDropdown) {
      langBtn.onclick = (e) => {
        e.stopPropagation();
        const isOpen = langDropdown.style.display === "block";
        langDropdown.style.display = isOpen ? "none" : "block";
        if (!isOpen) updateLangChecks();
      };

      langDropdown.querySelectorAll(".mobile-lang-opt").forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const targetLang = btn.getAttribute("data-lang");
          if (targetLang && window.i18n?.setLang) {
            window.i18n.setLang(targetLang);
          }
          langDropdown.style.display = "none";
          updateLangChecks();
        };
      });

      document.addEventListener("click", (e) => {
        if (!langWrap.contains(e.target)) {
          langDropdown.style.display = "none";
        }
      });
    }
  };

  // 2. Setup Mobile Drawer Navigation
  const setupMobileDrawer = () => {
    let backdrop = document.getElementById("mobileMenuBackdrop");
    let drawer = document.getElementById("mobileMenuDrawer");

    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "mobileMenuBackdrop";
      backdrop.className = "mobile-menu-backdrop mobile-only";
      document.body.appendChild(backdrop);
    }

    if (!drawer) {
      drawer = document.createElement("aside");
      drawer.id = "mobileMenuDrawer";
      drawer.className = "mobile-menu-drawer mobile-only";
      drawer.setAttribute("aria-label", "القائمة الجانبية");
      drawer.innerHTML = `
        <div class="mobile-drawer-header">
          <div class="brand">
            <div class="logo">
              <img src="images/friends-logo.svg" alt="Friends Logo" />
            </div>
          </div>
          <button type="button" class="mobile-drawer-close" id="mobileDrawerClose" aria-label="إغلاق القائمة">
            ${ICONS.close}
          </button>
        </div>
        <div class="mobile-drawer-body">
          <nav class="mobile-drawer-nav">
            <a class="mobile-drawer-link" href="index.html">
              <span class="drawer-icon">⌂</span>
              <span data-i18n="nav.home">الرئيسية</span>
            </a>
            <a class="mobile-drawer-link" href="index.html#offers">
              <span class="drawer-icon">%</span>
              <span data-i18n="nav.offers">العروض</span>
            </a>
            <a class="mobile-drawer-link" href="index.html#categories">
              <span class="drawer-icon">▦</span>
              <span data-i18n="nav.categories">الأقسام</span>
            </a>
            <a class="mobile-drawer-link" href="index.html#products">
              <span class="drawer-icon">◫</span>
              <span data-i18n="nav.products">المنتجات</span>
            </a>
            <a class="mobile-drawer-link" href="track.html">
              <span class="drawer-icon">◎</span>
              <span data-i18n="nav.track">تتبع الطلب</span>
            </a>
            <a class="mobile-drawer-link" href="cart.html">
              <span class="drawer-icon">🛒</span>
              <span data-i18n="nav.cart">السلة</span>
            </a>
            <a class="mobile-drawer-link" href="auth.html">
              <span class="drawer-icon">◉</span>
              <span data-i18n="nav.account">حسابي</span>
            </a>
            <a class="mobile-drawer-link" href="terms.html">
              <span class="drawer-icon">📋</span>
              <span data-i18n="terms.title_short">الشروط والأحكام</span>
            </a>
            <a class="mobile-drawer-link" href="admin.html" data-admin-link style="display:none;">
              <span class="drawer-icon">🤖</span>
              <span data-i18n="nav.admin">لوحة الأدمن</span>
            </a>
          </nav>
          <div class="mobile-drawer-footer">
            <div class="mobile-drawer-contact">
              <span data-i18n="label.customer_service">خدمة العملاء:</span>
              <strong>01061806140</strong>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(drawer);
    }

    const openDrawer = () => {
      drawer.classList.add("is-open");
      backdrop.classList.add("is-open");
      document.body.classList.add("menu-open");
    };

    const closeDrawer = () => {
      drawer.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      document.body.classList.remove("menu-open");
    };

    const hamburger = document.getElementById("mobileHamburger");
    const closeBtn = document.getElementById("mobileDrawerClose");

    if (hamburger) hamburger.onclick = openDrawer;
    if (closeBtn) closeBtn.onclick = closeDrawer;
    if (backdrop) backdrop.onclick = closeDrawer;

    drawer.querySelectorAll(".mobile-drawer-link").forEach(link => {
      link.addEventListener("click", () => {
        closeDrawer();
      });
    });
  };

  // 3. Setup Professional Bottom Navigation (4 items with icon top + label bottom)
  const setupBottomNav = () => {
    // Remove old mobile-tabs if exists to prevent duplication
    const oldTabs = document.querySelectorAll(".mobile-tabs");
    oldTabs.forEach(el => el.remove());

    let bottomNav = document.getElementById("mobileBottomNav");
    if (!bottomNav) {
      bottomNav = document.createElement("nav");
      bottomNav.id = "mobileBottomNav";
      bottomNav.className = "mobile-bottom-nav mobile-only";
      bottomNav.setAttribute("aria-label", "التنقل السفلي");
      bottomNav.innerHTML = `
        <a class="mobile-bottom-item" href="index.html" data-tab="home">
          <span class="bottom-icon">${ICONS.home}</span>
          <span class="bottom-label" data-i18n="nav.home">الرئيسية</span>
        </a>
        <a class="mobile-bottom-item" href="index.html#categories" data-tab="categories">
          <span class="bottom-icon">${ICONS.categories}</span>
          <span class="bottom-label" data-i18n="nav.categories">الأقسام</span>
        </a>
        <a class="mobile-bottom-item" href="track.html" data-tab="orders">
          <span class="bottom-icon">${ICONS.orders}</span>
          <span class="bottom-label" data-i18n="nav.orders">الطلبات</span>
        </a>
        <a class="mobile-bottom-item" href="auth.html" data-tab="account">
          <span class="bottom-icon">${ICONS.account}</span>
          <span class="bottom-label" data-i18n="nav.account">حسابي</span>
        </a>
      `;
      document.body.appendChild(bottomNav);
    }

    // Determine and update active tab
    const updateActiveTab = () => {
      const page = document.body.dataset.page || "";
      const path = window.location.pathname;
      const hash = window.location.hash;

      let activeTab = "home";

      if (path.includes("track.html") || page === "track") {
        activeTab = "orders";
      } else if (path.includes("auth.html") || page === "auth") {
        activeTab = "account";
      } else if (path.includes("category.html") || page === "category" || hash === "#categories") {
        activeTab = "categories";
      } else if (path.includes("index.html") || page === "home" || path === "/" || path.endsWith("/")) {
        activeTab = (hash === "#categories") ? "categories" : "home";
      }

      bottomNav.querySelectorAll(".mobile-bottom-item").forEach(item => {
        const tab = item.getAttribute("data-tab");
        const isActive = (tab === activeTab);
        item.classList.toggle("active", isActive);
        if (isActive) {
          item.setAttribute("aria-current", "page");
        } else {
          item.removeAttribute("aria-current");
        }
      });
    };

    updateActiveTab();
    window.addEventListener("hashchange", updateActiveTab);
  };

  // 4. Header scroll interaction
  const initHeaderScroll = () => {
    const header = document.querySelector(".site-header");
    if (!header) return;

    const mq = window.matchMedia("(max-width: 767px)");
    const compactAt = 100;
    const expandAt = 40;
    const minDelta = 6;
    let lastY = window.scrollY;
    let isCompact = false;
    let ticking = false;

    const setCompact = (value) => {
      if (isCompact === value) return;
      isCompact = value;
      header.classList.toggle("is-compact", value);
    };

    const updateHeader = () => {
      const y = window.scrollY;
      const delta = y - lastY;

      if (!mq.matches) {
        setCompact(false);
        lastY = y;
        ticking = false;
        return;
      }

      if (!isCompact && y > compactAt && delta > minDelta) {
        setCompact(true);
      } else if (isCompact && y < expandAt) {
        setCompact(false);
      }

      lastY = y;
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateHeader);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateHeader);
  };

  // Initialize all Mobile UI
  const initUI = () => {
    setupMobileHeader();
    setupMobileDrawer();
    setupBottomNav();
    initHeaderScroll();

    if (window.i18n?.applyTranslations) {
      window.i18n.applyTranslations();
    }
  };

  window.addEventListener("langchange", () => {
    const cur = getLang();
    document.querySelectorAll(".mobile-lang-opt").forEach(btn => {
      const isCur = btn.getAttribute("data-lang") === cur;
      btn.classList.toggle("active", isCur);
      const check = btn.querySelector(".lang-check");
      if (check) check.style.display = isCur ? "inline-block" : "none";
    });
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initUI);
  } else {
    initUI();
  }
})();
