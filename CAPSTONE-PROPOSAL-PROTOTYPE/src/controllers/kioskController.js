/**
 * Kiosk Controller
 * OBJECTIVE MAPPING:
 * OBJ4: Customer ordering via kiosk/QR interface
 * SCOPE: No registration required, temporary session-based ordering
 * Payment handled at counter (not in kiosk)
 */

const { dbRun, dbGet, dbAll } = require('../database');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a new kiosk session
 * SCOPE: No authentication required - accessible via QR code
 * Returns session_id for customer to use
 */
async function createKioskSession(req, res) {
    try {
        const session_id = uuidv4();
        const expires_at = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        // Session expires in 30 minutes

        await dbRun(
            `INSERT INTO kiosk_sessions (session_id, order_items, status, expires_at)
            VALUES (?, ?, ?, ?)`,
            [session_id, '[]', 'active', expires_at]
        );

        res.status(201).json({
            success: true,
            message: 'Kiosk session created',
            session_id: session_id,
            expires_in_minutes: 30
        });
    } catch (err) {
        console.error('Error creating kiosk session:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Get menu for kiosk display
 * OBJECTIVE 4: Customers browse menu items
 */
async function getKioskMenu(req, res) {
    try {
        // Only show beverage and food items (not internal ingredients)
        const products = await dbAll(
            `SELECT id, name, description, category, price, current_stock
            FROM products
            WHERE category IN ('beverage', 'food')
            AND current_stock > 0
            ORDER BY category, name`
        );

        const grouped = {
            beverages: products.filter(p => p.category === 'beverage'),
            food: products.filter(p => p.category === 'food')
        };

        res.json({ menu: grouped });
    } catch (err) {
        console.error('Error getting kiosk menu:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Add item to kiosk session cart
 * SCOPE: Build up order before submission to POS
 */
async function addToCart(req, res) {
    try {
        const { session_id, product_id, quantity, notes } = req.body;

        if (!session_id || !product_id || !quantity) {
            return res.status(400).json({ error: 'session_id, product_id, and quantity required' });
        }

        // Validate session
        const session = await dbGet(
            `SELECT * FROM kiosk_sessions 
            WHERE session_id = ? AND status = 'active' AND expires_at > datetime('now')`,
            [session_id]
        );

        if (!session) {
            return res.status(404).json({ error: 'Session not found or expired' });
        }

        // Validate product
        const product = await dbGet(
            'SELECT * FROM products WHERE id = ? AND category IN (?, ?)',
            [product_id, 'beverage', 'food']
        );

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Parse current order items
        const orderItems = JSON.parse(session.order_items || '[]');

        // Check if item already in cart
        const existingItem = orderItems.find(item => item.product_id === product_id);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            orderItems.push({
                product_id: product_id,
                quantity: quantity,
                notes: notes || ''
            });
        }

        // Update session
        await dbRun(
            'UPDATE kiosk_sessions SET order_items = ?, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?',
            [JSON.stringify(orderItems), session_id]
        );

        res.json({
            success: true,
            message: 'Item added to cart',
            session_id: session_id,
            order_items: orderItems
        });
    } catch (err) {
        console.error('Error adding to cart:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Get current kiosk session cart
 */
async function getCart(req, res) {
    try {
        const { session_id } = req.params;

        const session = await dbGet(
            'SELECT * FROM kiosk_sessions WHERE session_id = ?',
            [session_id]
        );

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const orderItems = JSON.parse(session.order_items || '[]');

        // Enrich with product details and calculate total
        let cart = [];
        let total = 0;

        for (const item of orderItems) {
            const product = await dbGet('SELECT * FROM products WHERE id = ?', [item.product_id]);
            if (product) {
                const subtotal = product.price * item.quantity;
                total += subtotal;
                cart.push({
                    product_id: item.product_id,
                    product_name: product.name,
                    quantity: item.quantity,
                    unit_price: product.price,
                    subtotal: subtotal,
                    notes: item.notes
                });
            }
        }

        res.json({
            session_id: session_id,
            cart: cart,
            total: total,
            item_count: cart.length,
            status: session.status
        });
    } catch (err) {
        console.error('Error getting cart:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Remove item from kiosk cart
 */
async function removeFromCart(req, res) {
    try {
        const { session_id, product_id } = req.body;

        const session = await dbGet(
            'SELECT * FROM kiosk_sessions WHERE session_id = ?',
            [session_id]
        );

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const orderItems = JSON.parse(session.order_items || '[]');
        const updatedItems = orderItems.filter(item => item.product_id !== product_id);

        await dbRun(
            'UPDATE kiosk_sessions SET order_items = ?, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?',
            [JSON.stringify(updatedItems), session_id]
        );

        res.json({
            success: true,
            message: 'Item removed from cart',
            session_id: session_id,
            order_items: updatedItems
        });
    } catch (err) {
        console.error('Error removing from cart:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Submit kiosk order
 * SCOPE: Creates transaction from kiosk session, payment at counter
 * Order placed but not paid - counter staff processes payment
 */
async function submitOrder(req, res) {
    try {
        const { session_id, customer_name } = req.body;

        const session = await dbGet(
            'SELECT * FROM kiosk_sessions WHERE session_id = ?',
            [session_id]
        );

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const orderItems = JSON.parse(session.order_items || '[]');

        if (orderItems.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        // Use system admin (default staff_id = 1) for kiosk orders
        const systemStaffId = 1;

        // Calculate total
        let total_before_discount = 0;
        const processedItems = [];

        for (const item of orderItems) {
            const product = await dbGet('SELECT * FROM products WHERE id = ?', [item.product_id]);
            if (!product) {
                return res.status(404).json({ error: `Product ${item.product_id} not found` });
            }

            const subtotal = product.price * item.quantity;
            total_before_discount += subtotal;

            processedItems.push({
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: product.price,
                subtotal: subtotal,
                notes: item.notes
            });
        }

        // Generate transaction number
        const lastTransaction = await dbGet(
            'SELECT transaction_number FROM transactions ORDER BY id DESC LIMIT 1'
        );
        let transactionNum = 1;
        if (lastTransaction && lastTransaction.transaction_number) {
            const lastNum = parseInt(lastTransaction.transaction_number.split('-')[1]) || 0;
            transactionNum = lastNum + 1;
        }
        const transaction_number = `KIOSK-${String(transactionNum).padStart(6, '0')}`;

        // Insert transaction
        const result = await dbRun(
            `INSERT INTO transactions 
            (transaction_number, staff_id, customer_name, transaction_type, 
             total_before_discount, total_after_discount, amount_paid, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                transaction_number,
                systemStaffId,
                customer_name || `Kiosk Customer`,
                'kiosk',
                total_before_discount,
                total_before_discount,
                0,
                'pending'
            ]
        );

        const transaction_id = result.lastID;

        // Insert transaction items (DO NOT deduct inventory yet - payment pending)
        for (const item of processedItems) {
            await dbRun(
                `INSERT INTO transaction_items 
                (transaction_id, product_id, quantity, unit_price, subtotal, notes)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [transaction_id, item.product_id, item.quantity, item.unit_price, item.subtotal, item.notes]
            );
        }

        // Mark session as submitted
        await dbRun(
            'UPDATE kiosk_sessions SET status = ? WHERE session_id = ?',
            ['submitted', session_id]
        );

        res.status(201).json({
            success: true,
            message: 'Order submitted successfully',
            order: {
                transaction_id: transaction_id,
                transaction_number: transaction_number,
                customer_name: customer_name || 'Kiosk Customer',
                total: total_before_discount,
                item_count: processedItems.length,
                status: 'pending_payment'
            }
        });
    } catch (err) {
        console.error('Error submitting order:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

module.exports = {
    createKioskSession,
    getKioskMenu,
    addToCart,
    getCart,
    removeFromCart,
    submitOrder
};
