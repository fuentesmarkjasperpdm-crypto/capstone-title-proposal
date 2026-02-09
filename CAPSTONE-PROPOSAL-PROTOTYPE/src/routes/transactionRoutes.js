/**
 * POS Transaction Routes
 * OBJECTIVE 1: Fast transaction processing
 * OBJECTIVE 2: Flexible billing with discount support
 * OBJECTIVE 3: Inventory auto-deduction
 */

const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { isAuthenticated, isStaffOrAdmin } = require('../middleware/auth');

/**
 * POST /api/transactions
 * Staff/Admin endpoint - create new POS transaction
 * Body: { items: [{product_id, quantity, notes?}], customer_name?, notes? }
 */
router.post('/', isAuthenticated, isStaffOrAdmin, transactionController.createTransaction);

/**
 * POST /api/transactions/:transaction_id/discount
 * Staff/Admin endpoint - apply discount after receipt generation
 * OBJECTIVE 2: Support senior citizen, PWD, student discounts
 * Body: { discount_reason: 'senior_citizen|pwd|student|manual', discount_amount? }
 */
router.post('/:transaction_id/discount', isAuthenticated, isStaffOrAdmin, transactionController.applyDiscount);

/**
 * POST /api/transactions/:transaction_id/payment
 * Staff/Admin endpoint - process payment and finalize transaction
 * SCOPE: Cash payment only
 * Body: { amount_paid }
 */
router.post('/:transaction_id/payment', isAuthenticated, isStaffOrAdmin, transactionController.processPayment);

/**
 * GET /api/transactions/:transaction_id
 * Authenticated endpoint - get transaction details
 */
router.get('/:transaction_id', isAuthenticated, transactionController.getTransaction);

/**
 * GET /api/transactions/:transaction_id/receipt
 * Authenticated endpoint - generate/view receipt
 */
router.get('/:transaction_id/receipt', isAuthenticated, transactionController.generateReceipt);

/**
 * GET /api/transactions/kiosk/pending
 * Staff/Admin endpoint - get all pending kiosk orders
 * OBJECTIVE 4: Real-time notifications for kiosk orders
 */
router.get('/kiosk/pending', isAuthenticated, isStaffOrAdmin, transactionController.getPendingKioskOrders);

module.exports = router;
