-- FRIENDS App - Seed Data
-- Run this SQL after creating the schema to populate initial data

-- Insert Hero Slides
INSERT INTO hero (title, text, badge, image, order_index, active) VALUES
('أفضل المنتجات الطبية', 'جودة عالية وأسعار منافسة', 'جديد', 'images/hero-1.jpg', 1, TRUE),
('توصيل سريع وآمن', 'نوصلك المنتج خلال 24 ساعة', 'توصيل سريع', 'images/hero-2.jpg', 2, TRUE),
('أفضل الأسعار المضمونة', 'نضمن لك أقل سعر في السوق', 'ضمان', 'images/hero-3.jpg', 3, TRUE);

-- Insert Sample Products
INSERT INTO products (name, description, price, category, image, images, sku, stock, rating, reviews, featured, active) VALUES
('جهاز قياس ضغط الدم الرقمي', 'جهاز قياس ضغط دم ذكي وسريع وآمن', 450, 'أجهزة قياس', 'images/product-1.jpg', '["images/product-1.jpg"]', 'BP-001', 50, 4.8, 120, TRUE, TRUE),
('كمامات طبية N95', 'كمامات طبية معقمة حماية 99.9%', 5, 'حماية', 'images/product-2.jpg', '["images/product-2.jpg"]', 'MASK-001', 500, 4.7, 300, TRUE, TRUE),
('ميزان حرارة رقمي', 'ميزان حرارة رقمي دقيق بدون تلامس', 150, 'أجهزة قياس', 'images/product-3.jpg', '["images/product-3.jpg"]', 'THERM-001', 75, 4.9, 85, TRUE, TRUE),
('عصابات طبية معقمة', 'عصابات طبية معقمة للجروح', 20, 'إسعافات أولية', 'images/product-4.jpg', '["images/product-4.jpg"]', 'BAND-001', 200, 4.5, 45, FALSE, TRUE),
('محلول معقم للجروح', 'محلول معقم آمن وفعال للجروح', 30, 'إسعافات أولية', 'images/product-5.jpg', '["images/product-5.jpg"]', 'CLEAN-001', 150, 4.6, 67, FALSE, TRUE);

-- Insert Sample Users (Admin Accounts)
-- Password: admin123 (bcrypt hash)
INSERT INTO users (email, name, passwordHash, role, phone, country, active) VALUES
('admin@friends.com', 'Supervisor', '$2a$10$qZqIlsAzQjf.J1s2K3b4Q.OKbVBQq9FBPKh3c5D6E7F8G9H0I1J2', 'supervisor', '+201000000000', 'مصر', TRUE),
('shipping@friends.com', 'Shipping Team', '$2a$10$qZqIlsAzQjf.J1s2K3b4Q.OKbVBQq9FBPKh3c5D6E7F8G9H0I1J2', 'shipping', '+201111111111', 'مصر', TRUE),
('support@friends.local', 'Support Team', '$2a$10$qZqIlsAzQjf.J1s2K3b4Q.OKbVBQq9FBPKh3c5D6E7F8G9H0I1J2', 'support', '+201222222222', 'مصر', TRUE);

-- Insert Sample Coupons
INSERT INTO coupons (code, discount_percent, valid_from, valid_until, active) VALUES
('FRIENDS10', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days', TRUE),
('WELCOME15', 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days', TRUE),
('SUMMER20', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '60 days', TRUE);

-- Note: The admin accounts have password: admin123
-- These can be used to login to the admin panel during development

