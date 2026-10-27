-- ============================================================================
-- Supermarket Management System (نظام إدارة السوبرماركت المتكامل)
-- نسخة معدّلة للاستضافة المشتركة MonsterASP.NET (Microsoft SQL Server)
-- ملاحظات التعديل:
--   * حُذف CREATE DATABASE و USE (غير مسموحين في الاستضافة المشتركة).
--   * أنشئ قاعدة البيانات أولاً من لوحة التحكم: Databases > MSSQL > Create.
--   * نفّذ هذا السكربت داخل قاعدتك مباشرة (أداة SQL في اللوحة، أو SSMS متصلاً بقاعدتك).
--   * حُذف COLLATE ...UTF8؛ أعمدة NVARCHAR تدعم العربية بأي Collation.
-- تحذير: السكربت يحذف الجداول القديمة بنفس الأسماء ثم ينشئها من جديد.
-- ============================================================================

SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.vw_SalesMovementSummary', N'V') IS NOT NULL DROP VIEW dbo.vw_SalesMovementSummary;
GO

-- 1. حذف الجداول القديمة إن وجدت بالترتيب الصحيح للمفاتيح الأجنبية
IF OBJECT_ID(N'dbo.SystemSettings', N'U') IS NOT NULL DROP TABLE dbo.SystemSettings;
IF OBJECT_ID(N'dbo.InventoryLogs', N'U') IS NOT NULL DROP TABLE dbo.InventoryLogs;
IF OBJECT_ID(N'dbo.CartItems', N'U') IS NOT NULL DROP TABLE dbo.CartItems;
IF OBJECT_ID(N'dbo.OrderItems', N'U') IS NOT NULL DROP TABLE dbo.OrderItems;
IF OBJECT_ID(N'dbo.Orders', N'U') IS NOT NULL DROP TABLE dbo.Orders;
IF OBJECT_ID(N'dbo.Products', N'U') IS NOT NULL DROP TABLE dbo.Products;
IF OBJECT_ID(N'dbo.Categories', N'U') IS NOT NULL DROP TABLE dbo.Categories;
IF OBJECT_ID(N'dbo.Users', N'U') IS NOT NULL DROP TABLE dbo.Users;
GO

-- ============================================================================
-- 2. إنشاء الجداول
-- ============================================================================

-- جدول المستخدمين (مع صلاحيات دقيقة: إضافة منتجات، تسعير، حذف، جرد، مرتجع، إعدادات)
CREATE TABLE dbo.Users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    email NVARCHAR(150) NOT NULL UNIQUE,
    password NVARCHAR(255) NOT NULL,
    role NVARCHAR(20) NOT NULL CONSTRAINT CHK_Users_Role CHECK (role IN (N'admin', N'cashier', N'customer')),
    phone NVARCHAR(20) NULL,
    address NVARCHAR(255) NULL,
    canAddProduct BIT NOT NULL DEFAULT 0,
    canEditPrice BIT NOT NULL DEFAULT 0,
    canDeleteProduct BIT NOT NULL DEFAULT 0,
    canAuditInventory BIT NOT NULL DEFAULT 0,
    canProcessReturns BIT NOT NULL DEFAULT 0,
    canManageSettings BIT NOT NULL DEFAULT 0,
    isActive BIT NOT NULL DEFAULT 1,
    createdAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- جدول الأقسام والتصنيفات
CREATE TABLE dbo.Categories (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL UNIQUE,
    description NVARCHAR(500) NULL,
    icon NVARCHAR(50) NULL DEFAULT N'fa-shopping-basket',
    displayOrder INT NOT NULL DEFAULT 0,
    isActive BIT NOT NULL DEFAULT 1,
    createdAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- جدول الأصناف والمنتجات (مع تحديد المنتجات الشائعة وعدد مرات البيع)
CREATE TABLE dbo.Products (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(200) NOT NULL,
    barcode NVARCHAR(50) NOT NULL UNIQUE,
    description NVARCHAR(MAX) NULL,
    categoryId INT NOT NULL,
    unit NVARCHAR(30) NOT NULL DEFAULT N'حبة',
    costPrice DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    sellingPrice DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    stockQuantity INT NOT NULL DEFAULT 0,
    minStockThreshold INT NOT NULL DEFAULT 5,
    imageUrl NVARCHAR(500) NULL,
    isPopular BIT NOT NULL DEFAULT 0,
    salesCount INT NOT NULL DEFAULT 0,
    isActive BIT NOT NULL DEFAULT 1,
    createdAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_Products_Categories FOREIGN KEY (categoryId) REFERENCES dbo.Categories(id) ON DELETE CASCADE
);
GO

-- جدول الفواتير (مع الشفت، اسم الكاشير، المرتجعات، والخصومات)
CREATE TABLE dbo.Orders (
    id INT IDENTITY(1,1) PRIMARY KEY,
    invoiceNumber NVARCHAR(50) NOT NULL UNIQUE,
    customerId INT NULL,
    customerName NVARCHAR(100) NULL,
    cashierId INT NULL,
    cashierName NVARCHAR(100) NULL,
    shiftType NVARCHAR(20) NOT NULL DEFAULT N'day' CONSTRAINT CHK_Orders_Shift CHECK (shiftType IN (N'day', N'night')),
    subtotal DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    itemDiscountsTotal DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    discountAmount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    taxAmount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    totalAmount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    refundedAmount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    paymentMethod NVARCHAR(30) NOT NULL DEFAULT N'cash' CONSTRAINT CHK_Orders_Payment CHECK (paymentMethod IN (N'cash', N'card', N'online')),
    paymentStatus NVARCHAR(30) NOT NULL DEFAULT N'paid' CONSTRAINT CHK_Orders_PayStatus CHECK (paymentStatus IN (N'paid', N'refunded', N'partial_refund', N'pending')),
    notes NVARCHAR(500) NULL,
    createdAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_Orders_Customer FOREIGN KEY (customerId) REFERENCES dbo.Users(id),
    CONSTRAINT FK_Orders_Cashier FOREIGN KEY (cashierId) REFERENCES dbo.Users(id)
);
GO

-- جدول تفاصيل بنود الفاتورة (مع خصم الصنف المنفرد والمرتجعات)
CREATE TABLE dbo.OrderItems (
    id INT IDENTITY(1,1) PRIMARY KEY,
    orderId INT NOT NULL,
    productId INT NOT NULL,
    productName NVARCHAR(200) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unitPrice DECIMAL(18,2) NOT NULL,
    itemDiscount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    subtotal DECIMAL(18,2) NOT NULL,
    returnedQuantity INT NOT NULL DEFAULT 0,
    CONSTRAINT FK_OrderItems_Orders FOREIGN KEY (orderId) REFERENCES dbo.Orders(id) ON DELETE CASCADE,
    CONSTRAINT FK_OrderItems_Products FOREIGN KEY (productId) REFERENCES dbo.Products(id)
);
GO

-- جدول سلة مشتريات العميل
CREATE TABLE dbo.CartItems (
    id INT IDENTITY(1,1) PRIMARY KEY,
    customerId INT NOT NULL,
    productId INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    createdAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT UQ_Cart_User_Product UNIQUE (customerId, productId),
    CONSTRAINT FK_Cart_User FOREIGN KEY (customerId) REFERENCES dbo.Users(id) ON DELETE CASCADE,
    CONSTRAINT FK_Cart_Product FOREIGN KEY (productId) REFERENCES dbo.Products(id) ON DELETE CASCADE
);
GO

-- جدول جرد الأصناف وسجل حركات المخزون (تتبع المبيعات، المرتجعات، والتسويات)
CREATE TABLE dbo.InventoryLogs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    productId INT NOT NULL,
    changeType NVARCHAR(30) NOT NULL CONSTRAINT CHK_Inv_Change CHECK (changeType IN (N'IN', N'OUT', N'AUDIT_ADJUSTMENT', N'SALE', N'RETURN')),
    quantityChange INT NOT NULL,
    previousStock INT NOT NULL,
    newStock INT NOT NULL,
    reason NVARCHAR(255) NULL,
    performedByUserId INT NULL,
    createdAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_Inventory_Product FOREIGN KEY (productId) REFERENCES dbo.Products(id) ON DELETE CASCADE,
    CONSTRAINT FK_Inventory_User FOREIGN KEY (performedByUserId) REFERENCES dbo.Users(id)
);
GO

-- جدول إعدادات النظام العامة (الاسم، اللوجو، اللغة، العملة)
CREATE TABLE dbo.SystemSettings (
    id INT IDENTITY(1,1) PRIMARY KEY,
    supermarketName NVARCHAR(150) NOT NULL DEFAULT N'سوبرماركت السعادة الحديث',
    logoUrl NVARCHAR(500) NULL,
    defaultLanguage NVARCHAR(10) NOT NULL DEFAULT N'ar', -- 'ar', 'en', 'fr'
    currency NVARCHAR(20) NOT NULL DEFAULT N'ج.م',        -- 'ج.م', 'ر.س', '$', '€'
    taxRate DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    taxNumber NVARCHAR(50) NULL DEFAULT N'300123456700003',
    address NVARCHAR(255) NULL DEFAULT N'شارع النصر التجاري، الفرع الرئيسي',
    phone NVARCHAR(50) NULL DEFAULT N'0501112233',
    updatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- ============================================================================
-- 3. الفهارس لتحسين الأداء (Indexes)
-- ============================================================================
CREATE INDEX IX_Products_CategoryId ON dbo.Products(categoryId);
CREATE INDEX IX_Products_Barcode ON dbo.Products(barcode);
CREATE INDEX IX_Products_IsPopular ON dbo.Products(isPopular);
CREATE INDEX IX_Orders_CustomerId ON dbo.Orders(customerId);
CREATE INDEX IX_Orders_CashierId ON dbo.Orders(cashierId);
CREATE INDEX IX_Orders_ShiftType ON dbo.Orders(shiftType);
CREATE INDEX IX_Orders_CreatedAt ON dbo.Orders(createdAt);
CREATE INDEX IX_InventoryLogs_ProductId ON dbo.InventoryLogs(productId);
CREATE INDEX IX_InventoryLogs_ChangeType ON dbo.InventoryLogs(changeType);
GO

-- ============================================================================
-- 4. إدخال البيانات التجريبية الأولية
-- ============================================================================

-- إعدادات النظام الافتراضية
INSERT INTO dbo.SystemSettings (supermarketName, logoUrl, defaultLanguage, currency, taxRate, taxNumber, address, phone)
VALUES (N'سوبرماركت السعادة الحديث', N'', N'ar', N'ج.م', 15.00, N'300123456700003', N'شارع النصر التجاري، الفرع الرئيسي', N'0501112233');

-- المستخدمين والصلاحيات
-- كلمة المرور الافتراضية: 123456
INSERT INTO dbo.Users (name, email, password, role, phone, address, canAddProduct, canEditPrice, canDeleteProduct, canAuditInventory, canProcessReturns, canManageSettings, isActive)
VALUES 
(N'أحمد الإداري (المدير العام)', N'admin@supermarket.com', N'$2a$10$w8/0/xOQ1bY46R7pQOce0O7nflU0e8bOcm76h48hY3rM4.XgXz7wO', N'admin', N'0501112233', N'الرياض - حي النخيل', 1, 1, 1, 1, 1, 1, 1),
(N'محمد الكاشير (شفت نهاري)', N'cashier1@supermarket.com', N'$2a$10$w8/0/xOQ1bY46R7pQOce0O7nflU0e8bOcm76h48hY3rM4.XgXz7wO', N'cashier', N'0502223344', N'الرياض - حي الياسمين', 0, 0, 0, 0, 1, 0, 1),
(N'سارة الكاشير (شفت ليلي)', N'cashier2@supermarket.com', N'$2a$10$w8/0/xOQ1bY46R7pQOce0O7nflU0e8bOcm76h48hY3rM4.XgXz7wO', N'cashier', N'0503334455', N'الرياض - حي الملز', 0, 0, 0, 0, 1, 0, 1),
(N'خالد العميل (زبون دائم)', N'khaled@customer.com', N'$2a$10$w8/0/xOQ1bY46R7pQOce0O7nflU0e8bOcm76h48hY3rM4.XgXz7wO', N'customer', N'0559998877', N'الرياض - حي العليا', 0, 0, 0, 0, 0, 0, 1),
(N'نورة العميلة', N'noura@customer.com', N'$2a$10$w8/0/xOQ1bY46R7pQOce0O7nflU0e8bOcm76h48hY3rM4.XgXz7wO', N'customer', N'0557776655', N'الرياض - حي الروضة', 0, 0, 0, 0, 0, 0, 1);
GO

-- الأقسام
INSERT INTO dbo.Categories (name, description, icon, displayOrder)
VALUES 
(N'قسم البقالة والمؤن', N'الأرز، الزيوت، السكر، والحبوب الأساسية', N'fa-shopping-basket', 1),
(N'قسم اللحوم والدواجن', N'لحم عجل، غنم نعيمي، ودجاج طازج ومبرد', N'fa-drumstick-bite', 2),
(N'قسم الألبان والأجبان', N'حليب طازج، أجبان، زبادي وقشطة', N'fa-cheese', 3),
(N'قسم المخبوزات والحلويات', N'خبز توست، كرواسان، كعك وساندوتشات', N'fa-bread-slice', 4),
(N'قسم الخضروات والفواكه', N'خضار طازجة يومياً وفواكه موسمية فاخرة', N'fa-apple-alt', 5),
(N'قسم المشروبات والعصائر', N'مياه معدنية وعصائر طبيعية ومشروبات باردة', N'fa-wine-bottle', 6);
GO

-- الأصناف مع تحديد الشائع (isPopular)
INSERT INTO dbo.Products (name, barcode, description, categoryId, unit, costPrice, sellingPrice, stockQuantity, minStockThreshold, imageUrl, isPopular, salesCount)
VALUES 
(N'أرز بسمتي الشعلان 10 كجم', N'628100100101', N'أرز هندي أبيض فاخر طويل الحبة نخب أول', 1, N'كيس', 65.00, 79.50, 45, 10, N'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', 1, 85),
(N'زيت عافية ذرة نقي 1.5 لتر', N'628100100102', N'زيت ذرة نقي وخفيف لجميع الطبخات', 1, N'حبة', 16.50, 22.00, 60, 15, N'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400', 1, 120),
(N'سكر الأسرة ناعم 5 كجم', N'628100100103', N'سكر قصب طبيعي 100% عالي النقاوة', 1, N'كيس', 18.00, 24.50, 30, 8, N'https://images.unsplash.com/photo-1622484216258-294747ebc6f3?w=400', 1, 95),
(N'تونة قودي لحم خفيف 185 جم', N'628100100104', N'تونة لحم خفيف في زيت دوار الشمس', 1, N'حبة', 5.25, 7.75, 120, 20, N'https://images.unsplash.com/photo-1544378730-8b5104b18790?w=400', 0, 40),
(N'لحم عجل بلدي بالعظم 1 كجم', N'628200200201', N'لحم طازج ومذبوح محلياً بإشراف بيطري', 2, N'كجم', 48.00, 62.00, 18, 5, N'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400', 0, 35),
(N'دجاج التنمية طازج 1000 جم', N'628200200202', N'دجاج وطني مبرد ومغلف بجودة عالية (مخزون منخفض)', 2, N'حبة', 14.00, 18.50, 4, 10, N'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400', 1, 140),
(N'مفروم غنم نعيمي طازج 500 جم', N'628200200203', N'لحم غنم طازج مفروم يومياً', 2, N'طبق', 28.00, 36.00, 22, 6, N'https://images.unsplash.com/photo-1544025162-d76694265947?w=400', 0, 25),
(N'حليب المراعي كامل الدسم 2 لتر', N'628300300301', N'حليب أبقار طازج 100% معزز بالفيتامينات', 3, N'حبة', 9.00, 11.50, 50, 12, N'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400', 1, 210),
(N'جبنة فيتا يونانية أصلية 400 جم', N'628300300302', N'جبنة بيضاء طبيعية غنية بالنكهة', 3, N'علبة', 12.50, 17.00, 25, 5, N'https://images.unsplash.com/photo-1559561853-08451507cbe7?w=400', 0, 50),
(N'زبادي المراعي طازج 170 جم', N'628300300303', N'زبادي نقي طبيعي هضم صحي', 3, N'حبة', 1.20, 1.75, 80, 25, N'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400', 1, 190),
(N'خبز توست أبيض لوزين', N'628400400401', N'توست طري وهش مثالي للفطور والساندوتشات', 4, N'كيس', 3.50, 5.00, 35, 10, N'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', 1, 180),
(N'طماطم محمية طازجة 1 كجم', N'628500500501', N'طماطم مزارع محلية طازجة يومياً', 5, N'كجم', 3.00, 5.50, 65, 15, N'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400', 1, 160),
(N'تفاح أحمر إيطالي 1 كجم', N'628500500502', N'تفاح أحمر سكري حلو ومقرمش (مخزون منخفض)', 5, N'كجم', 6.00, 9.50, 3, 10, N'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400', 0, 45),
(N'مياه هنا كرتون 40 حبة × 330 مل', N'628600600601', N'مياه نقية منخفضة الصوديوم للشرب', 6, N'كرتون', 14.50, 19.50, 100, 20, N'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=400', 1, 130),
(N'عصير برتقال طبيعي ربيع 1 لتر', N'628600600602', N'عصير برتقال طبيعي 100% بدون سكر مضاف', 6, N'حبة', 6.00, 8.50, 2, 8, N'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400', 0, 30);
GO

-- فواتير تجريبية مع الشفت واسم الكاشير
INSERT INTO dbo.Orders (invoiceNumber, customerId, customerName, cashierId, cashierName, shiftType, subtotal, itemDiscountsTotal, discountAmount, taxAmount, totalAmount, refundedAmount, paymentMethod, paymentStatus)
VALUES 
(N'INV-2026-0001', 4, N'خالد العميل', 2, N'محمد الكاشير (شفت نهاري)', N'day', 113.00, 2.00, 5.00, 16.95, 124.95, 0.00, N'card', N'paid'),
(N'INV-2026-0002', 5, N'نورة العميلة', 3, N'سارة الكاشير (شفت ليلي)', N'night', 58.50, 0.00, 0.00, 8.78, 67.28, 0.00, N'cash', N'paid');
GO

-- بنود الفواتير التجريبية
INSERT INTO dbo.OrderItems (orderId, productId, productName, quantity, unitPrice, itemDiscount, subtotal, returnedQuantity)
VALUES 
(1, 1, N'أرز بسمتي الشعلان 10 كجم', 1, 79.50, 2.00, 77.50, 0),
(1, 8, N'حليب المراعي كامل الدسم 2 لتر', 2, 11.50, 0.00, 23.00, 0),
(1, 11, N'خبز توست أبيض لوزين', 2, 5.00, 0.00, 10.00, 0),
(2, 2, N'زيت عافية ذرة نقي 1.5 لتر', 2, 22.00, 0.00, 44.00, 0),
(2, 10, N'زبادي المراعي طازج 170 جم', 4, 1.75, 0.00, 7.00, 0);
GO

-- سجلات الجرد وتدقيق المخزون (شاملة المرتجعات والتسويات)
INSERT INTO dbo.InventoryLogs (productId, changeType, quantityChange, previousStock, newStock, reason, performedByUserId)
VALUES 
(1, N'IN', 50, 0, 50, N'توريد شحنة جديدة من المورد الشعلان', 1),
(6, N'AUDIT_ADJUSTMENT', -6, 10, 4, N'جرد دوري واكتشاف تلفيات تبريد', 1),
(13, N'AUDIT_ADJUSTMENT', -7, 10, 3, N'تسوية فروقات ميزان الخضار والفواكه', 1),
(8, N'RETURN', 1, 49, 50, N'مرتجع من عميل - استبدال عبوة تالفة (فاتورة INV-2026-0001)', 2);
GO

-- تقرير مراقبة حركة المبيعات وتوزيع الشفتات
CREATE OR ALTER VIEW dbo.vw_SalesMovementSummary AS
SELECT 
    CAST(createdAt AS DATE) AS SaleDate,
    shiftType,
    COUNT(id) AS TotalOrders,
    SUM(subtotal) AS TotalSubtotal,
    SUM(discountAmount + itemDiscountsTotal) AS TotalDiscounts,
    SUM(taxAmount) AS TotalTax,
    SUM(totalAmount) AS NetSales,
    SUM(refundedAmount) AS TotalRefunds
FROM dbo.Orders
GROUP BY CAST(createdAt AS DATE), shiftType;
GO

-- تحقق فعلي من النجاح (يعرض عدد الجداول والصفوف)
IF OBJECT_ID(N'dbo.Users', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.Products', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.vw_SalesMovementSummary', N'V') IS NOT NULL
   AND (SELECT COUNT(*) FROM dbo.Products) = 15
BEGIN
    PRINT N'تم إنشاء الجداول والبيانات بنجاح في القاعدة: ' + DB_NAME();
END
ELSE
BEGIN
    PRINT N'فشل التنفيذ: راجع رسائل الخطأ أعلاه.';
END
GO

SELECT
    (SELECT COUNT(*) FROM sys.tables WHERE schema_id = SCHEMA_ID(N'dbo')) AS Tables_Count,
    (SELECT COUNT(*) FROM dbo.Users)      AS Users_Count,
    (SELECT COUNT(*) FROM dbo.Categories) AS Categories_Count,
    (SELECT COUNT(*) FROM dbo.Products)   AS Products_Count,
    (SELECT COUNT(*) FROM dbo.Orders)     AS Orders_Count;
GO
