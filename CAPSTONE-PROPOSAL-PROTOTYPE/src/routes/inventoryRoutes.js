/**
 * Inventory Management Routes
 * OBJECTIVE 3: Real-time inventory tracking
 * SCOPE: Admin-only manual adjustments, no supplier features
 */

const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { isAuthenticated, isAdmin, isStaffOrAdmin } = require('../middleware/auth');

/**
 * GET /api/inventory
 * Staff/Admin endpoint - view all products with stock levels
 * OBJECTIVE 3: Real-time inventory view
 */
router.get('/', isAuthenticated, isStaffOrAdmin, inventoryController.getInventory);

/**
 * GET /api/inventory/:product_id
 * Staff/Admin endpoint - get single product details
 */
router.get('/:product_id', isAuthenticated, isStaffOrAdmin, inventoryController.getProduct);

/**
 * POST /api/inventory/products
 * Admin-only endpoint - add new product to menu
 */
router.post('/products', isAuthenticated, isAdmin, inventoryController.createProduct);

/**
 * PUT /api/inventory/:product_id
 * Admin-only endpoint - update product details
 */
router.put('/:product_id', isAuthenticated, isAdmin, inventoryController.updateProduct);

/**
 * POST /api/inventory/adjust
 * Admin-only endpoint - manually adjust stock
 * OBJECTIVE 3: Support for damage, spoilage, corrections
 * Body: { product_id, adjustment_type: 'add|deduct|correction', quantity_changed, reason? }
 */
router.post('/adjust', isAuthenticated, isAdmin, inventoryController.adjustStock);

/**
 * GET /api/inventory/low-stock
 * Staff/Admin endpoint - view low-stock alerts
 * OBJECTIVE 3: Real-time low-stock indicators
 */
router.get('/low-stock', isAuthenticated, isStaffOrAdmin, inventoryController.getLowStockItems);

/**
 * GET /api/inventory/adjustments/history
 * Admin-only endpoint - audit trail for inventory changes
 * Query: product_id?, days? (default 30)
 */
router.get('/adjustments/history', isAuthenticated, isAdmin, inventoryController.getAdjustmentHistory);

module.exports = router;
