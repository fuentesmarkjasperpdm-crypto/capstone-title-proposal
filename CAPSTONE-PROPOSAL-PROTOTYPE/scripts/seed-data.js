/**
 * Sample Data Seeding Script
 * Populates database with demo users, products, and sample transactions
 * for testing and demonstration purposes
 */

const { dbRun, dbGet, dbAll } = require('../src/database');

async function seedData() {
    try {
        console.log('🌱 Starting data seeding...');

        // =====================================================
        // Create Sample Users
        // =====================================================
        console.log('Creating sample users...');

        const users = [
            {
                username: 'admin',
                password: 'password123',
                full_name: 'Admin User',
                role: 'admin'
            },
            {
                username: 'cashier1',
                password: 'password123',
                full_name: 'Maria Santos',
                role: 'staff'
            },
            {
                username: 'cashier2',
                password: 'password123',
                full_name: 'Juan Dela Cruz',
                role: 'staff'
            }
        ];

        const userIds = {};
        for (const user of users) {
            const result = await dbRun(
                'INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)',
                [user.username, user.password, user.full_name, user.role]
            );
            userIds[user.username] = result.lastID;
            console.log(`  ✓ Created user: ${user.full_name} (${user.role})`);
        }

        // =====================================================
        // Create Sample Products
        // =====================================================
        console.log('\nCreating sample products...');

        const products = [
            // Beverages
            {
                name: 'Americano',
                description: 'Classic black coffee',
                category: 'beverage',
                price: 80,
                current_stock: 50,
                unit: 'cups',
                low_stock_threshold: 10
            },
            {
                name: 'Cappuccino',
                description: 'Espresso with steamed milk',
                category: 'beverage',
                price: 100,
                current_stock: 45,
                unit: 'cups',
                low_stock_threshold: 10
            },
            {
                name: 'Latte',
                description: 'Espresso with hot milk',
                category: 'beverage',
                price: 110,
                current_stock: 40,
                unit: 'cups',
                low_stock_threshold: 10
            },
            {
                name: 'Iced Coffee',
                description: 'Cold brewed coffee with ice',
                category: 'beverage',
                price: 95,
                current_stock: 35,
                unit: 'cups',
                low_stock_threshold: 10
            },
            {
                name: 'Mocha',
                description: 'Espresso with chocolate and milk',
                category: 'beverage',
                price: 120,
                current_stock: 30,
                unit: 'cups',
                low_stock_threshold: 10
            },
            {
                name: 'Macchiato',
                description: 'Espresso "marked" with milk foam',
                category: 'beverage',
                price: 105,
                current_stock: 25,
                unit: 'cups',
                low_stock_threshold: 10
            },
            {
                name: 'Hot Chocolate',
                description: 'Rich chocolate beverage',
                category: 'beverage',
                price: 85,
                current_stock: 20,
                unit: 'cups',
                low_stock_threshold: 8
            },

            // Food Items
            {
                name: 'Pastry - Croissant',
                description: 'Butter croissant',
                category: 'food',
                price: 45,
                current_stock: 30,
                unit: 'pieces',
                low_stock_threshold: 5
            },
            {
                name: 'Pastry - Muffin',
                description: 'Chocolate chip muffin',
                category: 'food',
                price: 50,
                current_stock: 25,
                unit: 'pieces',
                low_stock_threshold: 5
            },
            {
                name: 'Cake Slice',
                description: 'Chocolate or vanilla cake',
                category: 'food',
                price: 65,
                current_stock: 15,
                unit: 'pieces',
                low_stock_threshold: 3
            },
            {
                name: 'Sandwich - Ham & Cheese',
                description: 'Fresh sandwich with ham and cheese',
                category: 'food',
                price: 130,
                current_stock: 12,
                unit: 'pieces',
                low_stock_threshold: 5
            },

            // Ingredients (internal stock - not sold directly)
            {
                name: 'Coffee Beans - Robusta',
                description: 'Premium robusta beans',
                category: 'ingredient',
                price: 600,
                current_stock: 5,
                unit: 'kg',
                low_stock_threshold: 2
            },
            {
                name: 'Fresh Milk',
                description: 'Fresh cow milk',
                category: 'ingredient',
                price: 180,
                current_stock: 3,
                unit: 'liters',
                low_stock_threshold: 1
            },
            {
                name: 'Chocolate Syrup',
                description: 'Rich chocolate syrup',
                category: 'ingredient',
                price: 250,
                current_stock: 2,
                unit: 'liters',
                low_stock_threshold: 1
            }
        ];

        const productIds = {};
        for (const product of products) {
            const result = await dbRun(
                `INSERT INTO products 
                (name, description, category, price, current_stock, unit, low_stock_threshold)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    product.name,
                    product.description,
                    product.category,
                    product.price,
                    product.current_stock,
                    product.unit,
                    product.low_stock_threshold
                ]
            );
            productIds[product.name] = result.lastID;
            console.log(`  ✓ Created product: ${product.name} (${product.category})`);
        }

        // =====================================================
        // Create Sample Transactions
        // =====================================================
        console.log('\nCreating sample transactions...');

        const transactions = [
            {
                customer: 'John Doe',
                items: [
                    { product: 'Americano', quantity: 2, notes: '' },
                    { product: 'Pastry - Croissant', quantity: 1, notes: '' }
                ],
                discount_reason: null,
                discount_amount: 0
            },
            {
                customer: 'Maria Garcia',
                items: [
                    { product: 'Cappuccino', quantity: 1, notes: 'Extra hot' },
                    { product: 'Cake Slice', quantity: 1, notes: '' }
                ],
                discount_reason: 'senior_citizen',
                discount_amount: 34  // 20% discount
            },
            {
                customer: 'PWD Customer',
                items: [
                    { product: 'Latte', quantity: 1, notes: '' },
                    { product: 'Pastry - Muffin', quantity: 2, notes: '' }
                ],
                discount_reason: 'pwd',
                discount_amount: 43  // 20% discount
            },
            {
                customer: 'Student',
                items: [
                    { product: 'Iced Coffee', quantity: 1, notes: '' },
                    { product: 'Sandwich - Ham & Cheese', quantity: 1, notes: '' }
                ],
                discount_reason: 'student',
                discount_amount: 22.5  // 10% discount
            }
        ];

        for (const trans of transactions) {
            // Calculate total
            let total_before_discount = 0;
            for (const item of trans.items) {
                const productId = productIds[item.product];
                const product = await dbGet('SELECT price FROM products WHERE id = ?', [productId]);
                total_before_discount += product.price * item.quantity;
            }

            const total_after_discount = total_before_discount - (trans.discount_amount || 0);

            // Create transaction
            const transResult = await dbRun(
                `INSERT INTO transactions 
                (transaction_number, staff_id, customer_name, transaction_type, 
                 total_before_discount, discount_amount, discount_reason, total_after_discount, 
                 amount_paid, change_amount, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    `POS-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
                    userIds['cashier1'],
                    trans.customer,
                    'pos',
                    total_before_discount,
                    trans.discount_amount || 0,
                    trans.discount_reason,
                    total_after_discount,
                    total_after_discount,
                    0,
                    'completed'
                ]
            );

            // Add transaction items
            for (const item of trans.items) {
                const productId = productIds[item.product];
                const product = await dbGet('SELECT price FROM products WHERE id = ?', [productId]);
                const subtotal = product.price * item.quantity;

                await dbRun(
                    `INSERT INTO transaction_items 
                    (transaction_id, product_id, quantity, unit_price, subtotal, notes)
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [transResult.lastID, productId, item.quantity, product.price, subtotal, item.notes]
                );

                // Deduct inventory
                await dbRun(
                    'UPDATE products SET current_stock = current_stock - ? WHERE id = ?',
                    [item.quantity, productId]
                );
            }

            console.log(`  ✓ Created transaction for: ${trans.customer}`);
        }

        // =====================================================
        // Update Daily Report
        // =====================================================
        console.log('\nUpdating daily report...');

        const today = new Date().toISOString().split('T')[0];
        const dailyStats = await dbGet(
            `SELECT 
                COUNT(*) as total_transactions,
                SUM(total_after_discount) as total_revenue,
                SUM(discount_amount) as total_discounts
            FROM transactions
            WHERE DATE(created_at) = ? AND status = 'completed'`,
            [today]
        );

        await dbRun(
            `INSERT OR REPLACE INTO daily_reports 
            (report_date, total_transactions, total_revenue, total_discounts, total_items_sold)
            VALUES (?, ?, ?, ?, ?)`,
            [
                today,
                dailyStats.total_transactions || 0,
                dailyStats.total_revenue || 0,
                dailyStats.total_discounts || 0,
                0  // Would calculate from transaction_items if needed
            ]
        );

        console.log('✅ Sample data seeding completed successfully!\n');
        console.log('📝 Default Credentials:');
        console.log('   Username: admin');
        console.log('   Password: password123\n');
        console.log('   Username: cashier1');
        console.log('   Password: password123\n');

    } catch (err) {
        console.error('❌ Error seeding data:', err);
        throw err;
    }
}

module.exports = seedData;
