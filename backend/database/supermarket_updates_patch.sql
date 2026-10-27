-- ============================================================================
-- Supermarket Management System (نظام إدارة السوبرماركت المتكامل)
-- File: supermarket_updates_patch.sql
-- الغرض: ملف التعديلات المطلوبة فقط (Migration / Patch Script)
-- لتطبيق التحديثات الجديدة على قاعدة البيانات الحالية دون مسح البيانات السابقة
-- Target: Microsoft SQL Server 2025 / 2022 / 2019
-- ============================================================================

USE SupermarketDB;
GO

PRINT N'>>> بدء تطبيق التعديلات والتحديثات الجديدة على SupermarketDB...';
GO

-- 1. تحديث جدول المستخدمين (Users): إضافة الصلاحيات التفصيلية
-- (إضافة منتجات، تسعير، حذف، جرد، مرتجعات، إدارة الإعدادات)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Users') AND name = N'canAddProduct')
BEGIN
    ALTER TABLE dbo.Users ADD 
        canAddProduct BIT NOT NULL CONSTRAINT DF_Users_canAddProduct DEFAULT 1,
        canEditPrice BIT NOT NULL CONSTRAINT DF_Users_canEditPrice DEFAULT 1,
        canDeleteProduct BIT NOT NULL CONSTRAINT DF_Users_canDeleteProduct DEFAULT 1,
        canAuditInventory BIT NOT NULL CONSTRAINT DF_Users_canAuditInventory DEFAULT 1,
        canProcessReturns BIT NOT NULL CONSTRAINT DF_Users_canProcessReturns DEFAULT 1,
        canManageSettings BIT NOT NULL CONSTRAINT DF_Users_canManageSettings DEFAULT 0;
    PRINT N'✅ تم إضافة أعمدة الصلاحيات التفصيلية لجدول Users بنجاح.';
END
GO

-- تحديث صلاحيات الافتراضية للكاشير والعميل
UPDATE dbo.Users 
SET canAddProduct = 0, canEditPrice = 0, canDeleteProduct = 0, canAuditInventory = 0, canProcessReturns = 1, canManageSettings = 0
WHERE role = N'cashier';

UPDATE dbo.Users 
SET canAddProduct = 0, canEditPrice = 0, canDeleteProduct = 0, canAuditInventory = 0, canProcessReturns = 0, canManageSettings = 0
WHERE role = N'customer';

UPDATE dbo.Users 
SET canAddProduct = 1, canEditPrice = 1, canDeleteProduct = 1, canAuditInventory = 1, canProcessReturns = 1, canManageSettings = 1
WHERE role = N'admin';
GO

-- 2. تحديث جدول الأصناف (Products): إضافة علامة "منتج شائع الاستخدام / الأكثر طلباً"
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Products') AND name = N'isPopular')
BEGIN
    ALTER TABLE dbo.Products ADD 
        isPopular BIT NOT NULL CONSTRAINT DF_Products_isPopular DEFAULT 0,
        salesCount INT NOT NULL CONSTRAINT DF_Products_salesCount DEFAULT 0;
    PRINT N'✅ تم إضافة أعمدة الأصناف الشائعة isPopular و salesCount لجدول Products.';
END
GO

-- تعيين بعض الأصناف كشائعة الاستخدام (مثل الخبز، الحليب، الأرز، الزيت)
UPDATE dbo.Products SET isPopular = 1 WHERE barcode IN (N'628100100101', N'628100100102', N'628300300301', N'628400400401', N'628600600601');
GO

-- 3. تحديث جدول الفواتير (Orders): إضافة الشفت، اسم البائع، وقيمة المرتجع
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Orders') AND name = N'shiftType')
BEGIN
    ALTER TABLE dbo.Orders ADD 
        shiftType NVARCHAR(20) NOT NULL CONSTRAINT DF_Orders_shiftType DEFAULT N'day', -- 'day' (نهاري) أو 'night' (ليلي)
        cashierName NVARCHAR(100) NULL,
        refundedAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_Orders_refundedAmount DEFAULT 0.00;
    PRINT N'✅ تم إضافة أعمدة الشفت shiftType واسم البائع cashierName والمرتجع لجدول Orders.';
END
GO

-- 4. تحديث جدول بنود الفاتورة (OrderItems): إضافة خصم الصنف المنفرد والكمية المرتجعة
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.OrderItems') AND name = N'itemDiscount')
BEGIN
    ALTER TABLE dbo.OrderItems ADD 
        itemDiscount DECIMAL(18,2) NOT NULL CONSTRAINT DF_OrderItems_itemDiscount DEFAULT 0.00,
        returnedQuantity INT NOT NULL CONSTRAINT DF_OrderItems_returnedQuantity DEFAULT 0;
    PRINT N'✅ تم إضافة خصم الصنف المنفرد itemDiscount والكمية المرتجعة لجدول OrderItems.';
END
GO

-- 5. إنشاء جدول إعدادات النظام (SystemSettings) لاسم السوبرماركت واللوجو واللغة والعملة
IF OBJECT_ID(N'dbo.SystemSettings', N'U') IS NULL
BEGIN
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

    INSERT INTO dbo.SystemSettings (supermarketName, logoUrl, defaultLanguage, currency, taxRate, taxNumber, address, phone)
    VALUES (N'سوبرماركت السعادة الحديث', N'', N'ar', N'ج.م', 15.00, N'300123456700003', N'شارع النصر التجاري، الفرع الرئيسي', N'0501112233');

    PRINT N'✅ تم إنشاء جدول إعدادات النظام SystemSettings وتعبئة الإعدادات الافتراضية.';
END
GO

-- 6. إنشاء استعلام / View لمتابعة حركة المبيعات وتوزيع الشفتات
CREATE OR ALTER VIEW dbo.vw_SalesMovementSummary AS
SELECT 
    CAST(createdAt AS DATE) AS SaleDate,
    shiftType,
    COUNT(id) AS TotalOrders,
    SUM(subtotal) AS TotalSubtotal,
    SUM(discountAmount) AS TotalDiscounts,
    SUM(taxAmount) AS TotalTax,
    SUM(totalAmount) AS NetSales,
    SUM(refundedAmount) AS TotalRefunds
FROM dbo.Orders
GROUP BY CAST(createdAt AS DATE), shiftType;
GO

PRINT N'>>> اكتمل تطبيق سكربت التعديلات بنجاح! جميع الحقول والجداول الجديدة أصبحت جاهزة.';
GO
