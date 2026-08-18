<p align="center">
  <img src="images/friends-logo.svg" alt="FRIENDS Store" width="120"/>
</p>

<h1 align="center">FRIENDS · متجر المنتجات الطبية والتجميلية</h1>

<p align="center">
  <strong>For Medical Supplies</strong> · ثقتكم .. مسؤوليتنا الطبية
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Express.js-4.x-black?logo=express" alt="Express"/>
  <img src="https://img.shields.io/badge/Supabase-Cloud-3ECF8E?logo=supabase" alt="Supabase"/>
  <img src="https://img.shields.io/badge/Vercel-Deployed-000?logo=vercel" alt="Vercel"/>
  <img src="https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js" alt="Node"/>
  <img src="https://img.shields.io/badge/License-Private-red" alt="License"/>
</p>

---

## 🏥 عن المشروع

**FRIENDS** هو متجر إلكتروني متكامل للمستلزمات والأجهزة الطبية والتجميلية، مبني من الصفر بـ Express.js و Supabase، ومُنشأ على Vercel. المشروع مش مجرد صفحة عرض — ده **نظام e-commerce كامل** بإدارة طلبات، نظام أدوار وصلاحيات، تذاكر دعم، تقييمات، تتبع طلبات، ولوحة تحكم احترافية.

> **رابط الإنتاج:** [https://repo-ivory-five.vercel.app](https://repo-ivory-five.vercel.app)

---

## 🔥 المميزات الكبيرة

### 1. نظام مصادقة متعدد الأدوار (RBAC)
مش مجرد "admin" و "user" — عندنا 5 أدوار كل واحد بصلاحياته:

| الدور | الصلاحيات |
|------|-----------|
| 🛡️ **Supervisor** | كل حاجة — orders, catalog, reviews, staff, users, finance |
| 📦 **Shipping** | قراءة الطلبات + تحديث الشحن والتوصيل |
| 🎧 **Support** | قراءة الطلبات + الدعم + قراءة التقييمات |
| 💰 **Sales** | قراءة الطلبات + المالية |
| 👤 **User** | حساب عادي للتسوق |

- **bcrypt** لتشفير كلمات السر (salt rounds = 10)
- **JWT** مع توقيع آمن وتواريخ انتهاء
- تسجيل بالبريد الإلكتروني **أو** برقم الهاتف
- دعم OAuth (Google) وتسجيل دخول بالهاتف

### 2. نظام الطلبات الكامل
حياة الطلب من الطلب للتوصيل:

```
قيد المراجعة → تم التأكيد → تم التغليف → تم الشحن → تم التوصيل
                                              ↘ تم الإلغاء
```

- كل تغيير حالة بيُسجل في `statusHistory` مع timestamp
- رفع **صورة إثبات التحويل** للطلب (multer upload)
- رفع **صورة إثبات التوصيل** من فريق الشحن
- كود طلب فريد + ربط برقم هاتف العميل للتتبع

### 3. تتبع الطلبات (Order Tracking)
العميل يقدر يتبع طلبه بدون ما يسجل دخول — بس بكود الطلب + رقم الموبايل. النظام بيرجع:
- حالة الطلب الحالية
- تاريخ كل تغيير في الحالة
- تفاصيل المنتجات والأسعار
- اسم العميل

### 4. نظام التقييمات (Reviews)
- كل طلب له **review token** فريد
- العميل بيكمل تقييم النادل (courier) + تقييم كل منتج على حدة (1-5 نجوم)
- التقييمات مش بتظهر إلا بعد موافقة الـ Supervisor
- لو الـ token استُخدم → `410 Gone` (مفيش تقييم مرتين)

### 5. لوحة تحكم Admin احترافية
- إدارة المنتجات (CRUD كامل) — إضافة، تعديل، حذف، تصنيفات
- إدارة الـ Hero/Banner section للصفحة الرئيسية
- إدارة الطلبات — تغيير الحالة، رفع إثبات التوصيل
- إدارة الأدوار — تعيين وتعديل صلاحيات الموظفين
- إدارة التقييمات — اعتماد أو رفض
- عرض كل المستخدمين
- كل ذلك محمي بـ `requireAuth` + `requirePermission` middleware

### 6. تذاكر الدعم الفني (Support Tickets)
- العميل يفتح تذكرة بـ title + subject + priority
- نظام **chat** داخل التذكرة (رسائل متبادلة بين العميل والدعم)
- الـ Supervisor يقدر يشوف كل التذاكر، والعميل يشوف تذاكره بس
- كل تذكرة ليها status (open / closed) و priority (low / medium / high)

### 7. دعم متعدد اللغات (i18n)
- 🇪🇬 العربية (الأساسية)
- 🇬🇧 English
- تبديل فوري بدون reload
- كل النصوص (nav, titles, labels, announcements) مترجمة

### 8. نظام الكوبونات والخصومات
- كوبونات بنسبة مئوية (percent)
- تحقق من صحة الكوبون عند الطلب
- حساب تلقائي للخصم في الـ cart

### 9. قوائم الرغبات (Wishlists)
- العميل يقدر يحفظ منتجاته المفضلة
- عرض وحفظ في حساب المستخدم

### 10. نظام الإرجاع (Returns)
- تذاكر إرجاع منتجات
- تتبع حالة الطلب المرتجع

---

## 🏗️ البنية التقنية

```
friends.eg.com/
├── server.js              # 1860+ سطر — Express API كامل
├── api/
│   └── index.js           # Vercel serverless entry point
├── public/                # كل ملفات الواجهة الأمامية
│   ├── index.html         # الصفحة الرئيسية
│   ├── admin.html         # لوحة التحكم
│   ├── auth.html          # تسجيل الدخول/حساب جديد
│   ├── cart.html          # سلة المشتريات
│   ├── product.html       # تفاصيل المنتج
│   ├── category.html      # تصفح الأقسام
│   ├── track.html         # تتبع الطلب
│   ├── review.html        # صفحة التقييم
│   ├── terms.html         # الشروط والأحكام
│   ├── css/
│   │   ├── style.css      # التصميم الرئيسي
│   │   └── auth-search.css # استالات صفحات المصادقة
│   ├── js/
│   │   ├── app.js         # منطق التطبيق الرئيسي
│   │   ├── admin.js       # منطق لوحة التحكم
│   │   ├── auth.js        # المصادقة
│   │   ├── i18n.js        # تعدد اللغات
│   │   ├── track.js       # تتبع الطلبات
│   │   ├── review.js      # التقييمات
│   │   ├── ui.js          # مكونات الواجهة
│   │   └── admin-patch.js # تصحيحات الأدمن
│   └── images/            # الشعارات والصور
├── vercel.json            # إعدادات النشر
├── package.json           # التبعيات
└── .env.example           # نموذج متغيرات البيئة
```

### الـ Tech Stack

| الطبقة | التقنية |
|--------|---------|
| **Backend** | Express.js 4.x + Node.js 20 |
| **Database** | Supabase (PostgreSQL) — cloud-hosted |
| **Auth** | bcryptjs + JSON Web Tokens |
| **File Upload** | Multer (disk storage) |
| **Deployment** | Vercel (Serverless Functions) |
| **Frontend** | Vanilla HTML/CSS/JS — no framework overhead |
| **i18n** | Custom translation system (AR + EN) |
| **Realtime** | ws polyfill for Node.js 20 compatibility |

---

## 🔌 الـ API endpoints

### Auth
| Method | Endpoint | الوصف |
|--------|----------|-------|
| `POST` | `/api/auth/login` | تسجيل دخول (email/phone + password) |
| `POST` | `/api/auth/register` | حساب جديد |
| `GET` | `/api/auth/me` | بيانات المستخدم الحالي |
| `POST` | `/api/auth/oauth` | تسجيل دخول بـ Google |
| `POST` | `/api/auth/phone` | تسجيل دخول بالهاتف |

### Store
| Method | Endpoint | الوصف |
|--------|----------|-------|
| `GET` | `/api/products` | كل المنتجات |
| `GET` | `/api/products/:id` | منتج واحد |
| `GET` | `/api/products/:id/reviews` | تقييمات منتج |
| `GET` | `/api/categories` | الأقسام |
| `GET` | `/api/hero` | بانر الصفحة الرئيسية |
| `POST` | `/api/orders` | إنشاء طلب (+ رفع إثبات تحويل) |
| `POST` | `/api/orders/track` | تتبع طلب |
| `GET/POST` | `/api/review/:token` | عرض/إرسال تقييم |

### Admin (محمي بـ JWT + permissions)
| Method | Endpoint | الوصف |
|--------|----------|-------|
| `GET` | `/api/admin/orders` | كل الطلبات |
| `PATCH` | `/api/admin/orders/:id/status` | تغيير حالة طلب |
| `PATCH` | `/api/admin/orders/:id/delivered` | تأكيد توصيل + رفع صورة |
| `GET` | `/api/admin/products` | كل المنتجات |
| `POST` | `/api/admin/products` | إضافة منتج |
| `PUT` | `/api/admin/products/:id` | تعديل منتج |
| `DELETE` | `/api/admin/products/:id` | حذف منتج |
| `GET/POST` | `/api/admin/hero` | إدارة البانر |
| `GET` | `/api/admin/reviews` | كل التقييمات |
| `PATCH` | `/api/admin/reviews/:rid/:pid` | اعتماد/رفض تقييم |
| `GET/POST` | `/api/admin/staff` | إدارة الموظفين |
| `PATCH` | `/api/admin/staff/:id/role` | تغيير دور موظف |
| `GET` | `/api/admin/users` | كل المستخدمين |

### Support
| Method | Endpoint | الوصف |
|--------|----------|-------|
| `POST` | `/api/support/tickets` | فتح تذكرة |
| `GET` | `/api/support/tickets` | تذاكر المستخدم |
| `GET` | `/api/support/tickets/:id` | تفاصيل تذكرة |
| `POST` | `/api/support/tickets/:id/message` | رد على تذكرة |

---

## 🔐 الأمان

- **bcrypt** لتشفير كل كلمات السر (10 salt rounds)
- **JWT** tokens مع توقيع ومدة انتهاء صلاحية
- **RBAC middleware** — كل endpoint محمي بـ `requireAuth` + `requirePermission`
- رفع الملفات محدود بالأنواع المسموحة فقط (صور)
- متغيرات البيئة (Supabase keys, JWT secret) خارج الكود بالكامل
- `.env` في `.gitignore` — مفيش secrets في الريبو

---

## 🚀 التشغيل محلياً

```bash
# 1. Clone
git clone https://github.com/notfound11n1-code/friends.eg.com.git
cd friends.eg.com

# 2. Install dependencies
npm install

# 3. إعداد البيئة
cp .env.example .env
# عدّل القيم في .env:
#   SUPABASE_URL=your_supabase_url
#   SUPABASE_SERVICE_ROLE_KEY=your_service_key
#   JWT_SECRET=your_jwt_secret
#   USE_SUPABASE=true

# 4. Run
npm start
# Server على http://localhost:3000
```

---

## ☁️ النشر على Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**متغيرات البيئة المطلوبة على Vercel:**

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | رابط مشروع Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key من Supabase |
| `JWT_SECRET` | سر التوقيع للـ JWT |
| `USE_SUPABASE` | `true` لتفعيل Supabase |

---

## 🗄️ قاعدة البيانات (Supabase Tables)

| الجدول | الوصف |
|--------|-------|
| `products` | المنتجات (name, price, category, images, description) |
| `hero` | بانر الصفحة الرئيسية (title, subtitle, image, link) |
| `orders` | الطلبات (customer, items, status, totals, reviewToken) |
| `users` | المستخدمين (name, email, phone, role, passwordHash) |
| `reviews` | التقييمات (orderId, courierRating, productFeedback) |
| `tickets` | تذاكر الدعم (title, subject, status, messages) |
| `returns` | طلبات الإرجاع |
| `user_lists` | قوائم الرغبات |

---

## 📊 إحصائيات المشروع

| Metric | Value |
|--------|-------|
| **Backend lines** | 1,860+ |
| **API endpoints** | 30+ |
| **Roles** | 5 (supervisor, shipping, support, sales, user) |
| **Languages** | 2 (Arabic, English) |
| **Dependencies** | 9 (production) |
| **Pages** | 8 (home, admin, auth, cart, product, category, track, review) |
| **Database** | Supabase (PostgreSQL cloud) |
| **Deployment** | Vercel serverless |

---

## 🎨 لقطة من المميزات

- ✅ تسجيل دخول بالبريد **أو** الهاتف
- ✅ OAuth (Google Sign-in)
- ✅ نظام أدوار وصلاحيات متقدم (RBAC)
- ✅ رفع صور إثبات التحويل والتوصيل
- ✅ تتبع طلبات بدون تسجيل دخول
- ✅ نظام تقييمات بـ token فريد لكل طلب
- ✅ تذاكر دعم مع chat متبادل
- ✅ كوبونات وخصومات
- ✅ قوائم رغبات (wishlists)
- ✅ نظام إرجاع منتجات
- ✅ تعدد لغات (AR/EN) بتبديل فوري
- ✅ لوحة تحكم كاملة للـ admin
- ✅ Supabase cloud database
- ✅ WebSocket polyfill لـ Node.js 20
- ✅ Deployment على Vercel

---

## 📜 License

Private — © FRIENDS Store. All rights reserved.

---

<p align="center">
  <strong>ثقتكم .. مسؤوليتنا الطبية</strong>
  <br/>
  <sub>Built with Express.js · Supabase · Vercel</sub>
</p>
