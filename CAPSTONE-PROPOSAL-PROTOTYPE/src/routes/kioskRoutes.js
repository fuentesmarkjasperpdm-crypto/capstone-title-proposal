/**
 * Kiosk Routes
 * OBJECTIVE 4: Customer ordering via kiosk interface
 * SCOPE: No registration, session-based, payment at counter
 */

const express = require('express');
const router = express.Router();
const kioskController = require('../controllers/kioskController');

/**
 * POST /api/kiosk/session
 * Public endpoint - create new kiosk session (no authentication required)
 */
router.post('/session', kioskController.createKioskSession);

/**
 * GET /api/kiosk/menu
 * Public endpoint - view menu for kiosk
 * OBJECTIVE 4: Customers can browse menu
 */
router.get('/menu', kioskController.getKioskMenu);

/**
 * POST /api/kiosk/cart
 * Session-based endpoint - add item to cart
 * Body: { session_id, product_id, quantity, notes? }
 */
router.post('/cart', kioskController.addToCart);

/**
 * GET /api/kiosk/cart/:session_id
 * Session-based endpoint - view cart contents
 */
router.get('/cart/:session_id', kioskController.getCart);

/**
 * DELETE /api/kiosk/cart
 * Session-based endpoint - remove item from cart
 * Body: { session_id, product_id }
 */
router.delete('/cart', kioskController.removeFromCart);

/**
 * POST /api/kiosk/order
 * Session-based endpoint - submit order for payment at counter
 * OBJECTIVE 4: Place order without payment (payment at counter)
 * Body: { session_id, customer_name? }
 */
router.post('/order', kioskController.submitOrder);

module.exports = router;
