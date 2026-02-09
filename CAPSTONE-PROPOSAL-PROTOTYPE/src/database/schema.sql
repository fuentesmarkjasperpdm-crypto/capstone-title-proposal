-- =====================================================
-- KohiSync: Database Schema
-- =====================================================
-- PROJECT CONTEXT: Single local café requiring improved transaction speed,
-- billing flexibility, inventory tracking, and customer queuing during peak hours.
--
-- OBJECTIVES MAPPING:
-- OBJ1: Improve transaction speed via POS interface
-- OBJ2: Flexible billing (discounts for Senior Citizen, PWD, Student)
-- OBJ3: Real-time inventory tracking
-- OBJ4: Improve customer experience with kiosk ordering
--
-- SCOPE: Single-branch, local Wi-Fi, no online payments, session-based ordering
-- =====================================================

-- =====================================================
-- Users Table
-- Scope: Staff (Admin, Cashier roles) only. No customer registration.
-- Maps to: OBJECTIVE 1 (POS Interface), Staff/Admin Dashboard requirement
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'staff')),
    -- role: 'admin' can manage users, inventory, reports
    --       'staff' can only create transactions and view inventory
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Products Table (Menu Items)
-- Scope: Coffee beans, milk, syrups, beverages, food items
-- Maps to: OBJECTIVE 3 (Inventory Tracking), OBJECTIVE 4 (Kiosk Menu)
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK(category IN ('beverage', 'food', 'ingredient')),
    -- category: 'beverage' = hot/cold drinks (for customer orders)
    --           'food' = snacks, pastries (for customer orders)
    --           'ingredient' = internal stock (coffee beans, milk, syrups)
    price REAL NOT NULL,
    current_stock INTEGER NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'pieces',
    -- unit: 'pieces', 'kg', 'liters', 'shots', 'cups', etc.
    low_stock_threshold INTEGER NOT NULL DEFAULT 10,
    -- low_stock_threshold: Alerts when stock falls below this value
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Transactions Table
-- Scope: Records all POS transactions (cash only, no online payment)
-- Maps to: OBJECTIVE 1 (Transaction Speed), OBJECTIVE 2 (Flexible Billing)
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_number TEXT NOT NULL UNIQUE,
    -- transaction_number: Sequential for receipt printing/tracking
    staff_id INTEGER NOT NULL,
    -- staff_id: Who created the transaction (POS interface)
    customer_name TEXT,
    -- customer_name: Optional, for future CRM features
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('pos', 'kiosk')),
    -- transaction_type: 'pos' = counter POS, 'kiosk' = customer kiosk order
    total_before_discount REAL NOT NULL,
    discount_amount REAL NOT NULL DEFAULT 0.0,
    discount_reason TEXT CHECK(discount_reason IN ('senior_citizen', 'pwd', 'student', 'manual', NULL)),
    -- discount_reason: Maps to OBJECTIVE 2 (flexible billing)
    -- Applied AFTER receipt generation per requirements
    total_after_discount REAL NOT NULL,
    amount_paid REAL NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    -- payment_method: Only 'cash' in prototype (SCOPE limitation)
    change_amount REAL NOT NULL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'refunded')),
    -- status: For offline sync tracking
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES users(id)
);

-- =====================================================
-- Transaction Items Table
-- Scope: Individual items within each transaction (order composition)
-- Maps to: OBJECTIVE 1 (Transaction Speed - fast item logging)
--          OBJECTIVE 3 (Inventory Tracking - auto stock deduction)
-- =====================================================
CREATE TABLE IF NOT EXISTS transaction_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    subtotal REAL NOT NULL,
    -- subtotal: quantity * unit_price (before transaction-level discounts)
    notes TEXT,
    -- notes: e.g., "Extra hot", "No sugar", special requests
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- =====================================================
-- Inventory Adjustments Table
-- Scope: Manual stock adjustments by admin only
-- Maps to: OBJECTIVE 3 (Inventory Tracking - admin manual adjustments)
-- LIMITATION: No supplier or procurement features
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    adjustment_type TEXT NOT NULL CHECK(adjustment_type IN ('add', 'deduct', 'correction')),
    -- adjustment_type: 'add' = stock in, 'deduct' = stock out, 'correction' = inventory count fix
    quantity_changed INTEGER NOT NULL,
    reason TEXT,
    -- reason: e.g., "Damage", "Spoilage", "Stock count correction", "New shipment"
    admin_id INTEGER NOT NULL,
    -- admin_id: Who made the adjustment (audit trail)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (admin_id) REFERENCES users(id)
);

-- =====================================================
-- Kiosk Sessions Table
-- Scope: Temporary session-based ordering (no user registration)
-- Maps to: OBJECTIVE 4 (Customer Kiosk), SCOPE (No registration required)
-- OFFLINE-FIRST: Stores session data locally, syncs on reconnect
-- =====================================================
CREATE TABLE IF NOT EXISTS kiosk_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL UNIQUE,
    -- session_id: Browser session identifier (UUID)
    order_items TEXT,
    -- order_items: JSON array of {product_id, quantity, notes}
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'submitted', 'expired')),
    -- status: 'active' = user still ordering, 'submitted' = order sent to transaction,
    --         'expired' = session timed out
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME
    -- expires_at: Session auto-expires after 30 minutes (configurable)
);

-- =====================================================
-- Daily Reports Table
-- Scope: Aggregated daily sales metrics
-- Maps to: OBJECTIVE 1 (Real-time metrics), Staff/Admin Dashboard requirement
-- LIMITATION: Only daily and monthly reports (no advanced analytics)
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_date DATE NOT NULL UNIQUE,
    total_transactions INTEGER NOT NULL DEFAULT 0,
    total_revenue REAL NOT NULL DEFAULT 0.0,
    total_discounts REAL NOT NULL DEFAULT 0.0,
    total_items_sold INTEGER NOT NULL DEFAULT 0,
    payment_breakdown TEXT,
    -- payment_breakdown: JSON {cash: X, ...}
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Offline Transaction Queue Table
-- Scope: Stores transactions created when internet is unavailable
-- Maps to: SCOPE (Offline-First Capability simulation)
-- Auto-syncs when connection is restored
-- =====================================================
CREATE TABLE IF NOT EXISTS offline_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_data TEXT NOT NULL,
    -- transaction_data: JSON serialized transaction and items
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'synced', 'failed')),
    -- status: 'pending' = waiting to sync, 'synced' = sent to server, 'failed' = needs retry
    sync_attempts INTEGER DEFAULT 0,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    synced_at DATETIME
);

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_staff ON transactions(staff_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_date ON inventory_adjustments(created_at);
CREATE INDEX IF NOT EXISTS idx_kiosk_sessions_status ON kiosk_sessions(status);
CREATE INDEX IF NOT EXISTS idx_offline_queue_status ON offline_queue(status);
