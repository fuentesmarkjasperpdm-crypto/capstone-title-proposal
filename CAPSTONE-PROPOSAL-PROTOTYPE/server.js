/**
 * =====================================================
 * KohiSync: POS & Inventory System for Yambie Kōhī
 * =====================================================
 * 
 * PROJECT CONTEXT:
 * Single local café requiring improved transaction speed,
 * billing flexibility, inventory tracking, and customer
 * queuing during peak hours.
 * 
 * CORE OBJECTIVES:
 * OBJ1: Improve transaction speed via POS interface
 * OBJ2: Flexible billing with discount support (Senior Citizen, PWD, Student)
 * OBJ3: Real-time inventory tracking with auto-deduction
 * OBJ4: Improve customer experience with kiosk ordering
 * 
 * TECHNICAL SCOPE:
 * - Single-branch deployment
 * - Local Wi-Fi network access only
 * - Session-based authentication (no online payments)
 * - SQLite database for local storage
 * - Offline transaction queue for connectivity resilience
 * 
 * LIMITATIONS (As per Chapter 1):
 * - No online payments
 * - No table reservations or scheduled orders
 * - No multi-branch support
 * - No supplier/procurement features
 * 
 * TECHNOLOGY STACK:
 * - Node.js + Express backend
 * - SQLite database
 * - Session-based authentication
 * - RESTful API architecture
 * =====================================================
 */

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// Database initialization
const { initializeDatabase } = require('./src/database');

// Route imports
const authRoutes = require('./src/routes/authRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes');
const inventoryRoutes = require('./src/routes/inventoryRoutes');
const kioskRoutes = require('./src/routes/kioskRoutes');
const reportRoutes = require('./src/routes/reportRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// Middleware Configuration
// =====================================================

// CORS configuration - allow local network access
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://192.168.*', 'http://*'],
    credentials: true
}));

// Body parser middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Session configuration
// OBJECTIVE: Session-based authentication for local Wi-Fi network
app.use(session({
    secret: process.env.SESSION_SECRET || 'kohisync-local-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// =====================================================
// API Routes Configuration
// =====================================================

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'KohiSync POS & Inventory System is running',
        timestamp: new Date().toISOString()
    });
});

// Authentication routes
// OBJECTIVE 1: Secure login with role-based access
app.use('/api/auth', authRoutes);

// Transaction routes
// OBJECTIVE 1: Fast transaction processing
// OBJECTIVE 2: Flexible billing with discounts
app.use('/api/transactions', transactionRoutes);

// Inventory routes
// OBJECTIVE 3: Real-time inventory management
app.use('/api/inventory', inventoryRoutes);

// Kiosk routes (public access for customer ordering)
// OBJECTIVE 4: Customer kiosk interface
app.use('/api/kiosk', kioskRoutes);

// Reports routes
// OBJECTIVE 1: Real-time metrics and reporting
app.use('/api/reports', reportRoutes);

// =====================================================
// Frontend Routes
// =====================================================

// Login page (serves to unauthenticated users)
app.get('/login', (req, res) => {
    if (req.session && req.session.user_id) {
        return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, 'public/pages/login.html'));
});

// Dashboard (protected - requires authentication)
app.get('/dashboard', (req, res) => {
    if (!req.session || !req.session.user_id) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public/pages/dashboard.html'));
});

// POS interface (protected)
app.get('/pos', (req, res) => {
    if (!req.session || !req.session.user_id) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public/pages/pos.html'));
});

// Inventory management (protected)
app.get('/inventory', (req, res) => {
    if (!req.session || !req.session.user_id) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public/pages/inventory.html'));
});

// Reports (protected)
app.get('/reports', (req, res) => {
    if (!req.session || !req.session.user_id) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public/pages/reports.html'));
});

// Kiosk interface (public - accessible via QR code)
// SCOPE: No registration required, accessible via local network
app.get('/kiosk', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/pages/kiosk.html'));
});

// Root redirect
app.get('/', (req, res) => {
    if (req.session && req.session.user_id) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

// =====================================================
// Error Handling Middleware
// =====================================================

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// =====================================================
// Server Initialization
// =====================================================

async function startServer() {
    try {
        // Initialize database schema
        console.log('Initializing database...');
        await initializeDatabase();
        console.log('Database initialized successfully');

        // Seed dummy data if database is empty
        const { dbGet } = require('./src/database');
        const userCount = await dbGet('SELECT COUNT(*) as count FROM users');
        if (userCount.count === 0) {
            console.log('Loading sample data...');
            await require('./scripts/seed-data')();
            console.log('Sample data loaded');
        }

        // Start server
        app.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════════════════════╗
║   🍵 KohiSync: POS & Inventory System for Yambie Kōhī  ║
╚════════════════════════════════════════════════════════╝

Server running on http://localhost:${PORT}

📋 AVAILABLE ENDPOINTS:
  
Staff/Admin Dashboard:
  • Login: http://localhost:${PORT}/login
  • Dashboard: http://localhost:${PORT}/dashboard
  • POS: http://localhost:${PORT}/pos
  • Inventory: http://localhost:${PORT}/inventory
  • Reports: http://localhost:${PORT}/reports

Customer Kiosk (No Login):
  • Kiosk: http://localhost:${PORT}/kiosk

API Documentation:
  • Health Check: GET /api/health
  • Auth: POST /api/auth/login, GET /api/auth/me
  • Transactions: POST/GET /api/transactions
  • Inventory: GET/POST /api/inventory
  • Reports: GET /api/reports/*
  • Kiosk: POST/GET /api/kiosk/*

🔧 DEVELOPMENT NOTES:
  • Default Credentials: admin / password123
  • Database: SQLite (data/kohisync.db)
  • Session Timeout: 24 hours
  • Single-branch, local Wi-Fi only
  
═══════════════════════════════════════════════════════════
            `);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

startServer();

module.exports = app;
