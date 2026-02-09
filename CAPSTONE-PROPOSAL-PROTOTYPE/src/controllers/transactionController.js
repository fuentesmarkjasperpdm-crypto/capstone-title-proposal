/**
 * POS Transaction Controller
 * OBJECTIVE MAPPING:
 * OBJ1: Improve transaction speed via fast POS interface
 * OBJ2: Flexible billing with discount application (including post-receipt)
 * OBJ3: Real-time inventory tracking with auto stock deduction
 */

const { dbRun, dbGet, dbAll } = require('../database');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a new POS transaction
 * SCOPE: Staff/Admin can create transactions at counter
 * Accepts items array with product_id, quantity, notes
 * Supports discount application AFTER receipt generation
 */
async function createTransaction(req, res) {
    try {
        const { items, customer_name, notes } = req.body;
        const staff_id = req.session.user_id;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Items array required and must not be empty' });
        }

        // Calculate totals
        let total_before_discount = 0;
        const processedItems = [];

        // Validate and price items
        for (const item of items) {
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
                notes: item.notes || ''
            });
        }

        // Generate transaction number (sequential)
        const lastTransaction = await dbGet(
            'SELECT transaction_number FROM transactions ORDER BY id DESC LIMIT 1'
        );
        let transactionNum = 1;
        if (lastTransaction && lastTransaction.transaction_number) {
            const lastNum = parseInt(lastTransaction.transaction_number.split('-')[1]) || 0;
            transactionNum = lastNum + 1;
        }
        const transaction_number = `POS-${String(transactionNum).padStart(6, '0')}`;

        // Insert transaction
        const result = await dbRun(
            `INSERT INTO transactions 
            (transaction_number, staff_id, customer_name, transaction_type, 
             total_before_discount, total_after_discount, amount_paid, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                transaction_number,
                staff_id,
                customer_name || null,
                'pos',
                total_before_discount,
                total_before_discount,
                total_before_discount,
                notes || null
            ]
        );

        const transaction_id = result.lastID;

        // Insert transaction items and update inventory
        for (const item of processedItems) {
            await dbRun(
                `INSERT INTO transaction_items 
                (transaction_id, product_id, quantity, unit_price, subtotal, notes)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    transaction_id,
                    item.product_id,
                    item.quantity,
                    item.unit_price,
                    item.subtotal,
                    item.notes
                ]
            );

            // OBJECTIVE 3: Auto deduct inventory
            await dbRun(
                'UPDATE products SET current_stock = current_stock - ? WHERE id = ?',
                [item.quantity, item.product_id]
            );
        }

        res.status(201).json({
            success: true,
            message: 'Transaction created successfully',
            transaction: {
                id: transaction_id,
                transaction_number: transaction_number,
                total_before_discount: total_before_discount,
                total_after_discount: total_before_discount,
                items: processedItems
            }
        });
    } catch (err) {
        console.error('Error creating transaction:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Apply discount to existing transaction
 * OBJECTIVE 2: Flexible billing - discounts can be applied AFTER receipt generation
 * SCOPE: Types: 'senior_citizen', 'pwd', 'student', 'manual'
 */
async function applyDiscount(req, res) {
    try {
        const { transaction_id, discount_reason, discount_amount } = req.body;

        if (!transaction_id || !discount_reason) {
            return res.status(400).json({ error: 'transaction_id and discount_reason required' });
        }

        // Get transaction
        const transaction = await dbGet(
            'SELECT * FROM transactions WHERE id = ?',
            [transaction_id]
        );

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Calculate discount amount if not provided
        let appliedDiscount = discount_amount || 0;
        if (!appliedDiscount && discount_reason !== 'manual') {
            // Default discount percentages
            const discounts = {
                senior_citizen: 0.20, // 20%
                pwd: 0.20,             // 20%
                student: 0.10          // 10%
            };
            appliedDiscount = transaction.total_before_discount * (discounts[discount_reason] || 0);
        }

        const new_total = Math.max(0, transaction.total_before_discount - appliedDiscount);

        // Update transaction
        await dbRun(
            `UPDATE transactions 
            SET discount_amount = ?, discount_reason = ?, total_after_discount = ?
            WHERE id = ?`,
            [appliedDiscount, discount_reason, new_total, transaction_id]
        );

        res.json({
            success: true,
            message: 'Discount applied successfully',
            transaction: {
                id: transaction_id,
                discount_amount: appliedDiscount,
                discount_reason: discount_reason,
                total_after_discount: new_total
            }
        });
    } catch (err) {
        console.error('Error applying discount:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Process payment and finalize transaction
 * SCOPE: Cash payment only (no online payments in prototype)
 */
async function processPayment(req, res) {
    try {
        const { transaction_id, amount_paid } = req.body;

        if (!transaction_id || amount_paid === undefined) {
            return res.status(400).json({ error: 'transaction_id and amount_paid required' });
        }

        const transaction = await dbGet(
            'SELECT * FROM transactions WHERE id = ?',
            [transaction_id]
        );

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const change_amount = amount_paid - transaction.total_after_discount;

        if (change_amount < 0) {
            return res.status(400).json({ error: 'Insufficient payment amount' });
        }

        // Update transaction status
        await dbRun(
            `UPDATE transactions 
            SET amount_paid = ?, change_amount = ?, status = 'completed'
            WHERE id = ?`,
            [amount_paid, change_amount, transaction_id]
        );

        // OBJECTIVE 3: Deduct inventory for kiosk orders when payment is completed
        if (transaction.transaction_type === 'kiosk') {
            const items = await dbAll(
                'SELECT product_id, quantity FROM transaction_items WHERE transaction_id = ?',
                [transaction_id]
            );
            for (const item of items) {
                await dbRun(
                    'UPDATE products SET current_stock = current_stock - ? WHERE id = ?',
                    [item.quantity, item.product_id]
                );
            }
        }

        // Update daily report
        await updateDailyReport(transaction);

        res.json({
            success: true,
            message: 'Payment processed successfully',
            transaction: {
                id: transaction_id,
                amount_paid: amount_paid,
                change_amount: change_amount,
                status: 'completed'
            }
        });
    } catch (err) {
        console.error('Error processing payment:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Get pending kiosk orders
 * OBJECTIVE 4: POS staff can see kiosk orders in real-time
 */
async function getPendingKioskOrders(req, res) {
    try {
        const orders = await dbAll(
            `SELECT t.id, t.transaction_number, t.customer_name, t.total_before_discount, 
                    t.total_after_discount, t.created_at, t.status,
                    COUNT(ti.id) as item_count
            FROM transactions t
            LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
            WHERE t.transaction_type = 'kiosk' AND t.status = 'pending'
            GROUP BY t.id
            ORDER BY t.created_at DESC`
        );

        // Enrich with item details
        const enrichedOrders = [];
        for (const order of orders) {
            const items = await dbAll(
                `SELECT ti.*, p.name, p.category
                FROM transaction_items ti
                JOIN products p ON ti.product_id = p.id
                WHERE ti.transaction_id = ?`,
                [order.id]
            );
            enrichedOrders.push({
                ...order,
                items: items
            });
        }

        res.json({
            success: true,
            pending_orders: enrichedOrders,
            count: enrichedOrders.length
        });
    } catch (err) {
        console.error('Error getting pending kiosk orders:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Get transaction details (for receipt printing)
 */
async function getTransaction(req, res) {
    try {
        const { transaction_id } = req.params;

        const transaction = await dbGet(
            'SELECT * FROM transactions WHERE id = ?',
            [transaction_id]
        );

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const items = await dbAll(
            `SELECT ti.*, p.name, p.category 
            FROM transaction_items ti
            JOIN products p ON ti.product_id = p.id
            WHERE ti.transaction_id = ?`,
            [transaction_id]
        );

        res.json({
            transaction: {
                ...transaction,
                items: items
            }
        });
    } catch (err) {
        console.error('Error getting transaction:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Generate receipt (HTML format for printing/display)
 */
async function generateReceipt(req, res) {
    try {
        const { transaction_id } = req.params;

        const transaction = await dbGet(
            `SELECT t.*, u.full_name as staff_name 
            FROM transactions t
            LEFT JOIN users u ON t.staff_id = u.id
            WHERE t.id = ?`,
            [transaction_id]
        );

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const items = await dbAll(
            `SELECT ti.*, p.name, p.category 
            FROM transaction_items ti
            JOIN products p ON ti.product_id = p.id
            WHERE ti.transaction_id = ?`,
            [transaction_id]
        );

        const receiptHTML = generateReceiptHTML(transaction, items);
        res.send(receiptHTML);
    } catch (err) {
        console.error('Error generating receipt:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Helper function to generate receipt HTML
 */
function generateReceiptHTML(transaction, items) {
    const itemsHTML = items.map(item => `
        <tr>
            <td>${item.name}</td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;">₱${item.unit_price.toFixed(2)}</td>
            <td style="text-align: right;">₱${item.subtotal.toFixed(2)}</td>
        </tr>
    `).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Receipt - ${transaction.transaction_number}</title>
            <style>
                body { font-family: monospace; max-width: 400px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; margin-bottom: 20px; }
                .header h1 { margin: 0; font-size: 24px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                table td, table th { padding: 8px; border-bottom: 1px solid #ccc; }
                th { text-align: left; font-weight: bold; }
                .total-section { margin: 20px 0; font-weight: bold; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                .separator { border-top: 2px solid #000; margin: 10px 0; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🍵 Yambie Kōhī 🍵</h1>
                <p>Receipt</p>
            </div>

            <div style="font-size: 12px; margin-bottom: 10px;">
                <p><strong>Transaction #:</strong> ${transaction.transaction_number}</p>
                <p><strong>Date:</strong> ${new Date(transaction.created_at).toLocaleString()}</p>
                <p><strong>Staff:</strong> ${transaction.staff_name || 'N/A'}</p>
                ${transaction.customer_name ? `<p><strong>Customer:</strong> ${transaction.customer_name}</p>` : ''}
            </div>

            <div class="separator"></div>

            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML}
                </tbody>
            </table>

            <div class="separator"></div>

            <div class="total-section">
                <div style="display: flex; justify-content: space-between;">
                    <span>Subtotal:</span>
                    <span>₱${transaction.total_before_discount.toFixed(2)}</span>
                </div>
                ${transaction.discount_amount > 0 ? `
                    <div style="display: flex; justify-content: space-between; color: green;">
                        <span>Discount (${transaction.discount_reason}):</span>
                        <span>-₱${transaction.discount_amount.toFixed(2)}</span>
                    </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; font-size: 16px;">
                    <span>TOTAL:</span>
                    <span>₱${transaction.total_after_discount.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Amount Paid:</span>
                    <span>₱${transaction.amount_paid.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; color: blue;">
                    <span>Change:</span>
                    <span>₱${transaction.change_amount.toFixed(2)}</span>
                </div>
            </div>

            <div class="separator"></div>

            <div class="footer">
                <p>Thank you for your purchase!</p>
                <p>Salamat sa inyong suporta!</p>
            </div>
        </body>
        </html>
    `;
}

/**
 * Helper function to update daily report
 * OBJECTIVE: Real-time metrics for dashboard
 */
async function updateDailyReport(transaction) {
    try {
        const today = new Date().toISOString().split('T')[0];

        const existingReport = await dbGet(
            'SELECT * FROM daily_reports WHERE report_date = ?',
            [today]
        );

        if (existingReport) {
            await dbRun(
                `UPDATE daily_reports 
                SET total_transactions = total_transactions + 1,
                    total_revenue = total_revenue + ?,
                    total_discounts = total_discounts + ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE report_date = ?`,
                [transaction.total_after_discount, transaction.discount_amount || 0, today]
            );
        } else {
            await dbRun(
                `INSERT INTO daily_reports 
                (report_date, total_transactions, total_revenue, total_discounts)
                VALUES (?, ?, ?, ?)`,
                [today, 1, transaction.total_after_discount, transaction.discount_amount || 0]
            );
        }
    } catch (err) {
        console.error('Error updating daily report:', err);
    }
}

module.exports = {
    createTransaction,
    applyDiscount,
    processPayment,
    getTransaction,
    generateReceipt,
    updateDailyReport,
    getPendingKioskOrders
};
