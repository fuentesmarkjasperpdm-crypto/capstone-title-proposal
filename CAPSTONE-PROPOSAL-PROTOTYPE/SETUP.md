# 🚀 KohiSync Setup & Deployment Guide

## Quick Start (5 Minutes)

### 1. Install Dependencies
```bash
cd c:\Users\Mark jasper\OneDrive\Documents\CAPSTONE\CAPSTONE-PROPOSAL-PROTOTYPE
npm install
```

### 2. Start the Server
```bash
npm start
```

### 3. Access the System

| Interface | URL | Login | Purpose |
|-----------|-----|-------|---------|
| **Dashboard** | http://localhost:3000 | Required | Staff/Admin main dashboard |
| **Staff Login** | http://localhost:3000/login | Required | Authentication |
| **POS** | http://localhost:3000/pos | Required | Create transactions |
| **Inventory** | http://localhost:3000/inventory | Required | Manage stock |
| **Reports** | http://localhost:3000/reports | Required | View analytics |
| **Kiosk** | http://localhost:3000/kiosk | **Not Required** | Customer ordering |

---

## 🔐 Default Login Credentials

### Admin Account
```
Username: admin
Password: password123
```

### Cashier Account
```
Username: cashier1
Password: password123
```

---

## 📂 Project Structure

```
kohisync/
├── server.js                 # Main application entry
├── package.json              # Node dependencies
├── README.md                 # Main documentation
├── ARCHITECTURE.md           # Technical architecture
├── SETUP.md                  # This file
│
├── src/
│   ├── database/
│   │   ├── index.js          # Database connection
│   │   └── schema.sql        # Database schema
│   │
│   ├── routes/               # API route definitions
│   │   ├── authRoutes.js
│   │   ├── transactionRoutes.js
│   │   ├── inventoryRoutes.js
│   │   ├── kioskRoutes.js
│   │   └── reportRoutes.js
│   │
│   ├── controllers/          # Business logic
│   │   ├── authController.js
│   │   ├── transactionController.js
│   │   ├── inventoryController.js
│   │   ├── kioskController.js
│   │   └── reportController.js
│   │
│   └── middleware/
│       └── auth.js           # Authentication middleware
│
├── public/
│   ├── pages/                # HTML pages
│   │   ├── login.html
│   │   ├── dashboard.html
│   │   ├── pos.html
│   │   ├── inventory.html
│   │   ├── reports.html
│   │   └── kiosk.html
│   │
│   ├── js/                   # Client-side JavaScript
│   │   ├── dashboard.js
│   │   ├── pos.js
│   │   └── kiosk.js
│   │
│   └── css/
│       └── styles.css        # Global styles
│
├── scripts/
│   └── seed-data.js          # Sample data generator
│
└── data/
    └── kohisync.db           # SQLite database (auto-created)
```

---

## 🎯 System Features Checklist

### ✅ Staff/Admin Dashboard
- [x] Login page
- [x] Dashboard with real-time metrics
- [x] Today's transactions count
- [x] Today's revenue
- [x] Low stock items count
- [x] Recent transactions list
- [x] Low stock alerts

### ✅ POS Interface
- [x] Product menu display
- [x] Add items to cart
- [x] View/manage cart
- [x] Calculate totals
- [x] Apply discounts (SC/PWD/Student/Manual)
- [x] Process payments
- [x] Generate receipts
- [x] Automatic inventory deduction

### ✅ Inventory Management
- [x] View all products
- [x] Real-time stock levels
- [x] Low-stock indicators
- [x] Stock status (OK/Low)
- [x] Product categories

### ✅ Customer Kiosk
- [x] Public access (no login)
- [x] Menu browsing
- [x] Session-based cart
- [x] Add/remove items
- [x] Order submission
- [x] Order confirmation with transaction number

### ✅ Reports & Analytics
- [x] Daily sales summary
- [x] Monthly reports
- [x] Top-selling products
- [x] Discount analysis
- [x] Transaction type breakdown
- [x] Hourly trends

---

## 🗄️ Database Information

### Location
```
data/kohisync.db
```

### Tables (8 total)

1. **users** - Staff and admin accounts
2. **products** - Menu items and ingredients
3. **transactions** - All orders (POS and kiosk)
4. **transaction_items** - Items within each order
5. **inventory_adjustments** - Stock change audit trail
6. **kiosk_sessions** - Temporary customer sessions
7. **daily_reports** - Aggregated daily metrics
8. **offline_queue** - Pending sync transactions

### Sample Data
Automatically loaded on first run:

**Users:**
- 1 Admin
- 2 Cashiers

**Products:**
- 7 Beverages (Americano, Cappuccino, Latte, etc.)
- 4 Food items (Croissants, Muffins, Cakes, Sandwiches)
- 3 Ingredients (Coffee Beans, Milk, Chocolate Syrup)

**Transactions:**
- 4 Sample transactions with various discounts

---

## 🔧 Configuration

### Server Port
Default: `3000`

Change in `server.js`:
```javascript
const PORT = process.env.PORT || 3000;
```

Or set environment variable:
```bash
set PORT=8080
npm start
```

### Session Configuration
File: `server.js` (line ~50)

```javascript
app.use(session({
    secret: 'kohisync-local-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
```

### Database
- **Type:** SQLite3
- **File:** `data/kohisync.db` (auto-created)
- **Schema:** Auto-initialized from `src/database/schema.sql`

---

## 🧪 Testing the System

### Test 1: POS Transaction
1. Login: admin / password123
2. Go to POS
3. Add items (Americano, Pastry)
4. Apply "Senior Citizen Discount"
5. Proceed to payment
6. View receipt

**Expected:** 
- Inventory decreased
- Transaction recorded
- Discount applied (20%)

### Test 2: Kiosk Ordering
1. Navigate to http://localhost:3000/kiosk
2. Select items (no login required)
3. Add to cart
4. Submit order
5. See confirmation with order number

**Expected:**
- Order number generated
- No payment processed (counter payment only)

### Test 3: Inventory Check
1. Login as staff (cashier1)
2. Go to Inventory
3. Verify stock levels match POS orders

**Expected:**
- Stock decreased after transactions

### Test 4: Reports
1. Login as any staff
2. Go to Reports
3. View today's summary
4. Check discount analysis

**Expected:**
- Revenue matches transactions
- Discounts recorded
- Top products shown

---

## 📊 Daily Operations

### Morning (Opening)
1. Staff logs in
2. Check dashboard for inventory status
3. Verify low-stock items
4. Check previous day's revenue (Reports)

### Throughout Day
1. Process customer orders via POS
2. Use kiosk for customer self-ordering
3. Monitor inventory levels
4. Apply discounts as needed

### Evening (Closing)
1. View daily sales report
2. Check transaction count
3. Review inventory changes
4. Logout

---

## ⚠️ Common Issues & Solutions

### Issue: Port Already in Use
```bash
# Kill process on port 3000
# Windows PowerShell:
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force

# Or use different port:
set PORT=3001
npm start
```

### Issue: Database Not Created
**Solution:** Restart server - it will auto-initialize

### Issue: Sample Data Not Loaded
**Solution:** 
1. Delete `data/kohisync.db`
2. Restart server
3. Seed data will auto-load

### Issue: Session Lost / Redirect to Login
**Solution:** Normal behavior - session expires after 24 hours or browser close

### Issue: Cart Not Updating
**Solution:** Refresh page or check browser console for errors

---

## 🔍 Database Inspection

### View Database (Windows)
Option 1: Use SQLite GUI tool (DB Browser for SQLite)
```bash
# Download from: https://sqlitebrowser.org/
# Open: data/kohisync.db
```

Option 2: Use SQLite CLI
```bash
# Requires SQLite installed
sqlite3 data/kohisync.db
```

### Common Queries

**View all users:**
```sql
SELECT * FROM users;
```

**View products:**
```sql
SELECT * FROM products WHERE category = 'beverage';
```

**View today's transactions:**
```sql
SELECT * FROM transactions WHERE DATE(created_at) = DATE('now');
```

**View inventory changes:**
```sql
SELECT * FROM inventory_adjustments ORDER BY created_at DESC;
```

---

## 🚀 Deployment to Production

### Prerequisites
- Node.js (v14+)
- PostgreSQL (recommended) or MySQL
- SSL Certificate (HTTPS)
- Web server (Nginx/Apache)
- Process manager (PM2)

### Steps

1. **Update Dependencies**
   ```bash
   npm update
   npm audit fix
   ```

2. **Configure for Production**
   - Update `server.js`: Set `secure: true` in session cookie
   - Use bcrypt for password hashing
   - Enable CSRF protection
   - Implement rate limiting

3. **Database Migration**
   - Migrate from SQLite to PostgreSQL/MySQL
   - Implement connection pooling
   - Set up automated backups

4. **Security Hardening**
   - Use environment variables for secrets
   - Enable HTTPS
   - Implement API rate limiting
   - Add request validation

5. **Deployment**
   ```bash
   # Install PM2 (process manager)
   npm install -g pm2
   
   # Start with PM2
   pm2 start server.js --name "kohisync"
   
   # Configure Nginx as reverse proxy
   # Point to http://localhost:3000
   ```

---

## 📈 Performance Optimization

### Enable Query Caching
Products menu is largely static - cache on load

### Database Indexes
Already configured in schema:
```sql
CREATE INDEX idx_transactions_date ON transactions(created_at);
CREATE INDEX idx_products_category ON products(category);
```

### Response Compression
Add compression middleware:
```javascript
const compression = require('compression');
app.use(compression());
```

---

## 🔐 Security Checklist

- [ ] Change default session secret
- [ ] Implement password hashing (bcrypt)
- [ ] Enable HTTPS/SSL
- [ ] Add CORS restrictions
- [ ] Implement rate limiting
- [ ] Add input validation
- [ ] Set secure cookies (httpOnly, secure flags)
- [ ] Implement CSRF protection
- [ ] Add request logging
- [ ] Set up error monitoring

---

## 📞 Troubleshooting

### Logs & Debugging
Check browser console (F12) for client-side errors

Server logs print to console, including:
- Connection status
- Database initialization
- API requests (if logging enabled)

### Enable Debug Mode
Set environment variable:
```bash
set NODE_ENV=development
npm start
```

### Clear Cache
```bash
# Clear session files (if using file-based sessions)
# Delete session directory or restart server

# Clear browser cache
Ctrl+Shift+Delete (Chrome/Firefox)
```

---

## 📚 Documentation Files

1. **README.md** - Overview and quick start
2. **ARCHITECTURE.md** - Technical architecture details
3. **SETUP.md** - This file (deployment guide)
4. **schema.sql** - Database schema with comments
5. **Code Comments** - Objective mappings in source code

---

## 🎓 Learning Resources

### For Understanding the Code
1. Start with `README.md` (overview)
2. Read `ARCHITECTURE.md` (design details)
3. Check `server.js` (main entry point)
4. Explore `src/routes/` (API structure)
5. Review `public/pages/` (UI implementation)

### For Database Understanding
1. Read `src/database/schema.sql` (with comments)
2. Check `src/database/index.js` (connection setup)
3. Explore `src/controllers/` (data access patterns)

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Server starts without errors
- [ ] Database created at `data/kohisync.db`
- [ ] Sample data loaded (check dashboard)
- [ ] Can login with admin/password123
- [ ] POS interface displays products
- [ ] Kiosk accessible without login
- [ ] Dashboard shows today's metrics
- [ ] Reports page loads

---

## 📞 Support & Contact

For issues with the prototype:
1. Check README.md
2. Review ARCHITECTURE.md for technical details
3. Check code comments for objective mappings
4. Review database schema for data structure
5. Inspect browser console for client errors
6. Check server output for API errors

---

**Last Updated:** February 4, 2026  
**Version:** 0.1.0 (Prototype)  
**Status:** Ready for Deployment
