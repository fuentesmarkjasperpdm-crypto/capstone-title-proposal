/**
 * Authentication Middleware
 * OBJECTIVE MAPPING: OBJ1 - Secure login with role-based access control
 * SCOPE: Admin and Staff roles only (no customer authentication)
 */

const { dbGet } = require('../database');

/**
 * Check if user is authenticated
 * Verifies session contains user_id
 */
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user_id) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized. Please login.' });
    }
};

/**
 * Check if user has admin role
 * SCOPE: Only admins can manage users, inventory, generate reports
 */
const isAdmin = async (req, res, next) => {
    if (!req.session || !req.session.user_id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const user = await dbGet('SELECT role FROM users WHERE id = ?', [req.session.user_id]);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden. Admin access required.' });
        }
        req.user = user;
        next();
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
};

/**
 * Check if user is staff or admin (can create transactions)
 */
const isStaffOrAdmin = async (req, res, next) => {
    if (!req.session || !req.session.user_id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.session.user_id]);
        if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
            return res.status(403).json({ error: 'Forbidden. Staff access required.' });
        }
        req.user = user;
        next();
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
};

module.exports = {
    isAuthenticated,
    isAdmin,
    isStaffOrAdmin
};
