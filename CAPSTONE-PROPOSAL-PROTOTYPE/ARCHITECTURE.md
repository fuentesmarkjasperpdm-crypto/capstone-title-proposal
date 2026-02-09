# KohiSync System Architecture & Design Document

## Executive Summary

KohiSync is a functional prototype for a web-based Point of Sale (POS) and Inventory Management System designed for Yambie Kōhī, a single local café. The system addresses the core objectives of improving transaction speed, enabling flexible billing, maintaining real-time inventory, and enhancing customer experience through a kiosk interface.

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
├────────────────────────────┬──────────────────────────────────┤
│  Staff/Admin Dashboard     │  Customer Kiosk Interface        │
│  (Protected)               │  (Public - No Auth)              │
│                            │                                  │
│ - Login (HTML)             │ - Menu Browsing                  │
│ - Dashboard (JS)           │ - Cart Management                │
│ - POS (JS)                 │ - Order Placement                │
│ - Inventory (JS)           │                                  │
│ - Reports (JS)             │                                  │
└────────────┬───────────────┴──────────────────┬────────────────┘
             │                                   │
             └──────────────┬──────────────────┘
                            │
        ┌───────────────────▼──────────────────┐
        │        HTTP/REST API LAYER           │
        │      (Express.js - Node.js)          │
        ├─────────────────────────────────────┤
        │ Routes:                             │
        │ - /api/auth/*                       │
        │ - /api/transactions/*               │
        │ - /api/inventory/*                  │
        │ - /api/kiosk/*                      │
        │ - /api/reports/*                    │
        └───────────────┬──────────────────────┘
                        │
        ┌───────────────▼──────────────────┐
        │   APPLICATION LOGIC LAYER         │
        │      (Controllers)                │
        ├─────────────────────────────────┤
        │ - Auth Controller                 │
        │ - Transaction Controller          │
        │ - Inventory Controller            │
        │ - Kiosk Controller                │
        │ - Report Controller               │
        └───────────────┬──────────────────┘
                        │
        ┌───────────────▼──────────────────┐
        │   DATA ACCESS LAYER              │
        │      (Database Queries)          │
        ├─────────────────────────────────┤
        │ - User Management                 │
        │ - Transaction Processing          │
        │ - Stock Management                │
        │ - Session Management              │
        │ - Audit Trails                    │
        └───────────────┬──────────────────┘
                        │
        ┌───────────────▼──────────────────┐
        │    PERSISTENCE LAYER             │
        │        (SQLite DB)                │
        ├─────────────────────────────────┤
        │ - users                           │
        │ - products                        │
        │ - transactions                    │
        │ - transaction_items               │
        │ - inventory_adjustments           │
        │ - kiosk_sessions                  │
        │ - daily_reports                   │
        │ - offline_queue                   │
        └──────────────────────────────────┘
```

---

## 2. Core Components & Objective Mapping

### 2.1 Authentication Module
**Objective Mapping:** OBJ1 - Secure POS Interface

| Component | Purpose | Details |
|-----------|---------|---------|
| `authRoutes.js` | Authentication endpoints | Login, logout, user management |
| `authController.js` | Auth business logic | Session creation, validation |
| `auth.js` middleware | Access control | Role-based (Admin, Staff) |

**Key Features:**
- Session-based authentication (express-session)
- Role-based access control (RBAC)
- Staff and Admin roles
- 24-hour session timeout

---

### 2.2 Transaction (POS) Module
**Objective Mapping:** OBJ1 (Speed) + OBJ2 (Flexible Billing) + OBJ3 (Inventory)

| Component | Purpose | Details |
|-----------|---------|---------|
| `transactionRoutes.js` | POS endpoints | Create, discount, payment |
| `transactionController.js` | POS logic | Transaction processing |

**Key Features:**
- Fast transaction creation
- Multi-item support
- Discount application (post-receipt)
- Automatic inventory deduction
- Receipt generation (HTML)
- Daily report updates

**Workflow:**
1. Staff adds items to transaction
2. System calculates subtotal
3. Staff optionally applies discount (SC/PWD/Student/Manual)
4. System generates receipt
5. Payment processed, transaction completed
6. Inventory automatically updated

---

### 2.3 Inventory Management Module
**Objective Mapping:** OBJ3 - Real-Time Inventory

| Component | Purpose | Details |
|-----------|---------|---------|
| `inventoryRoutes.js` | Inventory endpoints | View, adjust, manage |
| `inventoryController.js` | Inventory logic | Stock management |

**Key Features:**
- Real-time stock viewing
- Automatic deduction on orders
- Low-stock alerts (configurable)
- Manual adjustments (Admin only)
- Adjustment audit trail
- Product management (CRUD)

**Stock Status Levels:**
- ✓ OK: Stock > Threshold
- ⚠️ Low: Stock ≤ Threshold

---

### 2.4 Kiosk Interface Module
**Objective Mapping:** OBJ4 - Customer Experience

| Component | Purpose | Details |
|-----------|---------|---------|
| `kioskRoutes.js` | Public endpoints | Menu, cart, order |
| `kioskController.js` | Kiosk logic | Session management |

**Key Features:**
- No authentication required
- QR-code accessible
- Session-based ordering (30-minute expiry)
- Menu browsing
- Shopping cart
- Order submission
- Payment at counter (not in kiosk)

**Session Management:**
- Auto-created on access
- Stores order items in JSON
- Auto-expires after 30 minutes
- Can be extended or reset

---

### 2.5 Reports & Analytics Module
**Objective Mapping:** OBJ1 - Real-Time Metrics

| Component | Purpose | Details |
|-----------|---------|---------|
| `reportRoutes.js` | Report endpoints | Daily, monthly, analytics |
| `reportController.js` | Report logic | Data aggregation |

**Report Types:**
- Daily sales summary
- Monthly trends
- Top-selling products
- Discount analysis
- Transaction type breakdown
- Hourly trends (peak hour identification)

---

## 3. Database Design

### 3.1 Schema Overview

```sql
users
├── id (PK)
├── username (UNIQUE)
├── password
├── full_name
├── role (admin | staff)
└── timestamps

products
├── id (PK)
├── name
├── category (beverage | food | ingredient)
├── price
├── current_stock
├── unit
├── low_stock_threshold
└── timestamps

transactions
├── id (PK)
├── transaction_number (UNIQUE)
├── staff_id (FK -> users)
├── customer_name
├── transaction_type (pos | kiosk)
├── total_before_discount
├── discount_amount
├── discount_reason (SC | PWD | student | manual)
├── total_after_discount
├── amount_paid
├── payment_method (cash)
├── change_amount
├── status (pending | completed | refunded)
└── timestamps

transaction_items
├── id (PK)
├── transaction_id (FK -> transactions)
├── product_id (FK -> products)
├── quantity
├── unit_price
├── subtotal
├── notes
└── timestamps

inventory_adjustments
├── id (PK)
├── product_id (FK -> products)
├── adjustment_type (add | deduct | correction)
├── quantity_changed
├── reason
├── admin_id (FK -> users)
└── timestamps

kiosk_sessions
├── id (PK)
├── session_id (UNIQUE, UUID)
├── order_items (JSON)
├── status (active | submitted | expired)
└── expires_at

daily_reports
├── id (PK)
├── report_date (UNIQUE)
├── total_transactions
├── total_revenue
├── total_discounts
├── total_items_sold
└── timestamps

offline_queue
├── id (PK)
├── transaction_data (JSON)
├── status (pending | synced | failed)
├── sync_attempts
├── error_message
└── timestamps
```

### 3.2 Key Design Decisions

1. **SQLite for Simplicity:**
   - Single-branch, local-only deployment
   - No complex replication needed
   - File-based database simplifies deployment

2. **JSON Fields for Flexibility:**
   - Kiosk session items stored as JSON
   - Offline queue uses JSON for transaction data
   - Allows flexible schema evolution

3. **Audit Trail:**
   - inventory_adjustments table tracks all stock changes
   - User_id recorded for all modifications
   - Reason field for stock adjustments

4. **Real-Time Reporting:**
   - daily_reports table pre-calculates aggregates
   - Updated on each transaction completion
   - Fast dashboard metrics retrieval

---

## 4. API Design

### 4.1 RESTful Principles

All endpoints follow REST conventions:

```
CREATE:  POST   /api/resource
READ:    GET    /api/resource/:id
UPDATE:  PUT    /api/resource/:id
DELETE:  DELETE /api/resource/:id
LIST:    GET    /api/resource
ACTION:  POST   /api/resource/:id/action
```

### 4.2 Authentication Flow

```
┌─────────────────────────────────────────┐
│ 1. User submits credentials             │
│    POST /api/auth/login                 │
│    { username, password }               │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 2. Server validates credentials         │
│    (Simple comparison in prototype)      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 3. Session created (express-session)    │
│    req.session.user_id = user.id        │
│    req.session.role = user.role         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 4. Client receives session cookie       │
│    Sent with all subsequent requests    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 5. Middleware validates session         │
│    isAuthenticated(), isAdmin(), etc.   │
│    Checks req.session.user_id           │
└──────────────────────────────────────────┘
```

### 4.3 Transaction Processing Flow

```
┌──────────────────────────┐
│ 1. Create Transaction    │
│ POST /api/transactions   │
│ Items: [product_id, qty] │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ 2. Validate items        │
│ Check product exists     │
│ Check stock available    │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ 3. Insert transaction    │
│ Create transaction_items │
│ Status: pending          │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ 4. Apply Discount        │
│ POST .../discount        │
│ (Optional, post-receipt) │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ 5. Process Payment       │
│ POST .../payment         │
│ Amount paid vs due       │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ 6. Finalize             │
│ Update inventory         │
│ Update daily report      │
│ Status: completed        │
└──────────────────────────┘
```

---

## 5. Frontend Architecture

### 5.1 Page Structure

| Page | Purpose | Auth Required | Role |
|------|---------|---------------|------|
| login.html | Staff/Admin login | No | Public |
| dashboard.html | Main dashboard | Yes | Staff+ |
| pos.html | POS transactions | Yes | Staff+ |
| inventory.html | Stock management | Yes | Staff+ |
| reports.html | Analytics | Yes | Staff+ |
| kiosk.html | Customer ordering | No | Public |

### 5.2 State Management (Client-Side)

Each page manages state locally:

```javascript
// Global variables for page state
let cart = [];           // POS: Shopping cart
let currentTransaction = null; // POS: Current transaction
let currentDiscount = 0;  // POS: Discount amount
let kioskSession = null;  // Kiosk: Session ID
```

### 5.3 UI/UX Design

**Design System:**
- Color scheme: Brown/Coffee themed (#8B4513, #D2691E)
- Responsive grid layouts
- Mobile-friendly (768px breakpoint)
- Accessibility: Clear labels, button feedback

**Key Interactions:**
- Real-time total calculations
- Instant feedback on actions
- Modal dialogs for confirmations
- Success/error notifications

---

## 6. Security Considerations

### 6.1 Authentication & Authorization

| Feature | Implementation | Status |
|---------|----------------|--------|
| Password hashing | Basic (plaintext in prototype) | ⚠️ TODO |
| Session management | express-session | ✅ Implemented |
| Role-based access | Middleware checks | ✅ Implemented |
| HTTPS | Not implemented | ❌ Needed |
| CSRF protection | Not implemented | ❌ Needed |

### 6.2 Data Protection

| Aspect | Implementation |
|--------|-----------------|
| SQL Injection | Parameterized queries | ✅ |
| XSS Protection | HTML escaping | ✅ |
| Input validation | Type checking | Partial |
| Rate limiting | Not implemented | ❌ |

---

## 7. Offline-First Capability

### 7.1 Architecture

```
Online Mode:
  Transaction → Direct DB → Response
     ↓
  Receipt & Report Update

Offline Mode:
  Transaction → Local Queue → Local Response
     ↓
  Stored in offline_queue table

Reconnection:
  Sync Thread → Offline Queue → DB
     ↓
  Mark as synced / Failed
```

### 7.2 Implementation

**offline_queue Table:**
- Stores transaction JSON
- Status: pending → synced/failed
- Retry attempts tracked
- Error messages logged

**Synchronization:**
- On server restart/connection
- Automatic sync of pending transactions
- Retry logic with backoff
- Failed transactions logged for manual review

---

## 8. Error Handling & Logging

### 8.1 Error Response Format

```json
{
  "error": "Error message",
  "details": "Additional context"
}
```

### 8.2 Common Scenarios

| Scenario | HTTP Status | Handling |
|----------|------------|----------|
| Unauthorized | 401 | Redirect to login |
| Forbidden | 403 | Show access denied |
| Not found | 404 | Show not found message |
| Invalid data | 400 | Show field errors |
| Server error | 500 | Log and show generic message |

---

## 9. Performance Considerations

### 9.1 Database Indexing

```sql
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_transactions_date ON transactions(created_at);
CREATE INDEX idx_transactions_staff ON transactions(staff_id);
CREATE INDEX idx_products_category ON products(category);
```

### 9.2 Optimization Techniques

1. **Query Optimization:**
   - Use SELECT specific columns (not *)
   - Add WHERE clauses to limit results
   - Use indexes on frequently queried fields

2. **Caching:**
   - Cache menu on kiosk (static until restart)
   - Daily reports cached until next day

3. **Pagination:**
   - Limit results in transaction lists
   - Implement pagination for large datasets

---

## 10. Scalability Roadmap

### 10.1 Current Limitations

- Single server deployment
- SQLite (file-based, single writer)
- In-memory session storage
- No clustering

### 10.2 Future Enhancements

1. **Multi-Branch:**
   - Add branch_id to all relevant tables
   - Separate kiosk sessions per branch
   - Consolidated reporting

2. **Database Migration:**
   - PostgreSQL for concurrency
   - Horizontal scaling with load balancer
   - Connection pooling

3. **Session Management:**
   - Redis for distributed sessions
   - Cross-server session sharing

4. **API Optimization:**
   - GraphQL for flexible queries
   - Response caching
   - Rate limiting

---

## 11. Testing Strategy

### 11.1 Test Scenarios

**Functional Tests:**
1. User login/logout
2. Create POS transaction
3. Apply discounts
4. Process payment
5. Inventory updates
6. Kiosk ordering
7. Report generation

**Edge Cases:**
1. Insufficient inventory
2. Negative discounts
3. Invalid payment amounts
4. Session expiry
5. Concurrent transactions

**Performance Tests:**
1. Load with 100 concurrent users
2. Large inventory (1000+ products)
3. High transaction volume (1000+/day)

### 11.2 Manual Testing Checklist

- [ ] Login with valid credentials
- [ ] Create transaction with multiple items
- [ ] Apply Senior Citizen discount
- [ ] Process payment and view receipt
- [ ] Check inventory reduction
- [ ] Access kiosk without login
- [ ] Place kiosk order
- [ ] View dashboard metrics
- [ ] Generate reports
- [ ] Verify low-stock alerts

---

## 12. Deployment Guide

### 12.1 Local Development

```bash
# Install dependencies
npm install

# Start server
npm start

# Access
http://localhost:3000
```

### 12.2 Data Directory

```
project-root/
├── data/
│   └── kohisync.db  (auto-created on first run)
```

### 12.3 Sample Data

Auto-loaded on first startup if users table is empty

---

## 13. Objective Achievement Summary

| Objective | Feature | Status | Evidence |
|-----------|---------|--------|----------|
| OBJ1: Speed | Fast POS UI, quick entry | ✅ | pos.js, transaction controller |
| OBJ2: Flexibility | Multi-type discounts, post-receipt | ✅ | applyDiscount(), discount modal |
| OBJ3: Inventory | Real-time tracking, auto-deduction | ✅ | inventory routes, transaction processing |
| OBJ4: Experience | Kiosk ordering, no registration | ✅ | kiosk.js, kiosk routes |

---

## 14. Code Quality & Documentation

### 14.1 Documentation Standards

- All functions have JSDoc comments
- Database schema documented with objectives
- API endpoints clearly labeled
- Objective mappings in comments

### 14.2 Code Organization

- Separation of concerns (routes, controllers, models)
- Middleware for cross-cutting concerns
- DRY principles followed
- Consistent naming conventions

---

## 15. Conclusion

KohiSync demonstrates a complete, functional prototype for a POS and inventory system. The architecture follows best practices for:

✅ Scalability (organized structure, indexing)  
✅ Maintainability (clear code organization, documentation)  
✅ Functionality (all objectives met)  
✅ User Experience (intuitive interfaces for staff and customers)  
✅ Data Integrity (audit trails, constraints)  

The prototype is ready for:
- Testing and demonstration
- Feature refinement
- Production scaling
- Academic evaluation

---

**Document Version:** 1.0  
**Date:** February 4, 2026  
**Status:** Complete
