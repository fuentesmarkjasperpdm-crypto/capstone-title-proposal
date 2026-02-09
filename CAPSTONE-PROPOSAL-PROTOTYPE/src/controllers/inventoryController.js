/**
 * Inventory Management Controller
 * OBJECTIVE MAPPING:
 * OBJ3: Real-time inventory tracking with low-stock alerts
 * SCOPE: Admin-only manual adjustments, no supplier management
 */

const { dbRun, dbGet, dbAll } = require('../database');

/**
 * Get all products with current stock levels
 * OBJECTIVE 3: Staff/Admin can view inventory in real-time
 */
async function getInventory(req, res) {
    try {
        const products = await dbAll(
            `SELECT id, name, category, price, current_stock, unit, 
                    low_stock_threshold, 
                    CASE 
                        WHEN current_stock <= low_stock_threshold THEN 'low'
                        WHEN current_stock > low_stock_threshold THEN 'ok'
                    END as stock_status
            FROM products
            ORDER BY category, name`
        );

        // Calculate low-stock items count
        const lowStockItems = products.filter(p => p.stock_status === 'low');

        res.json({
            products: products,
            summary: {
                total_items: products.length,
                low_stock_count: lowStockItems.length,
                low_stock_items: lowStockItems
            }
        });
    } catch (err) {
        console.error('Error getting inventory:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Get single product details
 */
async function getProduct(req, res) {
    try {
        const { product_id } = req.params;

        const product = await dbGet(
            'SELECT * FROM products WHERE id = ?',
            [product_id]
        );

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ product });
    } catch (err) {
        console.error('Error getting product:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Add new product to menu/inventory
 * SCOPE: Admin only
 */
async function createProduct(req, res) {
    try {
        const { name, description, category, price, current_stock, unit, low_stock_threshold } = req.body;

        if (!name || !category || price === undefined) {
            return res.status(400).json({ error: 'name, category, and price required' });
        }

        if (!['beverage', 'food', 'ingredient'].includes(category)) {
            return res.status(400).json({ error: 'Invalid category' });
        }

        const result = await dbRun(
            `INSERT INTO products 
            (name, description, category, price, current_stock, unit, low_stock_threshold)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                name,
                description || null,
                category,
                price,
                current_stock || 0,
                unit || 'pieces',
                low_stock_threshold || 10
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            product_id: result.lastID
        });
    } catch (err) {
        console.error('Error creating product:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Adjust stock manually (Admin only)
 * OBJECTIVE 3: Admin can manually adjust inventory
 * SCOPE: Adjustments can be add, deduct, or correction
 * Examples: Damage, Spoilage, Stock count fixes, New shipments
 */
async function adjustStock(req, res) {
    try {
        const { product_id, adjustment_type, quantity_changed, reason } = req.body;
        const admin_id = req.session.user_id;

        if (!product_id || !adjustment_type || quantity_changed === undefined) {
            return res.status(400).json({ error: 'product_id, adjustment_type, and quantity_changed required' });
        }

        if (!['add', 'deduct', 'correction'].includes(adjustment_type)) {
            return res.status(400).json({ error: 'Invalid adjustment_type' });
        }

        // Get current product
        const product = await dbGet('SELECT * FROM products WHERE id = ?', [product_id]);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Calculate new stock
        let stock_change = quantity_changed;
        if (adjustment_type === 'deduct') {
            stock_change = -quantity_changed;
        } else if (adjustment_type === 'correction') {
            // For correction, quantity_changed is the new absolute stock level
            stock_change = quantity_changed - product.current_stock;
        }

        const new_stock = product.current_stock + stock_change;

        if (new_stock < 0) {
            return res.status(400).json({ error: 'Adjustment would result in negative stock' });
        }

        // Record adjustment in audit table
        await dbRun(
            `INSERT INTO inventory_adjustments 
            (product_id, adjustment_type, quantity_changed, reason, admin_id)
            VALUES (?, ?, ?, ?, ?)`,
            [product_id, adjustment_type, stock_change, reason || null, admin_id]
        );

        // Update product stock
        await dbRun(
            'UPDATE products SET current_stock = ? WHERE id = ?',
            [new_stock, product_id]
        );

        res.json({
            success: true,
            message: 'Stock adjusted successfully',
            adjustment: {
                product_id: product_id,
                previous_stock: product.current_stock,
                adjustment: stock_change,
                new_stock: new_stock,
                adjustment_type: adjustment_type,
                reason: reason
            }
        });
    } catch (err) {
        console.error('Error adjusting stock:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Get low-stock alert items
 * OBJECTIVE 3: Alerts when stock falls below threshold
 */
async function getLowStockItems(req, res) {
    try {
        const items = await dbAll(
            `SELECT id, name, category, current_stock, low_stock_threshold, 
                    (low_stock_threshold - current_stock) as stock_needed
            FROM products
            WHERE current_stock <= low_stock_threshold
            ORDER BY stock_needed DESC`
        );

        res.json({
            low_stock_items: items,
            count: items.length
        });
    } catch (err) {
        console.error('Error getting low-stock items:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Get inventory adjustment history (Admin only)
 * OBJECTIVE 3: Audit trail for stock changes
 */
async function getAdjustmentHistory(req, res) {
    try {
        const { product_id, days } = req.query;
        const lookbackDays = days ? parseInt(days) : 30;

        let query = `
            SELECT ia.*, p.name, u.full_name as admin_name
            FROM inventory_adjustments ia
            JOIN products p ON ia.product_id = p.id
            JOIN users u ON ia.admin_id = u.id
            WHERE ia.created_at >= datetime('now', '-${lookbackDays} days')
        `;
        const params = [];

        if (product_id) {
            query += ' AND ia.product_id = ?';
            params.push(product_id);
        }

        query += ' ORDER BY ia.created_at DESC';

        const history = await dbAll(query, params);
        res.json({ adjustments: history });
    } catch (err) {
        console.error('Error getting adjustment history:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Update product details (Admin only)
 */
async function updateProduct(req, res) {
    try {
        const { product_id } = req.params;
        const { name, description, price, unit, low_stock_threshold } = req.body;

        const product = await dbGet('SELECT * FROM products WHERE id = ?', [product_id]);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const updates = [];
        const values = [];

        if (name !== undefined) {
            updates.push('name = ?');
            values.push(name);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }
        if (price !== undefined) {
            updates.push('price = ?');
            values.push(price);
        }
        if (unit !== undefined) {
            updates.push('unit = ?');
            values.push(unit);
        }
        if (low_stock_threshold !== undefined) {
            updates.push('low_stock_threshold = ?');
            values.push(low_stock_threshold);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(product_id);

        await dbRun(
            `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        res.json({
            success: true,
            message: 'Product updated successfully'
        });
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

module.exports = {
    getInventory,
    getProduct,
    createProduct,
    adjustStock,
    getLowStockItems,
    getAdjustmentHistory,
    updateProduct
};
