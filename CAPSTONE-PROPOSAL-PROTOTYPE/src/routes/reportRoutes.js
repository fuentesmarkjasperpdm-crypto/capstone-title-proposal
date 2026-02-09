/**
 * Reports Routes
 * OBJECTIVE 1: Real-time sales metrics and reporting
 * SCOPE: Daily and monthly reports only
 */

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { isAuthenticated, isStaffOrAdmin } = require('../middleware/auth');

/**
 * GET /api/reports/daily
 * Staff/Admin endpoint - daily sales report
 * Query: date? (ISO format, default: today)
 */
router.get('/daily', isAuthenticated, isStaffOrAdmin, reportController.getDailyReport);

/**
 * GET /api/reports/monthly
 * Staff/Admin endpoint - monthly sales report
 * Query: year?, month? (default: current month)
 */
router.get('/monthly', isAuthenticated, isStaffOrAdmin, reportController.getMonthlyReport);

/**
 * GET /api/reports/top-products
 * Staff/Admin endpoint - best-selling products
 * Query: days? (default: 7)
 */
router.get('/top-products', isAuthenticated, isStaffOrAdmin, reportController.getTopSellingProducts);

/**
 * GET /api/reports/discounts
 * Staff/Admin endpoint - discount analysis
 * Query: days? (default: 30)
 */
router.get('/discounts', isAuthenticated, isStaffOrAdmin, reportController.getDiscountReport);

/**
 * GET /api/reports/transaction-types
 * Staff/Admin endpoint - POS vs Kiosk breakdown
 * Query: days? (default: 7)
 */
router.get('/transaction-types', isAuthenticated, isStaffOrAdmin, reportController.getTransactionTypeReport);

/**
 * GET /api/reports/hourly-trend
 * Staff/Admin endpoint - hourly transaction trend
 * Query: date? (default: today)
 */
router.get('/hourly-trend', isAuthenticated, isStaffOrAdmin, reportController.getHourlyTrend);

module.exports = router;
