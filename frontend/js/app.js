// ==========================================================================
// Supermarket Management System - Modern Client Application Logic
// ==========================================================================

const State = {
    currentUser: null, // Initial: null (requires login, or quick demo login)
    settings: { ...INITIAL_SETTINGS },
    categories: [...INITIAL_CATEGORIES],
    products: [...INITIAL_PRODUCTS],
    users: [...INITIAL_USERS],
    orders: [...INITIAL_ORDERS],
    inventoryLogs: [...INITIAL_INVENTORY_LOGS],
    customerCart: [
        { product: INITIAL_PRODUCTS[0], quantity: 1 },
        { product: INITIAL_PRODUCTS[7], quantity: 2 },
        { product: INITIAL_PRODUCTS[10], quantity: 2 }
    ],
    posCart: [
        { product: INITIAL_PRODUCTS[0], quantity: 1, itemDiscount: 2.00 },
        { product: INITIAL_PRODUCTS[7], quantity: 2, itemDiscount: 0.00 }
    ],
    activeStoreCategory: 'all',
    storeSearchQuery: '',
    posActiveCategory: 'all', // 'all', 'popular', or categoryId
    posSearchQuery: '',
    selectedReturnOrder: null
};

// Initialize Application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    // 1. Load persisted or default settings
    loadPersistedSettings();
    applyLanguage(State.settings.language || 'ar');

    // 2. Setup Navigation and Event Listeners
    initNavigation();
    initQuickDemoUser();

    // 3. Render initial views
    renderCategories();
    renderProducts();
    renderDashboardStats();
    renderSalesAnalytics();
    renderPosScreen();
    renderProductsTable();
    renderInventoryScreen();
    renderOrdersTable();
    renderUsersTable();
    populatePosCustomerDropdown();
    updateCartBadge();
    updateSettingsForm();
    updateShiftUI();
    updateTopbarBrand();
});

// Load settings helper
function loadPersistedSettings() {
    try {
        const saved = localStorage.getItem('supermarket_system_settings');
        if (saved) {
            State.settings = { ...State.settings, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.warn('Could not read localStorage settings', e);
    }
}

function savePersistedSettings() {
    try {
        localStorage.setItem('supermarket_system_settings', JSON.stringify(State.settings));
    } catch (e) {
        console.warn('Could not write localStorage settings', e);
    }
}

// Notification Toast helper
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'info') icon = 'fa-info-circle';

    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Currency format helper
function formatCurrency(amount) {
    const val = Number(amount) || 0;
    return `${val.toFixed(2)} ${State.settings.currency}`;
}

// ==========================================================================
// 1. AUTHENTICATION & ROLE-BASED ACCESS
// ==========================================================================

function initQuickDemoUser() {
    // Default demo startup: Login as Admin so the user immediately explores all screens
    loginUser(State.users[0]);
}

function showLoginOverlay() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.classList.remove('hidden');
}

function hideLoginOverlay() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.classList.add('hidden');
}

function quickLogin(usernameOrRole) {
    let user = State.users.find(u => u.username === usernameOrRole || u.role === usernameOrRole);
    if (!user) user = State.users[0];
    loginUser(user);
}

function handleManualLogin(event) {
    event.preventDefault();
    const usernameInput = document.getElementById('login-username').value.trim().toLowerCase();
    const passwordInput = document.getElementById('login-password').value.trim();

    const user = State.users.find(u => 
        (u.username.toLowerCase() === usernameInput || u.email.toLowerCase() === usernameInput) &&
        (u.password === passwordInput || passwordInput === '123' || passwordInput === '123456')
    );

    if (!user) {
        showToast('اسم المستخدم أو كلمة المرور غير صحيحة', 'error');
        return;
    }

    if (!user.isActive) {
        showToast('عذراً، هذا الحساب معطل حالياً من قِبل إدارة النظام', 'error');
        return;
    }

    loginUser(user);
}

function loginUser(user) {
    State.currentUser = user;
    hideLoginOverlay();

    // Update Header User Profile
    const avatar = document.getElementById('header-user-avatar');
    const nameEl = document.getElementById('header-user-name');
    const roleEl = document.getElementById('header-user-role');

    if (avatar) avatar.textContent = user.name.charAt(0);
    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) {
        let roleTitle = 'مدير (Admin)';
        let roleClass = 'info';
        if (user.role === 'cashier') {
            roleTitle = 'كاشير (Cashier)';
            roleClass = 'primary';
        } else if (user.role === 'customer') {
            roleTitle = 'عميل (Customer)';
            roleClass = 'success';
        }
        roleEl.textContent = roleTitle;
        roleEl.className = `badge ${roleClass} user-info-role`;
    }

    // Apply role-based tabs visibility & route
    applyRoleNavigation(user);

    showToast(`مرحباً بك، ${user.name}! تم تسجيل الدخول بنجاح`, 'success');
}

function handleLogout() {
    State.currentUser = null;
    showToast('تم تسجيل الخروج بنجاح', 'info');
    showLoginOverlay();
}

function applyRoleNavigation(user) {
    const role = user.role;
    const tabDashboard = document.getElementById('tab-li-dashboard');
    const tabSales = document.getElementById('tab-li-sales');
    const tabStore = document.getElementById('tab-li-store');
    const tabPos = document.getElementById('tab-li-pos');
    const tabProducts = document.getElementById('tab-li-products');
    const tabInventory = document.getElementById('tab-li-inventory');
    const tabOrders = document.getElementById('tab-li-orders');
    const tabUsers = document.getElementById('tab-li-users');
    const tabSettings = document.getElementById('tab-li-settings');
    const headerCartBtn = document.getElementById('header-cart-btn');
    const shiftContainer = document.getElementById('topbar-shift-container');

    if (role === 'admin') {
        // Admin sees all tabs
        [tabDashboard, tabSales, tabStore, tabPos, tabProducts, tabInventory, tabOrders, tabUsers, tabSettings].forEach(el => {
            if (el) el.style.display = 'block';
        });
        if (headerCartBtn) headerCartBtn.style.display = 'inline-flex';
        if (shiftContainer) shiftContainer.style.display = 'flex';
        switchTab('tab-dashboard');
    } else if (role === 'cashier') {
        // Cashier sees POS, Sales, Orders/Returns, Store (for reference), products/inventory if permitted
        if (tabDashboard) tabDashboard.style.display = 'none';
        if (tabUsers) tabUsers.style.display = 'none';
        if (tabSettings) tabSettings.style.display = 'none';

        if (tabPos) tabPos.style.display = 'block';
        if (tabSales) tabSales.style.display = 'block';
        if (tabOrders) tabOrders.style.display = 'block';
        if (tabStore) tabStore.style.display = 'block';

        if (tabProducts) tabProducts.style.display = user.canAddProduct ? 'block' : 'none';
        if (tabInventory) tabInventory.style.display = user.canAuditInventory ? 'block' : 'none';

        if (headerCartBtn) headerCartBtn.style.display = 'inline-flex';
        if (shiftContainer) shiftContainer.style.display = 'flex';
        switchTab('tab-pos');
    } else { // customer
        // Customer sees Store, Orders (personal), Cart
        [tabDashboard, tabSales, tabPos, tabProducts, tabInventory, tabUsers, tabSettings].forEach(el => {
            if (el) el.style.display = 'none';
        });
        if (tabStore) tabStore.style.display = 'block';
        if (tabOrders) tabOrders.style.display = 'block';
        if (headerCartBtn) headerCartBtn.style.display = 'inline-flex';
        if (shiftContainer) shiftContainer.style.display = 'none';
        switchTab('tab-store');
    }

    renderOrdersTable();
    updatePosCashierDisplay();
}

// Navigation between tabs
function initNavigation() {
    const tabs = document.querySelectorAll('.nav-tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.target;
            switchTab(target);
        });
    });
}

function switchTab(tabId) {
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.target === tabId);
    });

    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === tabId);
    });

    if (tabId === 'tab-sales') renderSalesAnalytics();
    if (tabId === 'tab-dashboard') renderDashboardStats();
    if (tabId === 'tab-pos') renderPosScreen();
    if (tabId === 'tab-orders') renderOrdersTable();
    if (tabId === 'tab-users') renderUsersTable();
    if (tabId === 'tab-inventory') renderInventoryScreen();
}

// Register New Customer Modal
function openRegisterCustomerModal() {
    document.getElementById('register-customer-modal').classList.add('active');
}

function closeRegisterCustomerModal() {
    document.getElementById('register-customer-modal').classList.remove('active');
}

function handleRegisterCustomer(event) {
    event.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const username = document.getElementById('reg-username').value.trim().toLowerCase();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const address = document.getElementById('reg-address').value.trim();

    // Check uniqueness
    if (State.users.some(u => u.username.toLowerCase() === username || u.email.toLowerCase() === email)) {
        showToast('اسم المستخدم أو البريد مسجل مسبقاً!', 'error');
        return;
    }

    const newCustomer = {
        id: State.users.length + 1,
        name,
        username,
        email,
        password: password || '123',
        role: 'customer',
        phone: phone || '',
        address: address || '',
        canAddProduct: false,
        canEditPrice: false,
        canDeleteProduct: false,
        canAuditInventory: false,
        canProcessReturns: false,
        canManageSettings: false,
        isActive: true
    };

    State.users.push(newCustomer);
    closeRegisterCustomerModal();
    populatePosCustomerDropdown();
    renderUsersTable();

    showToast(`تم تسجيل العميل "${name}" بنجاح!`, 'success');

    // If registered from login overlay, login automatically as customer
    if (!State.currentUser) {
        loginUser(newCustomer);
    }
}

// ==========================================================================
// 2. SHIFTS MANAGEMENT (Day / Night Shift)
// ==========================================================================

function toggleShift() {
    State.settings.currentShift = State.settings.currentShift === 'day' ? 'night' : 'day';
    savePersistedSettings();
    updateShiftUI();
    renderSalesAnalytics();
    showToast(`تم تحويل وقت الشفت إلى: ${State.settings.currentShift === 'day' ? '☀️ الشفت النهاري' : '🌙 الشفت الليلي'}`, 'info');
}

function handlePosShiftChange(shift) {
    State.settings.currentShift = shift;
    savePersistedSettings();
    updateShiftUI();
    renderSalesAnalytics();
}

function updateShiftUI() {
    const shift = State.settings.currentShift || 'day';
    const isDay = shift === 'day';

    const btn = document.getElementById('btn-toggle-shift');
    const lbl = document.getElementById('shift-label-text');
    const posSelect = document.getElementById('pos-shift-select');
    const salesShiftBadge = document.getElementById('sales-current-shift-badge');

    if (btn) {
        btn.className = `shift-badge ${isDay ? 'day' : 'night'}`;
        btn.innerHTML = `<i class="fas ${isDay ? 'fa-sun' : 'fa-moon'}"></i> <span>${isDay ? 'شفت نهاري' : 'شفت ليلي'}</span>`;
    }
    if (posSelect) posSelect.value = shift;
    if (salesShiftBadge) {
        salesShiftBadge.innerHTML = `<i class="fas ${isDay ? 'fa-sun' : 'fa-moon'}"></i> الشفت النشط: ${isDay ? 'نهاري' : 'ليلي'}`;
    }
}

function updatePosCashierDisplay() {
    const badge = document.getElementById('pos-cashier-name-badge');
    if (!badge) return;
    const name = State.currentUser ? State.currentUser.name : 'كاشير عام';
    badge.innerHTML = `<i class="fas fa-user-tag"></i> بائع الفاتورة: <strong>${name}</strong>`;
}

// ==========================================================================
// 3. POS SCREEN (Centered Grid, Categories, Popular, Item & Invoice Discounts)
// ==========================================================================

function renderPosScreen() {
    renderPosCategoriesBar();
    renderPosProductsList();
    renderPosCartGrid();
    updatePosCashierDisplay();
    updateShiftUI();
}

function renderPosCategoriesBar() {
    const bar = document.getElementById('pos-categories-bar');
    if (!bar) return;

    let html = `
        <button class="pos-cat-pill ${State.posActiveCategory === 'all' ? 'active' : ''}" onclick="filterPosCategory('all')">
            <i class="fas fa-th-large"></i> كل الأقسام
        </button>
        <button class="pos-cat-pill popular ${State.posActiveCategory === 'popular' ? 'active' : ''}" onclick="filterPosCategory('popular')">
            <i class="fas fa-star"></i> منتجات شائعة الاستخدام ⭐
        </button>
    `;

    State.categories.forEach(cat => {
        const isActive = State.posActiveCategory === cat.id;
        html += `
            <button class="pos-cat-pill ${isActive ? 'active' : ''}" onclick="filterPosCategory(${cat.id})">
                <i class="fas ${cat.icon}"></i> ${cat.name}
            </button>
        `;
    });

    bar.innerHTML = html;
}

function filterPosCategory(catId) {
    State.posActiveCategory = catId;
    renderPosCategoriesBar();
    renderPosProductsList();
}

function renderPosProductsList() {
    const grid = document.getElementById('pos-products-grid');
    if (!grid) return;

    let items = State.products;

    if (State.posActiveCategory === 'popular') {
        items = items.filter(p => p.isPopular);
    } else if (State.posActiveCategory !== 'all') {
        items = items.filter(p => p.categoryId === State.posActiveCategory);
    }

    if (State.posSearchQuery) {
        items = items.filter(p => 
            p.name.toLowerCase().includes(State.posSearchQuery) ||
            p.barcode.includes(State.posSearchQuery)
        );
    }

    if (items.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #94a3b8;">لا توجد أصناف في هذا القسم</div>`;
        return;
    }

    grid.innerHTML = items.map(p => `
        <div class="product-card" style="cursor: pointer; padding: 0;" onclick="addToPosCart(${p.id})">
            <div style="height: 100px; overflow: hidden; position: relative;">
                <img src="${p.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400'}" alt="${p.name}" style="width: 100%; height: 100%; object-fit: cover;">
                ${p.isPopular ? '<span style="position: absolute; top: 6px; right: 6px; background: #f59e0b; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 800;">⭐ شائع</span>' : ''}
            </div>
            <div class="product-body" style="padding: 0.6rem 0.75rem;">
                <h4 style="font-size: 0.85rem; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${p.name}">${p.name}</h4>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                    <span class="badge ${p.stockQuantity <= p.minStockThreshold ? 'danger' : 'success'}" style="font-size: 0.7rem;">${p.stockQuantity} ${p.unit}</span>
                    <strong style="color: #10b981; font-size: 0.95rem;">${p.sellingPrice.toFixed(2)} ${State.settings.currency}</strong>
                </div>
            </div>
        </div>
    `).join('');
}

function handlePosBarcode(barcode) {
    if (!barcode) return;
    const product = State.products.find(p => p.barcode === barcode.trim());
    if (product) {
        addToPosCart(product.id);
        const input = document.getElementById('pos-barcode-input');
        if (input) input.value = '';
    } else {
        showToast('لم يتم العثور على صنف مطابق لهذا الباركود', 'error');
    }
}

function addToPosCart(productId) {
    const product = State.products.find(p => p.id === productId);
    if (!product) return;

    if (product.stockQuantity <= 0) {
        showToast(`الصنف "${product.name}" نفد من المخزون`, 'error');
        return;
    }

    const existing = State.posCart.find(i => i.product.id === productId);
    if (existing) {
        if (existing.quantity >= product.stockQuantity) {
            showToast(`أقصى كمية متوفرة: ${product.stockQuantity}`, 'error');
            return;
        }
        existing.quantity += 1;
    } else {
        State.posCart.push({ product, quantity: 1, itemDiscount: 0.00 });
    }

    renderPosCartGrid();
}

function updatePosCartQty(productId, delta) {
    const item = State.posCart.find(i => i.product.id === productId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
        State.posCart = State.posCart.filter(i => i.product.id !== productId);
    } else {
        if (newQty > item.product.stockQuantity) {
            showToast(`أقصى كمية متاحة بالمخزن: ${item.product.stockQuantity}`, 'error');
            return;
        }
        item.quantity = newQty;
    }

    renderPosCartGrid();
}

function updatePosCartItemDiscount(productId, discountVal) {
    const item = State.posCart.find(i => i.product.id === productId);
    if (!item) return;

    const disc = Math.max(0, parseFloat(discountVal) || 0);
    const lineGross = item.product.sellingPrice * item.quantity;
    if (disc > lineGross) {
        showToast('لا يمكن أن يتجاوز خصم الصنف قيمته الإجمالية', 'error');
        item.itemDiscount = lineGross;
    } else {
        item.itemDiscount = disc;
    }

    renderPosCartGrid();
}

function removeFromPosCart(productId) {
    State.posCart = State.posCart.filter(i => i.product.id !== productId);
    renderPosCartGrid();
}

function clearPosCart() {
    State.posCart = [];
    renderPosCartGrid();
    showToast('تم إفراغ بنود الفاتورة', 'info');
}

function renderPosCartGrid() {
    const tbody = document.getElementById('pos-cart-table-body');
    if (!tbody) return;

    if (State.posCart.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2.5rem; color: #94a3b8;">
                    <i class="fas fa-barcode" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                    الفاتورة فارغة حالياً. امسح الباركود أو انقر على الأصناف لإضافتها
                </td>
            </tr>
        `;
        updatePosSummary(0, 0);
        return;
    }

    let subtotalGross = 0;
    let totalItemDiscounts = 0;

    tbody.innerHTML = State.posCart.map(item => {
        const lineGross = item.product.sellingPrice * item.quantity;
        const discount = item.itemDiscount || 0;
        const lineNet = Math.max(0, lineGross - discount);

        subtotalGross += lineGross;
        totalItemDiscounts += discount;

        return `
            <tr>
                <td>
                    <strong>${item.product.name}</strong><br>
                    <code style="font-size: 0.75rem; color: #64748b;">${item.product.barcode}</code>
                </td>
                <td><strong>${item.product.sellingPrice.toFixed(2)}</strong></td>
                <td style="text-align: center;">
                    <div style="display: inline-flex; align-items: center; gap: 4px;">
                        <button class="qty-btn" onclick="updatePosCartQty(${item.product.id}, -1)">-</button>
                        <span style="font-weight: 800; min-width: 24px; text-align: center;">${item.quantity}</span>
                        <button class="qty-btn" onclick="updatePosCartQty(${item.product.id}, 1)">+</button>
                    </div>
                </td>
                <td style="text-align: center;">
                    <input type="number" class="item-discount-input" value="${discount}" min="0" step="0.5" 
                        onchange="updatePosCartItemDiscount(${item.product.id}, this.value)" title="خصم خاص بهذا الصنف">
                </td>
                <td>
                    <strong style="color: #10b981;">${lineNet.toFixed(2)}</strong> ${State.settings.currency}
                    ${discount > 0 ? `<br><small style="color: #ef4444; font-size: 0.75rem;">(وفر ${discount.toFixed(2)})</small>` : ''}
                </td>
                <td style="text-align: center;">
                    <button onclick="removeFromPosCart(${item.product.id})" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px 8px;">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    updatePosSummary(subtotalGross, totalItemDiscounts);
}

function updatePosSummary(subtotalGross, totalItemDiscounts) {
    const invoiceDiscountInput = document.getElementById('pos-invoice-discount-input');
    const invoiceDiscount = invoiceDiscountInput ? (parseFloat(invoiceDiscountInput.value) || 0) : 0;

    const subAfterItemDisc = Math.max(0, subtotalGross - totalItemDiscounts);
    const subAfterAllDisc = Math.max(0, subAfterItemDisc - invoiceDiscount);
    const tax = subAfterAllDisc * 0.15;
    const total = subAfterAllDisc + tax;

    const elSub = document.getElementById('pos-subtotal');
    const elItemDisc = document.getElementById('pos-total-item-discounts');
    const elInvDisc = document.getElementById('pos-invoice-discount-display');
    const elTax = document.getElementById('pos-tax');
    const elTotal = document.getElementById('pos-total');

    if (elSub) elSub.textContent = formatCurrency(subtotalGross);
    if (elItemDisc) elItemDisc.textContent = `-${formatCurrency(totalItemDiscounts)}`;
    if (elInvDisc) elInvDisc.textContent = `-${formatCurrency(invoiceDiscount)}`;
    if (elTax) elTax.textContent = formatCurrency(tax);
    if (elTotal) elTotal.textContent = formatCurrency(total);
}

function checkoutPos() {
    if (State.posCart.length === 0) {
        showToast('لا يمكن إصدار فاتورة فارغة!', 'error');
        return;
    }

    const invoiceDiscountInput = document.getElementById('pos-invoice-discount-input');
    const paymentMethodSelect = document.getElementById('pos-payment-method');
    const customerSelect = document.getElementById('pos-customer-select');

    const invoiceDiscount = invoiceDiscountInput ? (parseFloat(invoiceDiscountInput.value) || 0) : 0;
    const paymentMethod = paymentMethodSelect ? paymentMethodSelect.value : 'cash';
    const customerId = customerSelect ? parseInt(customerSelect.value, 10) : null;
    const customer = State.users.find(u => u.id === customerId);

    let subtotalGross = 0;
    let totalItemDiscounts = 0;

    const items = State.posCart.map(ci => {
        const lineGross = ci.product.sellingPrice * ci.quantity;
        const itemDisc = ci.itemDiscount || 0;
        const lineNet = Math.max(0, lineGross - itemDisc);

        subtotalGross += lineGross;
        totalItemDiscounts += itemDisc;

        // Deduct inventory stock & track sales
        ci.product.stockQuantity -= ci.quantity;
        ci.product.salesCount = (ci.product.salesCount || 0) + ci.quantity;

        // Log into InventoryLogs
        State.inventoryLogs.unshift({
            id: Date.now() + Math.random(),
            productName: ci.product.name,
            changeType: 'SALE',
            quantityChange: `-${ci.quantity}`,
            previousStock: ci.product.stockQuantity + ci.quantity,
            newStock: ci.product.stockQuantity,
            reason: `مبيعات كاشير (${State.currentUser ? State.currentUser.name : 'كاشير'}) [شفت ${State.settings.currentShift === 'day' ? 'نهاري' : 'ليلي'}]`,
            date: new Date().toLocaleString('ar-SA')
        });

        return {
            productId: ci.product.id,
            name: ci.product.name,
            quantity: ci.quantity,
            unitPrice: ci.product.sellingPrice,
            itemDiscount: itemDisc,
            subtotal: lineNet,
            returnedQuantity: 0
        };
    });

    const subAfterAllDisc = Math.max(0, subtotalGross - totalItemDiscounts - invoiceDiscount);
    const taxAmount = subAfterAllDisc * 0.15;
    const totalAmount = subAfterAllDisc + taxAmount;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder = {
        id: State.orders.length + 1,
        invoiceNumber,
        customerId: customerId || null,
        customerName: customer ? customer.name : 'عميل نقدي (زائر)',
        cashierId: State.currentUser ? State.currentUser.id : 2,
        cashierName: State.currentUser ? State.currentUser.name : 'محمد الكاشير',
        shiftType: State.settings.currentShift || 'day',
        subtotal: subtotalGross,
        itemDiscountsTotal: totalItemDiscounts,
        discountAmount: invoiceDiscount,
        taxAmount,
        totalAmount,
        refundedAmount: 0.00,
        paymentMethod,
        paymentStatus: 'paid',
        date: new Date().toLocaleString('ar-SA'),
        items
    };

    State.orders.unshift(newOrder);
    State.posCart = [];

    // Reset discount input
    if (invoiceDiscountInput) invoiceDiscountInput.value = 0;

    renderPosCartGrid();
    renderPosProductsList();
    renderProducts();
    renderDashboardStats();
    renderSalesAnalytics();
    renderProductsTable();
    renderInventoryScreen();
    renderOrdersTable();

    showToast(`تمت طباعة وإصدار الفاتورة رقم ${invoiceNumber}`, 'success');
    openInvoiceModal(newOrder);
}

function populatePosCustomerDropdown() {
    const select = document.getElementById('pos-customer-select');
    if (!select) return;

    let html = `<option value="">عميل نقدي (زائر)</option>`;
    State.users.filter(u => u.role === 'customer').forEach(c => {
        html += `<option value="${c.id}">${c.name} (${c.phone || c.email})</option>`;
    });
    select.innerHTML = html;
}

// ==========================================================================
// 4. SALES MOVEMENT & ANALYTICS MONITORING
// ==========================================================================

function renderSalesAnalytics() {
    const dayOrders = State.orders.filter(o => o.shiftType === 'day');
    const nightOrders = State.orders.filter(o => o.shiftType === 'night');

    const daySalesTotal = dayOrders.reduce((sum, o) => sum + (o.paymentStatus === 'refunded' ? 0 : o.totalAmount), 0);
    const nightSalesTotal = nightOrders.reduce((sum, o) => sum + (o.paymentStatus === 'refunded' ? 0 : o.totalAmount), 0);

    const totalRefundsAmount = State.orders.reduce((sum, o) => sum + (o.refundedAmount || (o.paymentStatus === 'refunded' ? o.totalAmount : 0)), 0);
    const refundsCount = State.orders.filter(o => o.paymentStatus === 'refunded' || o.paymentStatus === 'partial_refund' || o.refundedAmount > 0).length;

    const totalDiscounts = State.orders.reduce((sum, o) => sum + (o.discountAmount || 0) + (o.itemDiscountsTotal || 0), 0);

    const elDay = document.getElementById('sales-day-shift-total');
    const elDayCount = document.getElementById('sales-day-shift-count');
    const elNight = document.getElementById('sales-night-shift-total');
    const elNightCount = document.getElementById('sales-night-shift-count');
    const elRef = document.getElementById('sales-returns-total');
    const elRefCount = document.getElementById('sales-returns-count');
    const elDisc = document.getElementById('sales-discounts-total');

    if (elDay) elDay.textContent = formatCurrency(daySalesTotal);
    if (elDayCount) elDayCount.textContent = `${dayOrders.length} فاتورة`;
    if (elNight) elNight.textContent = formatCurrency(nightSalesTotal);
    if (elNightCount) elNightCount.textContent = `${nightOrders.length} فاتورة`;
    if (elRef) elRef.textContent = formatCurrency(totalRefundsAmount);
    if (elRefCount) elRefCount.textContent = `${refundsCount} عملية إرجاع`;
    if (elDisc) elDisc.textContent = formatCurrency(totalDiscounts);

    // Popular Items ranking
    renderSalesPopularProducts();
    renderSalesRecentOrders();
}

function renderSalesPopularProducts() {
    const list = document.getElementById('sales-popular-list');
    if (!list) return;

    const sorted = [...State.products].sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0)).slice(0, 5);
    const maxSales = Math.max(...sorted.map(p => p.salesCount || 1));

    list.innerHTML = sorted.map(p => {
        const pct = Math.round(((p.salesCount || 0) / maxSales) * 100);
        return `
            <div class="popular-item-row">
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 800;">
                        <span>${p.name} ${p.isPopular ? '⭐' : ''}</span>
                        <span style="color: #10b981;">${p.salesCount || 0} عملية بيع</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${pct}%;"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderSalesRecentOrders() {
    const tbody = document.getElementById('sales-recent-orders-list');
    if (!tbody) return;

    tbody.innerHTML = State.orders.slice(0, 6).map(o => `
        <tr>
            <td><strong>${o.invoiceNumber}</strong></td>
            <td>${o.cashierName || 'كاشير'}</td>
            <td><span class="badge ${o.shiftType === 'day' ? 'warning' : 'info'}">${o.shiftType === 'day' ? '☀️ نهاري' : '🌙 ليلي'}</span></td>
            <td><strong>${formatCurrency(o.totalAmount)}</strong></td>
            <td>
                <span class="badge ${o.paymentStatus === 'refunded' ? 'danger' : (o.paymentStatus === 'partial_refund' ? 'warning' : 'success')}">
                    ${o.paymentStatus === 'refunded' ? 'مرتجعة' : (o.paymentStatus === 'partial_refund' ? 'مرتجع جزئي' : 'مدفوعة')}
                </span>
            </td>
        </tr>
    `).join('');
}

// ==========================================================================
// 5. RETURNS & REFUNDS SYSTEM (Full Invoice or Partial Items Return)
// ==========================================================================

function openReturnModal(orderId, defaultType = 'full') {
    const order = State.orders.find(o => o.id === orderId);
    if (!order) return;

    if (order.paymentStatus === 'refunded') {
        showToast('هذه الفاتورة تم إرجاعها بالكامل مسبقاً!', 'error');
        return;
    }

    State.selectedReturnOrder = order;

    document.getElementById('return-order-id').value = order.id;
    document.getElementById('return-invoice-no').textContent = order.invoiceNumber;
    document.getElementById('return-customer-name').textContent = order.customerName || 'عميل نقدي';
    document.getElementById('return-cashier-name').textContent = order.cashierName || 'كاشير';
    document.getElementById('return-type-select').value = defaultType;

    renderReturnItemsTable(order);
    handleReturnTypeChange(defaultType);

    document.getElementById('return-modal').classList.add('active');
}

function closeReturnModal() {
    document.getElementById('return-modal').classList.remove('active');
    State.selectedReturnOrder = null;
}

function handleReturnTypeChange(type) {
    const box = document.getElementById('return-items-selection-box');
    if (box) {
        box.style.display = type === 'partial' ? 'block' : 'none';
    }
}

function renderReturnItemsTable(order) {
    const tbody = document.getElementById('return-items-table-body');
    if (!tbody) return;

    tbody.innerHTML = order.items.map((it, idx) => {
        const availableToReturn = it.quantity - (it.returnedQuantity || 0);
        return `
            <tr>
                <td><strong>${it.name}</strong></td>
                <td>${it.quantity}</td>
                <td>${formatCurrency(it.unitPrice)}</td>
                <td>
                    <input type="number" class="return-qty-input" data-index="${idx}" data-max="${availableToReturn}" 
                        value="${availableToReturn > 0 ? 1 : 0}" min="0" max="${availableToReturn}" 
                        style="width: 70px; padding: 4px; text-align: center; border: 1px solid var(--border); border-radius: 4px;"
                        ${availableToReturn <= 0 ? 'disabled' : ''}>
                </td>
            </tr>
        `;
    }).join('');
}

function handleConfirmReturn(event) {
    event.preventDefault();
    const order = State.selectedReturnOrder;
    if (!order) return;

    const returnType = document.getElementById('return-type-select').value;
    const reason = document.getElementById('return-reason-select').value;

    if (returnType === 'full') {
        // Full Return
        order.items.forEach(it => {
            const product = State.products.find(p => p.id === it.productId);
            const qtyToReturn = it.quantity - (it.returnedQuantity || 0);
            if (product && qtyToReturn > 0) {
                const oldStock = product.stockQuantity;
                product.stockQuantity += qtyToReturn;
                it.returnedQuantity = it.quantity;

                // Log into InventoryLogs
                State.inventoryLogs.unshift({
                    id: Date.now() + Math.random(),
                    productName: product.name,
                    changeType: 'RETURN',
                    quantityChange: `+${qtyToReturn}`,
                    previousStock: oldStock,
                    newStock: product.stockQuantity,
                    reason: `مرتجع كامل الفاتورة ${order.invoiceNumber} - ${reason}`,
                    date: new Date().toLocaleString('ar-SA')
                });
            }
        });

        order.refundedAmount = order.totalAmount;
        order.paymentStatus = 'refunded';
        showToast(`تم إرجاع كامل الفاتورة رقم ${order.invoiceNumber} بنجاح وإعادة البضاعة للمخزون`, 'success');
    } else {
        // Partial Return
        const qtyInputs = document.querySelectorAll('.return-qty-input');
        let anyReturned = false;
        let partialRefundValue = 0;

        qtyInputs.forEach(input => {
            const idx = parseInt(input.dataset.index, 10);
            const returnQty = parseInt(input.value, 10) || 0;
            const item = order.items[idx];

            if (item && returnQty > 0) {
                anyReturned = true;
                item.returnedQuantity = (item.returnedQuantity || 0) + returnQty;
                partialRefundValue += (item.unitPrice * returnQty);

                const product = State.products.find(p => p.id === item.productId);
                if (product) {
                    const oldStock = product.stockQuantity;
                    product.stockQuantity += returnQty;

                    State.inventoryLogs.unshift({
                        id: Date.now() + Math.random(),
                        productName: product.name,
                        changeType: 'RETURN',
                        quantityChange: `+${returnQty}`,
                        previousStock: oldStock,
                        newStock: product.stockQuantity,
                        reason: `مرتجع أصناف من الفاتورة ${order.invoiceNumber} - ${reason}`,
                        date: new Date().toLocaleString('ar-SA')
                    });
                }
            }
        });

        if (!anyReturned) {
            showToast('الرجاء تحديد كمية أكبر من صفر للإرجاع!', 'error');
            return;
        }

        order.refundedAmount = (order.refundedAmount || 0) + partialRefundValue;
        const allItemsReturned = order.items.every(it => it.returnedQuantity >= it.quantity);
        order.paymentStatus = allItemsReturned ? 'refunded' : 'partial_refund';

        showToast(`تم إرجاع الأصناف المحددة بقيمة ${formatCurrency(partialRefundValue)} وتحديث المخزون بنجاح`, 'success');
    }

    closeReturnModal();
    renderOrdersTable();
    renderSalesAnalytics();
    renderInventoryScreen();
    renderProducts();
    renderProductsTable();
    renderPosScreen();
}

// Invoices & Orders Table
function renderOrdersTable() {
    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;

    let ordersList = State.orders;
    // If logged in as customer, filter to only their orders
    if (State.currentUser && State.currentUser.role === 'customer') {
        ordersList = ordersList.filter(o => o.customerId === State.currentUser.id);
    }

    if (ordersList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 2rem; color: #94a3b8;">لا توجد فواتير مسجلة</td></tr>`;
        return;
    }

    tbody.innerHTML = ordersList.map(order => {
        let statusBadge = '<span class="badge success">مدفوعة</span>';
        if (order.paymentStatus === 'refunded') {
            statusBadge = '<span class="badge danger">مرتجعة بالكامل</span>';
        } else if (order.paymentStatus === 'partial_refund') {
            statusBadge = '<span class="badge warning">مرتجع جزئي</span>';
        }

        const canReturn = State.currentUser && (State.currentUser.role === 'admin' || State.currentUser.canProcessReturns);

        return `
            <tr>
                <td><strong>${order.invoiceNumber}</strong></td>
                <td>${order.customerName || 'عميل نقدي'}</td>
                <td>${order.cashierName || 'كاشير'}</td>
                <td><span class="badge ${order.shiftType === 'day' ? 'warning' : 'info'}">${order.shiftType === 'day' ? '☀️ نهاري' : '🌙 ليلي'}</span></td>
                <td><strong>${formatCurrency(order.totalAmount)}</strong></td>
                <td><span class="badge info">${order.paymentMethod === 'card' ? 'بطاقة/مدى' : 'نقداً'}</span></td>
                <td>${statusBadge}</td>
                <td style="font-size: 0.8rem; color: #64748b;">${order.date}</td>
                <td>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                        <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="openInvoiceModalById(${order.id})" title="طباعة ومعاينة الفاتورة">
                            <i class="fas fa-print"></i> معاينة
                        </button>
                        ${canReturn && order.paymentStatus !== 'refunded' ? `
                            <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem; color: #dc2626; border-color: #fca5a5;" onclick="openReturnModal(${order.id}, 'full')" title="إرجاع الفاتورة">
                                <i class="fas fa-undo"></i> إرجاع
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function openInvoiceModalById(orderId) {
    const order = State.orders.find(o => o.id === orderId);
    if (order) openInvoiceModal(order);
}

function openInvoiceModal(order) {
    const modal = document.getElementById('invoice-modal');
    const container = document.getElementById('invoice-receipt-content');

    const logoHtml = State.settings.logoUrl 
        ? `<div style="text-align: center; margin-bottom: 8px;"><img src="${State.settings.logoUrl}" alt="Logo" style="max-height: 55px; max-width: 160px; object-fit: contain;"></div>` 
        : '';

    container.innerHTML = `
        <div class="receipt-header">
            ${logoHtml}
            <h2>${State.settings.supermarketName}</h2>
            <p>الرقم الضريبي: ${State.settings.taxNumber}</p>
            <p>فاتورة ضريبية مبسطة</p>
        </div>
        <div class="receipt-meta">
            <div><strong>رقم الفاتورة:</strong> ${order.invoiceNumber}</div>
            <div><strong>التاريخ:</strong> ${order.date}</div>
            <div><strong>العميل:</strong> ${order.customerName}</div>
            <div><strong>الكاشير/البائع:</strong> ${order.cashierName}</div>
            <div><strong>وقت الشفت:</strong> ${order.shiftType === 'day' ? '☀️ شفت نهاري' : '🌙 شفت ليلي'}</div>
            <div><strong>طريقة الدفع:</strong> ${order.paymentMethod === 'card' ? 'بطاقة بنكية / مدى' : 'نقداً'}</div>
            <div><strong>حالة الفاتورة:</strong> ${order.paymentStatus === 'refunded' ? 'مرتجعة بالكامل' : (order.paymentStatus === 'partial_refund' ? 'مرتجع جزئي' : 'مدفوعة')}</div>
        </div>
        <table class="receipt-table">
            <thead>
                <tr>
                    <th>الصنف</th>
                    <th>الكمية</th>
                    <th>السعر</th>
                    <th>الإجمالي</th>
                </tr>
            </thead>
            <tbody>
                ${order.items.map(it => `
                    <tr>
                        <td>
                            ${it.name}
                            ${it.itemDiscount > 0 ? `<br><small style="color: #ef4444;">(خصم صنف: -${it.itemDiscount.toFixed(2)})</small>` : ''}
                            ${it.returnedQuantity > 0 ? `<br><small style="color: #dc2626;">(مرتجع: ${it.returnedQuantity})</small>` : ''}
                        </td>
                        <td>${it.quantity}</td>
                        <td>${it.unitPrice.toFixed(2)}</td>
                        <td>${it.subtotal.toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="receipt-total">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>المجموع الإجمالي:</span>
                <span>${formatCurrency(order.subtotal)}</span>
            </div>
            ${order.itemDiscountsTotal > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #ef4444;">
                    <span>إجمالي خصومات الأصناف:</span>
                    <span>-${formatCurrency(order.itemDiscountsTotal)}</span>
                </div>
            ` : ''}
            ${order.discountAmount > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #dc2626;">
                    <span>خصم الفاتورة العام:</span>
                    <span>-${formatCurrency(order.discountAmount)}</span>
                </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>ضريبة القيمة المضافة (15%):</span>
                <span>${formatCurrency(order.taxAmount)}</span>
            </div>
            ${order.refundedAmount > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #dc2626; font-weight: 700;">
                    <span>المبلغ المرتجع للعميل:</span>
                    <span>-${formatCurrency(order.refundedAmount)}</span>
                </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 1.15rem; border-top: 1px dashed #64748b; padding-top: 6px; margin-top: 4px;">
                <span>المجموع الصافي:</span>
                <span>${formatCurrency(order.totalAmount - (order.refundedAmount || 0))}</span>
            </div>
        </div>
        <div class="receipt-footer">
            <p>شكراً لتسوقكم من ${State.settings.supermarketName}!</p>
            <p style="margin-top: 4px;">*** نظام سوبرماركت متكامل لـ SQL Server 2025 ***</p>
        </div>
    `;

    modal.classList.add('active');
}

function closeInvoiceModal() {
    document.getElementById('invoice-modal').classList.remove('active');
}

function printCurrentInvoice() {
    window.print();
}

// ==========================================================================
// 6. USERS & GRANULAR PERMISSIONS MANAGEMENT (ADMIN ONLY)
// ==========================================================================

function renderUsersTable() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    tbody.innerHTML = State.users.map(u => {
        let permsList = [];
        if (u.role === 'admin') permsList.push('كامل الصلاحيات (Admin)');
        else {
            if (u.canAddProduct) permsList.push('إضافة أصناف');
            if (u.canEditPrice) permsList.push('تسعير');
            if (u.canDeleteProduct) permsList.push('حذف أصناف');
            if (u.canAuditInventory) permsList.push('جرد');
            if (u.canProcessReturns) permsList.push('مرتجعات');
            if (u.canManageSettings) permsList.push('إعدادات');
        }
        if (permsList.length === 0) permsList.push('مشتريات وتسوق فقط');

        return `
            <tr>
                <td><strong>${u.name}</strong></td>
                <td><code>${u.username}</code><br><small style="color: #64748b;">${u.email}</small></td>
                <td><span class="badge ${u.role === 'admin' ? 'info' : (u.role === 'cashier' ? 'primary' : 'success')}">${u.role}</span></td>
                <td>${u.phone || '-'}</td>
                <td style="font-size: 0.8rem; color: #475569; max-width: 250px;">${permsList.join(' • ')}</td>
                <td>
                    <button class="badge ${u.isActive ? 'success' : 'danger'}" style="cursor: pointer; border: none;" onclick="toggleUserStatus(${u.id})">
                        ${u.isActive ? 'نشط' : 'معطل'}
                    </button>
                </td>
                <td>
                    <div style="display: flex; gap: 4px;">
                        <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="openEditUserModal(${u.id})" title="تعديل الصلاحيات">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                        ${u.role !== 'admin' ? `
                            <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem; color: #ef4444;" onclick="deleteUser(${u.id})" title="حذف المستخدم">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function openAddUserModal() {
    document.getElementById('user-edit-id').value = '';
    document.getElementById('user-modal-title').textContent = 'إضافة مستخدم جديد وتحديد الصلاحيات';
    document.getElementById('user-input-name').value = '';
    document.getElementById('user-input-username').value = '';
    document.getElementById('user-input-email').value = '';
    document.getElementById('user-input-password').value = '123';
    document.getElementById('user-input-role').value = 'cashier';
    document.getElementById('user-input-phone').value = '';

    handleRolePresetChange('cashier');
    document.getElementById('user-modal').classList.add('active');
}

function openEditUserModal(userId) {
    const user = State.users.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('user-edit-id').value = user.id;
    document.getElementById('user-modal-title').textContent = `تعديل صلاحيات: ${user.name}`;
    document.getElementById('user-input-name').value = user.name;
    document.getElementById('user-input-username').value = user.username;
    document.getElementById('user-input-email').value = user.email;
    document.getElementById('user-input-password').value = user.password;
    document.getElementById('user-input-role').value = user.role;
    document.getElementById('user-input-phone').value = user.phone || '';

    document.getElementById('perm-add-product').checked = !!user.canAddProduct;
    document.getElementById('perm-edit-price').checked = !!user.canEditPrice;
    document.getElementById('perm-delete-product').checked = !!user.canDeleteProduct;
    document.getElementById('perm-audit-inventory').checked = !!user.canAuditInventory;
    document.getElementById('perm-process-returns').checked = !!user.canProcessReturns;
    document.getElementById('perm-manage-settings').checked = !!user.canManageSettings;

    document.getElementById('user-modal').classList.add('active');
}

function closeUserModal() {
    document.getElementById('user-modal').classList.remove('active');
}

function handleRolePresetChange(role) {
    const isAdmin = role === 'admin';
    const isCashier = role === 'cashier';

    document.getElementById('perm-add-product').checked = isAdmin;
    document.getElementById('perm-edit-price').checked = isAdmin;
    document.getElementById('perm-delete-product').checked = isAdmin;
    document.getElementById('perm-audit-inventory').checked = isAdmin;
    document.getElementById('perm-process-returns').checked = isAdmin || isCashier;
    document.getElementById('perm-manage-settings').checked = isAdmin;
}

function handleSaveUser(event) {
    event.preventDefault();
    const editId = document.getElementById('user-edit-id').value;
    const name = document.getElementById('user-input-name').value.trim();
    const username = document.getElementById('user-input-username').value.trim().toLowerCase();
    const email = document.getElementById('user-input-email').value.trim().toLowerCase();
    const password = document.getElementById('user-input-password').value.trim();
    const role = document.getElementById('user-input-role').value;
    const phone = document.getElementById('user-input-phone').value.trim();

    const canAddProduct = document.getElementById('perm-add-product').checked;
    const canEditPrice = document.getElementById('perm-edit-price').checked;
    const canDeleteProduct = document.getElementById('perm-delete-product').checked;
    const canAuditInventory = document.getElementById('perm-audit-inventory').checked;
    const canProcessReturns = document.getElementById('perm-process-returns').checked;
    const canManageSettings = document.getElementById('perm-manage-settings').checked;

    if (editId) {
        // Edit existing
        const user = State.users.find(u => u.id === parseInt(editId, 10));
        if (user) {
            user.name = name;
            user.username = username;
            user.email = email;
            user.password = password;
            user.role = role;
            user.phone = phone;
            user.canAddProduct = canAddProduct;
            user.canEditPrice = canEditPrice;
            user.canDeleteProduct = canDeleteProduct;
            user.canAuditInventory = canAuditInventory;
            user.canProcessReturns = canProcessReturns;
            user.canManageSettings = canManageSettings;
            showToast(`تم تحديث بيانات وصلاحيات المستخدم "${name}" بنجاح!`, 'success');
        }
    } else {
        // Add new
        if (State.users.some(u => u.username === username || u.email === email)) {
            showToast('اسم المستخدم أو البريد مسجل مسبقاً!', 'error');
            return;
        }

        const newUser = {
            id: State.users.length + 1,
            name,
            username,
            email,
            password,
            role,
            phone,
            address: '',
            canAddProduct,
            canEditPrice,
            canDeleteProduct,
            canAuditInventory,
            canProcessReturns,
            canManageSettings,
            isActive: true
        };
        State.users.push(newUser);
        showToast(`تمت إضافة المستخدم "${name}" بنجاح!`, 'success');
    }

    closeUserModal();
    renderUsersTable();
    populatePosCustomerDropdown();
}

function toggleUserStatus(userId) {
    const user = State.users.find(u => u.id === userId);
    if (!user) return;
    if (user.role === 'admin' && State.currentUser && State.currentUser.id === user.id) {
        showToast('لا يمكنك تعطيل حسابك الإداري الحالي!', 'error');
        return;
    }
    user.isActive = !user.isActive;
    renderUsersTable();
    showToast(`تم ${user.isActive ? 'تفعيل' : 'تعطيل'} حساب "${user.name}"`, 'info');
}

function deleteUser(userId) {
    const user = State.users.find(u => u.id === userId);
    if (!user) return;
    if (user.role === 'admin') {
        showToast('لا يمكن حذف حساب المدير العام!', 'error');
        return;
    }
    if (confirm(`هل أنت متأكد من حذف المستخدم "${user.name}" نهائياً من النظام؟`)) {
        State.users = State.users.filter(u => u.id !== userId);
        renderUsersTable();
        populatePosCustomerDropdown();
        showToast('تم حذف المستخدم بنجاح', 'success');
    }
}

// ==========================================================================
// 7. SYSTEM SETTINGS (Name, Logo, Language, Currency)
// ==========================================================================

function updateSettingsForm() {
    const nameInput = document.getElementById('setting-supermarket-name');
    const logoInput = document.getElementById('setting-logo-url');
    const langSelect = document.getElementById('setting-language');
    const currSelect = document.getElementById('setting-currency');
    const taxNumInput = document.getElementById('setting-tax-number');
    const phoneInput = document.getElementById('setting-phone');
    const addrInput = document.getElementById('setting-address');

    if (nameInput) nameInput.value = State.settings.supermarketName;
    if (logoInput) logoInput.value = State.settings.logoUrl || '';
    if (langSelect) langSelect.value = State.settings.language || 'ar';
    if (currSelect) currSelect.value = State.settings.currency || 'ج.م';
    if (taxNumInput) taxNumInput.value = State.settings.taxNumber || '';
    if (phoneInput) phoneInput.value = State.settings.phone || '';
    if (addrInput) addrInput.value = State.settings.address || '';

    updateLogoPreview(State.settings.logoUrl);
}

function updateLogoPreview(url) {
    const img = document.getElementById('logo-preview-img');
    const icon = document.getElementById('logo-placeholder-icon');
    if (!img || !icon) return;

    if (url && url.trim().length > 5) {
        img.src = url.trim();
        img.style.display = 'block';
        icon.style.display = 'none';
    } else {
        img.style.display = 'none';
        icon.style.display = 'block';
    }
}

function updateTopbarBrand() {
    const brandName = document.getElementById('topbar-brand-name');
    const logoBox = document.getElementById('topbar-logo-icon');

    if (brandName) brandName.textContent = State.settings.supermarketName;
    if (logoBox) {
        if (State.settings.logoUrl && State.settings.logoUrl.trim().length > 5) {
            logoBox.innerHTML = `<img src="${State.settings.logoUrl}" alt="Logo" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`;
        } else {
            logoBox.innerHTML = `<i class="fas fa-store-alt"></i>`;
        }
    }
}

function handleSaveSettings(event) {
    event.preventDefault();

    const name = document.getElementById('setting-supermarket-name').value.trim();
    const logoUrl = document.getElementById('setting-logo-url').value.trim();
    const language = document.getElementById('setting-language').value;
    const currency = document.getElementById('setting-currency').value;
    const taxNumber = document.getElementById('setting-tax-number').value.trim();
    const phone = document.getElementById('setting-phone').value.trim();
    const address = document.getElementById('setting-address').value.trim();

    State.settings.supermarketName = name || 'سوبرماركت السعادة الحديث';
    State.settings.logoUrl = logoUrl;
    State.settings.language = language;
    State.settings.currency = currency;
    State.settings.taxNumber = taxNumber;
    State.settings.phone = phone;
    State.settings.address = address;

    savePersistedSettings();

    // Live update UI across whole app
    applyLanguage(language);
    updateTopbarBrand();
    updateCurrencyTags();
    renderDashboardStats();
    renderSalesAnalytics();
    renderPosScreen();
    renderProducts();
    renderProductsTable();
    renderInventoryScreen();
    renderOrdersTable();

    showToast('تم حفظ وتطبيق جميع الإعدادات فورياً بنجاح!', 'success');
}

function updateCurrencyTags() {
    document.querySelectorAll('.currency-tag').forEach(el => {
        el.textContent = State.settings.currency;
    });
}

function applyLanguage(lang) {
    const t = TRANSLATIONS[lang] || TRANSLATIONS.ar;
    document.documentElement.lang = lang;
    document.documentElement.dir = t.dir;
    document.body.dir = t.dir;

    // Translate tab labels
    setElemText('nav-text-dashboard', t.dashboard);
    setElemText('nav-text-sales', t.salesMovement);
    setElemText('nav-text-store', t.customerStore);
    setElemText('nav-text-pos', t.posCashier);
    setElemText('nav-text-products', t.productsEntry);
    setElemText('nav-text-inventory', t.inventoryAudit);
    setElemText('nav-text-orders', t.ordersInvoices);
    setElemText('nav-text-users', t.usersPermissions);
    setElemText('nav-text-settings', t.systemSettings);
    setElemText('btn-lbl-logout', t.logout);
    setElemText('nav-lbl-cart', t.customerStore);

    // Translate login
    setElemText('login-title-text', t.loginTitle);
    setElemText('login-subtitle-text', t.loginSubtitle);
    setElemText('lbl-quick-login', t.quickLoginAs);
    setElemText('lbl-login-username', t.usernameOrEmail);
    setElemText('lbl-login-password', t.password);
    setElemText('btn-login-submit', t.loginBtn);
    setElemText('btn-open-register', t.registerNewCustomerBtn);
}

function setElemText(id, text) {
    const el = document.getElementById(id);
    if (el && text) el.textContent = text;
}

// ==========================================================================
// 8. PRODUCTS MANAGEMENT (Add, Table, Categories)
// ==========================================================================

function renderCategories() {
    const container = document.getElementById('category-pills');
    if (!container) return;

    let html = `
        <button class="pill-btn ${State.activeStoreCategory === 'all' ? 'active' : ''}" onclick="filterStoreByCategory('all')">
            <i class="fas fa-th-large"></i> كل الأقسام
        </button>
    `;

    State.categories.forEach(cat => {
        html += `
            <button class="pill-btn ${State.activeStoreCategory === cat.id ? 'active' : ''}" onclick="filterStoreByCategory(${cat.id})">
                <i class="fas ${cat.icon}"></i> ${cat.name}
            </button>
        `;
    });

    container.innerHTML = html;

    // Also populate category dropdown in add product form
    const select = document.getElementById('prod-category-select');
    if (select) {
        select.innerHTML = State.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
}

function filterStoreByCategory(catId) {
    State.activeStoreCategory = catId;
    renderCategories();
    renderProducts();
}

function handleSearch(query) {
    State.storeSearchQuery = query.trim().toLowerCase();
    renderProducts();
}

function renderProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    let filtered = State.products;

    if (State.activeStoreCategory !== 'all') {
        filtered = filtered.filter(p => p.categoryId === State.activeStoreCategory);
    }

    if (State.storeSearchQuery) {
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(State.storeSearchQuery) ||
            p.barcode.includes(State.storeSearchQuery) ||
            p.description.toLowerCase().includes(State.storeSearchQuery)
        );
    }

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: white; border-radius: 12px;">
                <i class="fas fa-search" style="font-size: 2.5rem; color: #94a3b8; margin-bottom: 1rem;"></i>
                <h3 style="color: #64748b;">لا توجد أصناف مطابقة للبحث أو القسم المحدد</h3>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(p => {
        const cat = State.categories.find(c => c.id === p.categoryId);
        const isLow = p.stockQuantity <= p.minStockThreshold;
        return `
            <div class="product-card">
                <div class="product-img-wrapper">
                    <img src="${p.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400'}" alt="${p.name}">
                    <span class="product-tag"><i class="fas ${cat ? cat.icon : 'fa-tag'}"></i> ${cat ? cat.name : ''}</span>
                    <span class="stock-tag ${isLow ? 'low-stock' : 'in-stock'}">
                        ${isLow ? '⚠️ مخزون قليل: ' : 'متوفر: '} ${p.stockQuantity} ${p.unit}
                    </span>
                </div>
                <div class="product-body">
                    <h3 class="product-name">${p.name}</h3>
                    <p class="product-desc">${p.description}</p>
                    <div class="product-meta">
                        <span><i class="fas fa-barcode"></i> ${p.barcode}</span>
                        <span>الوحدة: <strong>${p.unit}</strong></span>
                    </div>
                    <div class="product-footer">
                        <div class="product-price">
                            ${p.sellingPrice.toFixed(2)} <span>${State.settings.currency}</span>
                        </div>
                        <button class="btn-add-cart" onclick="addToCustomerCart(${p.id})">
                            <i class="fas fa-cart-plus"></i> أضف للسلة
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function generateRandomBarcode() {
    const code = '628' + Math.floor(100000000 + Math.random() * 900000000);
    document.getElementById('new-prod-barcode').value = code;
}

function handleAddProduct(event) {
    event.preventDefault();

    // Check permission
    if (State.currentUser && State.currentUser.role !== 'admin' && !State.currentUser.canAddProduct) {
        showToast('ليس لديك صلاحية لإضافة أصناف جديدة!', 'error');
        return;
    }

    const name = document.getElementById('new-prod-name').value.trim();
    const barcode = document.getElementById('new-prod-barcode').value.trim();
    const categoryId = parseInt(document.getElementById('prod-category-select').value, 10);
    const unit = document.getElementById('new-prod-unit').value;
    const costPrice = parseFloat(document.getElementById('new-prod-cost').value) || 0;
    const sellingPrice = parseFloat(document.getElementById('new-prod-price').value) || 0;
    const stockQuantity = parseInt(document.getElementById('new-prod-stock').value, 10) || 0;
    const minStockThreshold = parseInt(document.getElementById('new-prod-min-stock').value, 10) || 5;
    const isPopular = document.getElementById('new-prod-popular').checked;
    const imageUrl = document.getElementById('new-prod-image').value.trim();
    const description = document.getElementById('new-prod-desc').value.trim();

    if (State.products.some(p => p.barcode === barcode)) {
        showToast('الباركود مسجل بالفعل لصنف آخر!', 'error');
        return;
    }

    const newProduct = {
        id: State.products.length + 1,
        name,
        barcode,
        categoryId,
        unit,
        costPrice,
        sellingPrice,
        stockQuantity,
        minStockThreshold,
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
        description,
        isPopular,
        salesCount: 0
    };

    State.products.unshift(newProduct);

    if (stockQuantity > 0) {
        State.inventoryLogs.unshift({
            id: Date.now(),
            productName: name,
            changeType: 'IN',
            quantityChange: `+${stockQuantity}`,
            previousStock: 0,
            newStock: stockQuantity,
            reason: 'رصيد افتتاحي لصنف جديد',
            date: new Date().toLocaleString('ar-SA')
        });
    }

    document.getElementById('add-product-form').reset();
    renderCategories();
    renderProducts();
    renderProductsTable();
    renderInventoryScreen();
    renderDashboardStats();
    renderPosScreen();

    showToast(`تمت إضافة الصنف "${name}" بنجاح!`, 'success');
}

function renderProductsTable() {
    const tbody = document.getElementById('products-table-body');
    if (!tbody) return;

    tbody.innerHTML = State.products.map(p => {
        const cat = State.categories.find(c => c.id === p.categoryId);
        return `
            <tr>
                <td><strong>${p.name}</strong></td>
                <td><code>${p.barcode}</code></td>
                <td><span class="badge info">${cat ? cat.name : '-'}</span></td>
                <td><strong>${p.costPrice.toFixed(2)}</strong> ${State.settings.currency}</td>
                <td><strong style="color: #10b981;">${p.sellingPrice.toFixed(2)}</strong> ${State.settings.currency}</td>
                <td>
                    <span class="badge ${p.stockQuantity <= p.minStockThreshold ? 'danger' : 'success'}">
                        ${p.stockQuantity} ${p.unit}
                    </span>
                </td>
                <td>${p.isPopular ? '<span class="badge warning">⭐ شائع</span>' : '-'}</td>
                <td>
                    <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="promptStockAdjustment(${p.id})">
                        <i class="fas fa-boxes"></i> جرد
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ==========================================================================
// 9. INVENTORY AUDIT & STOCK COUNT
// ==========================================================================

function renderInventoryScreen() {
    renderInventoryAuditTable();
    renderInventoryLogsTable();
}

function renderInventoryAuditTable() {
    const tbody = document.getElementById('inventory-audit-body');
    if (!tbody) return;

    tbody.innerHTML = State.products.map(p => {
        const cat = State.categories.find(c => c.id === p.categoryId);
        const costValue = p.stockQuantity * p.costPrice;
        const retailValue = p.stockQuantity * p.sellingPrice;
        const isLow = p.stockQuantity <= p.minStockThreshold;

        return `
            <tr>
                <td><strong>${p.name}</strong></td>
                <td><code>${p.barcode}</code></td>
                <td>${cat ? cat.name : '-'}</td>
                <td><span class="badge ${isLow ? 'danger' : 'success'}">${p.stockQuantity} ${p.unit}</span></td>
                <td>${p.minStockThreshold}</td>
                <td>${formatCurrency(costValue)}</td>
                <td>${formatCurrency(retailValue)}</td>
                <td>
                    <button class="btn-primary" style="padding: 4px 10px; font-size: 0.8rem;" onclick="openAuditModal(${p.id})">
                        <i class="fas fa-clipboard-check"></i> تسوية جرد
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderInventoryLogsTable() {
    const tbody = document.getElementById('inventory-logs-body');
    if (!tbody) return;

    tbody.innerHTML = State.inventoryLogs.slice(0, 25).map(log => {
        let badgeClass = 'info';
        if (log.changeType === 'IN') badgeClass = 'success';
        if (log.changeType === 'SALE') badgeClass = 'warning';
        if (log.changeType === 'AUDIT_ADJUSTMENT') badgeClass = 'danger';
        if (log.changeType === 'RETURN') badgeClass = 'primary';

        return `
            <tr>
                <td><strong>${log.productName}</strong></td>
                <td><span class="badge ${badgeClass}">${log.changeType}</span></td>
                <td><strong>${log.quantityChange}</strong></td>
                <td>${log.previousStock}</td>
                <td><strong>${log.newStock}</strong></td>
                <td>${log.reason}</td>
                <td style="font-size: 0.8rem; color: #64748b;">${log.date}</td>
            </tr>
        `;
    }).join('');
}

function promptStockAdjustment(productId) {
    openAuditModal(productId);
}

function openAuditModal(productId) {
    const product = State.products.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('audit-prod-id').value = product.id;
    document.getElementById('audit-prod-name').textContent = product.name;
    document.getElementById('audit-current-stock').textContent = `${product.stockQuantity} ${product.unit}`;
    document.getElementById('audit-new-count').value = product.stockQuantity;
    document.getElementById('audit-reason').value = 'جرد دوري بالمخزن';

    document.getElementById('audit-modal').classList.add('active');
}

function closeAuditModal() {
    document.getElementById('audit-modal').classList.remove('active');
}

function handleSaveAudit(event) {
    event.preventDefault();
    const productId = parseInt(document.getElementById('audit-prod-id').value, 10);
    const newCount = parseInt(document.getElementById('audit-new-count').value, 10);
    const reason = document.getElementById('audit-reason').value.trim();

    const product = State.products.find(p => p.id === productId);
    if (!product) return;

    const oldCount = product.stockQuantity;
    const diff = newCount - oldCount;
    product.stockQuantity = newCount;

    State.inventoryLogs.unshift({
        id: Date.now(),
        productName: product.name,
        changeType: diff >= 0 ? 'IN' : 'AUDIT_ADJUSTMENT',
        quantityChange: diff > 0 ? `+${diff}` : `${diff}`,
        previousStock: oldCount,
        newStock: newCount,
        reason: reason || 'تسوية جردية',
        date: new Date().toLocaleString('ar-SA')
    });

    closeAuditModal();
    renderInventoryScreen();
    renderProducts();
    renderProductsTable();
    renderDashboardStats();
    renderPosScreen();

    showToast(`تمت تسوية جرد الصنف "${product.name}" بنجاح!`, 'success');
}

// ==========================================================================
// 10. CUSTOMER SHOPPING CART & SELF-CHECKOUT
// ==========================================================================

function toggleCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    if (!drawer) return;
    drawer.classList.toggle('open');
    renderCustomerCart();
}

function addToCustomerCart(productId) {
    const product = State.products.find(p => p.id === productId);
    if (!product) return;

    if (product.stockQuantity <= 0) {
        showToast(`عذراً، الصنف "${product.name}" غير متوفر`, 'error');
        return;
    }

    const existing = State.customerCart.find(i => i.product.id === productId);
    if (existing) {
        if (existing.quantity >= product.stockQuantity) {
            showToast(`أقصى كمية متوفرة: ${product.stockQuantity}`, 'error');
            return;
        }
        existing.quantity += 1;
    } else {
        State.customerCart.push({ product, quantity: 1 });
    }

    updateCartBadge();
    showToast(`تمت إضافة "${product.name}" إلى السلة`, 'success');
}

function updateCartQuantity(productId, delta) {
    const item = State.customerCart.find(i => i.product.id === productId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
        State.customerCart = State.customerCart.filter(i => i.product.id !== productId);
    } else {
        if (newQty > item.product.stockQuantity) {
            showToast(`أقصى كمية متوفرة: ${item.product.stockQuantity}`, 'error');
            return;
        }
        item.quantity = newQty;
    }

    updateCartBadge();
    renderCustomerCart();
}

function removeFromCart(productId) {
    State.customerCart = State.customerCart.filter(i => i.product.id !== productId);
    updateCartBadge();
    renderCustomerCart();
}

function updateCartBadge() {
    const badge = document.getElementById('cart-badge-count');
    if (badge) {
        const count = State.customerCart.reduce((sum, i) => sum + i.quantity, 0);
        badge.textContent = count;
    }
}

function renderCustomerCart() {
    const body = document.getElementById('cart-drawer-items');
    const footer = document.getElementById('cart-drawer-summary');
    if (!body || !footer) return;

    if (State.customerCart.length === 0) {
        body.innerHTML = `
            <div style="text-align: center; padding: 3rem 1rem; color: #94a3b8;">
                <i class="fas fa-shopping-basket" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <p>سلة المشتريات فارغة حالياً</p>
            </div>
        `;
        footer.innerHTML = '';
        return;
    }

    let subtotal = 0;
    body.innerHTML = State.customerCart.map(item => {
        const line = item.product.sellingPrice * item.quantity;
        subtotal += line;
        return `
            <div class="pos-item-row">
                <div class="pos-item-info">
                    <h4>${item.product.name}</h4>
                    <span>${item.product.sellingPrice.toFixed(2)} ${State.settings.currency} × ${item.quantity}</span>
                </div>
                <div class="qty-controls">
                    <button class="qty-btn" onclick="updateCartQuantity(${item.product.id}, -1)">-</button>
                    <span style="font-weight: 700; min-width: 20px; text-align: center;">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateCartQuantity(${item.product.id}, 1)">+</button>
                    <button onclick="removeFromCart(${item.product.id})" style="background: none; border: none; color: #ef4444; margin-right: 6px; cursor: pointer;">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    const tax = subtotal * 0.15;
    const total = subtotal + tax;

    footer.innerHTML = `
        <div class="pos-summary-row">
            <span>المجموع الفرعي:</span>
            <strong>${formatCurrency(subtotal)}</strong>
        </div>
        <div class="pos-summary-row">
            <span>ضريبة القيمة المضافة (15%):</span>
            <strong>${formatCurrency(tax)}</strong>
        </div>
        <div class="pos-summary-row total">
            <span>المجموع النهائي:</span>
            <span style="color: #10b981;">${formatCurrency(total)}</span>
        </div>
        <button class="pos-checkout-btn" style="margin-top: 1rem;" onclick="checkoutCustomerCart()">
            <i class="fas fa-check-circle"></i> تأكيد وإتمام طلب الشراء
        </button>
    `;
}

function checkoutCustomerCart() {
    if (State.customerCart.length === 0) return;

    let subtotal = 0;
    const items = State.customerCart.map(ci => {
        const line = ci.product.sellingPrice * ci.quantity;
        subtotal += line;

        ci.product.stockQuantity -= ci.quantity;
        ci.product.salesCount = (ci.product.salesCount || 0) + ci.quantity;

        State.inventoryLogs.unshift({
            id: Date.now() + Math.random(),
            productName: ci.product.name,
            changeType: 'SALE',
            quantityChange: `-${ci.quantity}`,
            previousStock: ci.product.stockQuantity + ci.quantity,
            newStock: ci.product.stockQuantity,
            reason: `طلب شراء سلة (${State.currentUser ? State.currentUser.name : 'عميل زائر'})`,
            date: new Date().toLocaleString('ar-SA')
        });

        return {
            productId: ci.product.id,
            name: ci.product.name,
            quantity: ci.quantity,
            unitPrice: ci.product.sellingPrice,
            itemDiscount: 0.00,
            subtotal: line,
            returnedQuantity: 0
        };
    });

    const taxAmount = subtotal * 0.15;
    const totalAmount = subtotal + taxAmount;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder = {
        id: State.orders.length + 1,
        invoiceNumber,
        customerId: State.currentUser ? State.currentUser.id : null,
        customerName: State.currentUser ? State.currentUser.name : 'عميل إلكتروني',
        cashierId: null,
        cashierName: 'خدمة ذاتية (Self-Service)',
        shiftType: State.settings.currentShift || 'day',
        subtotal,
        itemDiscountsTotal: 0.00,
        discountAmount: 0.00,
        taxAmount,
        totalAmount,
        refundedAmount: 0.00,
        paymentMethod: 'card',
        paymentStatus: 'paid',
        date: new Date().toLocaleString('ar-SA'),
        items
    };

    State.orders.unshift(newOrder);
    State.customerCart = [];

    updateCartBadge();
    renderCustomerCart();
    toggleCartDrawer();

    renderProducts();
    renderDashboardStats();
    renderSalesAnalytics();
    renderProductsTable();
    renderInventoryScreen();
    renderOrdersTable();

    showToast(`تم إصدار فاتورة الشراء رقم ${invoiceNumber} بنجاح!`, 'success');
    openInvoiceModal(newOrder);
}

// Dashboard Statistics
function renderDashboardStats() {
    const totalSales = State.orders.reduce((sum, o) => sum + (o.paymentStatus === 'refunded' ? 0 : o.totalAmount), 0);
    const lowStockCount = State.products.filter(p => p.stockQuantity <= p.minStockThreshold).length;
    const totalInventoryUnits = State.products.reduce((sum, p) => sum + p.stockQuantity, 0);

    const elTotalSales = document.getElementById('stat-total-sales');
    const elOrdersCount = document.getElementById('stat-orders-count');
    const elProductsCount = document.getElementById('stat-products-count');
    const elLowStockCount = document.getElementById('stat-low-stock-count');

    if (elTotalSales) elTotalSales.textContent = formatCurrency(totalSales);
    if (elOrdersCount) elOrdersCount.textContent = State.orders.length;
    if (elProductsCount) elProductsCount.textContent = `${State.products.length} صنف (${totalInventoryUnits} قطعة)`;
    if (elLowStockCount) elLowStockCount.textContent = `${lowStockCount} أصناف`;

    const list = document.getElementById('dashboard-low-stock-list');
    if (!list) return;

    const lowStockItems = State.products.filter(p => p.stockQuantity <= p.minStockThreshold);
    if (lowStockItems.length === 0) {
        list.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #10b981; padding: 1rem;">جميع الأصناف متوفرة ولا توجد نواقص بالمخزن</td></tr>`;
        return;
    }

    list.innerHTML = lowStockItems.map(p => {
        const cat = State.categories.find(c => c.id === p.categoryId);
        return `
            <tr>
                <td><strong>${p.name}</strong></td>
                <td><code>${p.barcode}</code></td>
                <td><span class="badge info">${cat ? cat.name : '-'}</span></td>
                <td><span class="badge danger">${p.stockQuantity} ${p.unit}</span></td>
                <td>${p.minStockThreshold} ${p.unit}</td>
            </tr>
        `;
    }).join('');
}
