/**
 * Authentication Routes
 * OBJECTIVE: Secure login with role-based access
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Public endpoint - staff/admin login
 */
router.post('/login', authController.login);

/**
 * POST /api/auth/logout
 * Authenticated endpoint - destroy session
 */
router.post('/logout', isAuthenticated, authController.logout);

/**
 * GET /api/auth/me
 * Authenticated endpoint - get current user info
 */
router.get('/me', isAuthenticated, authController.getCurrentUser);

/**
 * POST /api/auth/users
 * Admin-only endpoint - create new staff account
 */
router.post('/users', isAuthenticated, isAdmin, authController.createUser);

/**
 * GET /api/auth/users
 * Admin-only endpoint - list all users
 */
router.get('/users', isAuthenticated, isAdmin, authController.listUsers);

module.exports = router;
