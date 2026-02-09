# 🍵 KohiSync: POS & Inventory System for Yambie Kōhī

A functional prototype for an academic capstone project demonstrating a web-based Point of Sale and Inventory Management System with Kiosk Ordering Interface for a local café.

---

## 📋 Project Overview

**System Purpose:**  
KohiSync is designed to improve transaction speed, billing flexibility, inventory tracking, and customer queuing during peak hours for a single local café (Yambie Kōhī).

### Core Objectives

1. **OBJ1:** Improve transaction speed via POS interface
2. **OBJ2:** Flexible billing with Senior Citizen, PWD, and Student discounts
3. **OBJ3:** Real-time inventory tracking with automatic stock deduction
4. **OBJ4:** Improve customer experience with kiosk ordering interface

---

## 🎯 System Architecture

### Core Modules

#### 1. **Staff/Admin Dashboard**
- Secure login with role-based access (Admin, Staff)
- Real-time dashboard with sales metrics
- POS interface for transaction creation
- Inventory view with low-stock alerts
- Daily and monthly sales reports
- Discount and transaction analysis

#### 2. **Customer Ordering (Kiosk)**
- Accessible via QR code (public interface, no authentication)
- Menu browsing without registration
- Session-based ordering
- Payment processing at counter
- Temporary session storage (auto-expires after 30 minutes)

#### 3. **Inventory Management**
- Real-time stock level viewing
- Automatic stock deduction based on orders
- Low-stock indicators with alerts
- Manual stock adjustment (Admin only)
- Inventory adjustment audit trail

#### 4. **Offline-First Capability** (Simulation)
- Local transaction queue for offline operations
- Automatic synchronization when connection is restored

---

## 🔧 Technology Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla) |
| **Backend** | Node.js + Express.js |
| **Database** | SQLite3 |
| **Authentication** | Session-based (express-session) |
| **API** | RESTful architecture |

### Project Structure

```
kohisync-pos-inventory/
├── server.js                    # Main Express server
├── package.json                 # Dependencies
├── public/
│   ├── pages/
│   │   ├── login.html          # Staff/Admin login
│   │   ├── dashboard.html      # Main dashboard
│   │   ├── pos.html            # POS transaction interface
│   │   ├── inventory.html      # Inventory management
│   │   ├── reports.html        # Sales reports & analytics
│   │   └── kiosk.html          # Customer kiosk interface
│   ├── js/
│   │   ├── dashboard.js        # Dashboard logic
│   │   ├── pos.js              # POS transaction logic
│   │   └── kiosk.js            # Kiosk ordering logic
│   └── css/
│       └── styles.css          # Global styles
├── src/
│   ├── routes/
│   │   ├── authRoutes.js       # Authentication endpoints
│   │   ├── transactionRoutes.js # POS transaction endpoints
│   │   ├── inventoryRoutes.js  # Inventory management endpoints
│   │   ├── kioskRoutes.js      # Kiosk ordering endpoints
│   │   └── reportRoutes.js     # Reports & analytics endpoints
│   ├── controllers/
│   │   ├── authController.js   # Authentication logic
│   │   ├── transactionController.js
│   │   ├── inventoryController.js
│   │   ├── kioskController.js
│   │   └── reportController.js
│   ├── middleware/
│   │   └── auth.js             # Authentication middleware
│   └── database/
│       ├── index.js            # Database connection
│       └── schema.sql          # Database schema
└── scripts/
    └── seed-data.js            # Sample data generation
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v14+)
- npm

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Initialize database and load sample data:**
   ```bash
   npm start
   ```

The server will automatically:
- Create SQLite database (`data/kohisync.db`)
- Initialize schema
- Load sample data with demo users and products

3. **Access the application:**
   - **Staff Dashboard:** http://localhost:3000/login
   - **Customer Kiosk:** http://localhost:3000/kiosk

---

## 👥 Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | password123 |
| Cashier 1 | cashier1 | password123 |
| Cashier 2 | cashier2 | password123 |

⚠️ **Note:** For production, implement bcrypt password hashing and change secret keys.

---

## 📊 API Endpoints

### Authentication
```
POST   /api/auth/login          - Staff/Admin login
POST   /api/auth/logout         - Logout
GET    /api/auth/me             - Get current user
POST   /api/auth/users          - Create new staff (Admin only)
GET    /api/auth/users          - List all users (Admin only)
```

### Transactions (POS)
```
POST   /api/transactions                 - Create new transaction
POST   /api/transactions/:id/discount    - Apply discount (post-receipt)
POST   /api/transactions/:id/payment     - Process payment
GET    /api/transactions/:id             - Get transaction details
GET    /api/transactions/:id/receipt     - Generate receipt HTML
```

### Inventory
```
GET    /api/inventory                    - View all products
GET    /api/inventory/:id                - Get product details
POST   /api/inventory/products           - Add new product (Admin)
PUT    /api/inventory/:id                - Update product (Admin)
POST   /api/inventory/adjust             - Adjust stock (Admin)
GET    /api/inventory/low-stock          - Get low-stock items
GET    /api/inventory/adjustments/history - Stock change audit trail
```

### Kiosk (Public)
```
POST   /api/kiosk/session                - Create kiosk session
GET    /api/kiosk/menu                   - Get menu
POST   /api/kiosk/cart                   - Add to cart
GET    /api/kiosk/cart/:session_id       - View cart
DELETE /api/kiosk/cart                   - Remove from cart
POST   /api/kiosk/order                  - Submit order
```

### Reports
```
GET    /api/reports/daily                - Daily sales report
GET    /api/reports/monthly              - Monthly sales report
GET    /api/reports/top-products         - Best-selling products
GET    /api/reports/discounts            - Discount analysis
GET    /api/reports/transaction-types    - POS vs Kiosk breakdown
GET    /api/reports/hourly-trend         - Hourly transaction trend
```

---

## 🔐 Role-Based Access Control

### Admin Role
- Create and manage staff accounts
- Access all dashboards and reports
- Manage inventory (add, update, adjust stock)
- View discount and transaction analytics

### Staff Role
- Create POS transactions
- Apply discounts to transactions
- Process payments
- View inventory levels
- Access dashboard and reports

### Customer (Kiosk)
- Browse menu
- Place orders without registration
- No access to protected sections

---

## 💡 Key Features Mapping to Objectives

### OBJECTIVE 1: Transaction Speed
- Fast POS interface for quick item entry
- Pre-configured product menu
- Quick payment processing
- Receipt printing/generation
- Real-time transaction logging

### OBJECTIVE 2: Flexible Billing
- **Discount types:**
  - Senior Citizen: 20% discount
  - PWD: 20% discount
  - Student: 10% discount
  - Manual: Custom discount amount
- Discounts can be applied **after receipt generation**
- Audit trail for all discounts

### OBJECTIVE 3: Real-Time Inventory
- Live stock level display on POS
- Automatic stock deduction on transaction
- Low-stock threshold alerts (configurable per product)
- Manual stock adjustment with audit trail
- Inventory adjustment history

### OBJECTIVE 4: Customer Experience
- QR-code accessible kiosk interface
- Simple menu browsing and ordering
- No registration required
- Session-based ordering (30-minute expiry)
- Order confirmation with transaction number

---

## 📈 Database Schema

### Core Tables

**users**
- Staff and admin accounts only
- Roles: admin, staff
- Session-based authentication

**products**
- Menu items (beverages, food, ingredients)
- Real-time stock tracking
- Configurable low-stock thresholds

**transactions**
- POS and kiosk orders
- Discount tracking
- Audit trail

**transaction_items**
- Individual items per transaction
- Auto-inventory deduction

**inventory_adjustments**
- Manual stock changes
- Audit trail with reasons

**kiosk_sessions**
- Temporary customer sessions
- Auto-expires after 30 minutes

**daily_reports**
- Aggregated daily metrics
- Real-time calculation

---

## 🌐 Scope & Limitations

### Scope
✅ Single-branch deployment only  
✅ Local Wi-Fi network access  
✅ Session-based authentication  
✅ Cash payment only  
✅ Offline transaction queue (simulated)

### Limitations
❌ No online payments (cash only)  
❌ No table reservations or scheduled orders  
❌ No multi-branch support  
❌ No supplier or procurement features  
❌ No customer registration/loyalty program  
❌ No advanced analytics beyond daily/monthly

---

## 🔄 Offline-First Capability

The system includes a queue mechanism for offline operations:

1. **Offline Transactions:**
   - Transactions are queued in `offline_queue` table
   - Local storage can be used for browser-side persistence

2. **Synchronization:**
   - When connection is restored, transactions sync automatically
   - Failed syncs are retried with backoff

3. **Web Push Notifications:**
   - Disabled when offline
   - Enabled when connection restored

---

## 📊 Sample Data

The system is pre-populated with:

- **3 Users:**
  - 1 Admin
  - 2 Cashiers

- **14 Products:**
  - 7 Beverages (Americano, Cappuccino, Latte, etc.)
  - 4 Food items (Croissants, Muffins, Cakes, etc.)
  - 3 Ingredients (Coffee Beans, Milk, Chocolate Syrup)

- **4 Sample Transactions:**
  - Mixed discount types (Senior Citizen, PWD, Student)
  - Various product combinations

---

## 🧪 Testing the System

### Test Scenario 1: POS Transaction with Senior Citizen Discount
1. Login as cashier1 / password123
2. Navigate to POS
3. Add items: Americano x2, Pastry
4. Click "Senior Citizen Discount"
5. Proceed to payment
6. Print receipt

### Test Scenario 2: Kiosk Ordering
1. Navigate to /kiosk
2. Browse menu (no login required)
3. Add items to cart
4. Submit order
5. Go to counter for payment

### Test Scenario 3: Inventory Management
1. Login as admin
2. Navigate to Inventory
3. Check low-stock items
4. View adjustment history

### Test Scenario 4: Reports
1. Login as any staff
2. Navigate to Reports
3. View today's transactions
4. Check discount analysis
5. See top products

---

## 🔧 Development Notes

### Default Configuration
- **Port:** 3000
- **Session Timeout:** 24 hours
- **Kiosk Session Timeout:** 30 minutes
- **Database:** SQLite (local file)
- **Low Stock Threshold:** 10 units (configurable per product)

### Running in Development
```bash
npm start
```

### Database Management
- Database file: `data/kohisync.db`
- To reset: Delete `data/kohisync.db`, restart server
- To inspect: Use any SQLite viewer

---

## ⚠️ Production Considerations

This is a **prototype**, not production-ready. For production:

1. **Security:**
   - Use bcrypt for password hashing
   - Implement HTTPS/TLS
   - Add CSRF protection
   - Validate all inputs
   - Rate limiting on login

2. **Performance:**
   - Migrate to PostgreSQL/MySQL
   - Add caching layer (Redis)
   - Implement connection pooling
   - Add indexes on queries

3. **Reliability:**
   - Implement proper error handling
   - Add logging and monitoring
   - Set up automated backups
   - Implement transaction rollback

4. **Scalability:**
   - Multi-branch support
   - User authentication system
   - API rate limiting
   - Horizontal scaling capability

---

## 📝 Comments & Documentation

All code includes detailed comments mapping features to:
- Project Context
- Objectives of the Study
- Scope and Limitations

This ensures clear alignment with Chapter 1 of the capstone proposal.

---

## 🎓 Academic Context

This prototype demonstrates:
- Full-stack web development
- Database design and optimization
- RESTful API architecture
- Role-based access control
- Real-time data management
- Responsive UI/UX

---

## 📞 Support

For questions or issues with the prototype, refer to:
- Code comments (all functions documented)
- Database schema (schema.sql with detailed comments)
- API documentation (this README)

---

## 📄 License

This project is provided for academic purposes as part of the capstone project.

---

**Last Updated:** February 4, 2026  
**Version:** 0.1.0 (Prototype)  
**Status:** ✅ Functional Prototype - Ready for Testing
