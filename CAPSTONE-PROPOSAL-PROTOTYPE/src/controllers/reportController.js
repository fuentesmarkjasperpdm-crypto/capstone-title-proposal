/**
 * Reports Controller
 * OBJECTIVE MAPPING:
 * OBJ1: Real-time metrics and reporting (daily/monthly)
 * SCOPE: Basic daily and monthly sales reports only (no advanced analytics)
 */

const { dbGet, dbAll } = require('../database');

/**
 * Get daily sales report
 * OBJECTIVE 1: Real-time sales metrics for dashboard
 */
async function getDailyReport(req, res) {
    try {
        const { date } = req.query;
        const reportDate = date || new Date().toISOString().split('T')[0];

        const report = await dbGet(
            'SELECT * FROM daily_reports WHERE report_date = ?',
            [reportDate]
        );

        if (!report) {
            return res.json({
                report_date: reportDate,
                total_transactions: 0,
                total_revenue: 0,
                total_discounts: 0,
                total_items_sold: 0,
                average_transaction: 0
            });
        }

        // Calculate average transaction value
        const average_transaction = report.total_transactions > 0 
            ? (report.total_revenue / report.total_transactions).toFixed(2)
            : 0;

        // Get transaction details
        const transactions = await dbAll(
            `SELECT transaction_number, total_before_discount, discount_amount, 
                    total_after_discount, amount_paid, created_at
            FROM transactions
            WHERE DATE(created_at) = ? AND status = 'completed'
            ORDER BY created_at DESC`,
            [reportDate]
        );

        res.json({
            report_date: reportDate,
            total_transactions: report.total_transactions,
            total_revenue: report.total_revenue,
            total_discounts: report.total_discounts,
            total_items_sold: report.total_items_sold,
            average_transaction: average_transaction,
            transactions: transactions
        });
    } catch (err) {
        console.error('Error getting daily report:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Get monthly sales report
 * OBJECTIVE 1: Monthly trend analysis for management
 */
async function getMonthlyReport(req, res) {
    try {
        const { year, month } = req.query;
        const now = new Date();
        const reportYear = year || now.getFullYear();
        const reportMonth = month ? String(month).padStart(2, '0') : String(now.getMonth() + 1).padStart(2, '0');

        // Get daily reports for the month
        const dailyReports = await dbAll(
            `SELECT * FROM daily_reports 
            WHERE strftime('%Y', report_date) = ? AND strftime('%m', report_date) = ?
            ORDER BY report_date DESC`,
            [reportYear, reportMonth]
        );

        // Aggregate data
        let total_transactions = 0;
        let total_revenue = 0;
        let total_discounts = 0;
        let total_items_sold = 0;

        dailyReports.forEach(daily => {
            total_transactions += daily.total_transactions;
            total_revenue += daily.total_revenue;
            total_discounts += daily.total_discounts;
            total_items_sold += daily.total_items_sold;
        });

        const average_daily_revenue = dailyReports.length > 0
            ? (total_revenue / dailyReports.length).toFixed(2)
            : 0;

        const average_transaction = total_transactions > 0
            ? (total_revenue / total_transactions).toFixed(2)
            : 0;

        res.json({
            period: `${reportYear}-${reportMonth}`,
            total_days: dailyReports.length,
            total_transactions: total_transactions,
            total_revenue: total_revenue,
            total_discounts: total_discounts,
            total_items_sold: total_items_sold,
            average_daily_revenue: average_daily_revenue,
            average_transaction: average_transaction,
            daily_breakdown: dailyReports
        });
    } catch (err) {
        console.error('Error getting monthly report:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Get top-selling products report
 * OBJECTIVE 1: Sales analytics for menu optimization
 */
async function getTopSellingProducts(req, res) {
    try {
        const { days } = req.query;
        const lookbackDays = days ? parseInt(days) : 7; // Default to last 7 days

        const products = await dbAll(
            `SELECT 
                p.id, p.name, p.category, 
                SUM(ti.quantity) as total_quantity,
                SUM(ti.subtotal) as total_revenue,
                COUNT(DISTINCT ti.transaction_id) as times_sold,
                ROUND(SUM(ti.subtotal) / SUM(ti.quantity), 2) as avg_item_price
            FROM transaction_items ti
            JOIN products p ON ti.product_id = p.id
            JOIN transactions t ON ti.transaction_id = t.id
            WHERE t.created_at >= datetime('now', '-${lookbackDays} days')
            AND t.status = 'completed'
            GROUP BY p.id, p.name, p.category
            ORDER BY total_revenue DESC
            LIMIT 20`,
            []
        );

        res.json({
            period_days: lookbackDays,
            top_products: products
        });
    } catch (err) {
        console.error('Error getting top-selling products:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Get discount analysis report
 * OBJECTIVE 2: Track discount usage and impact
 */
async function getDiscountReport(req, res) {
    try {
        const { days } = req.query;
        const lookbackDays = days ? parseInt(days) : 30;

        const discounts = await dbAll(
            `SELECT 
                discount_reason,
                COUNT(*) as usage_count,
                SUM(discount_amount) as total_discount_given,
                ROUND(AVG(discount_amount), 2) as avg_discount,
                SUM(total_before_discount) as total_sales_before_discount
            FROM transactions
            WHERE discount_amount > 0 
            AND created_at >= datetime('now', '-${lookbackDays} days')
            AND status = 'completed'
            GROUP BY discount_reason
            ORDER BY usage_count DESC`,
            []
        );

        // Calculate impact metrics
        const totalDiscounts = discounts.reduce((sum, d) => sum + d.total_discount_given, 0);
        const totalSalesBeforeDiscount = discounts.reduce((sum, d) => sum + d.total_sales_before_discount, 0);
        const discountRate = totalSalesBeforeDiscount > 0 
            ? ((totalDiscounts / totalSalesBeforeDiscount) * 100).toFixed(2)
            : 0;

        res.json({
            period_days: lookbackDays,
            summary: {
                total_discounts_given: totalDiscounts,
                total_sales_affected: totalSalesBeforeDiscount,
                discount_rate_percent: discountRate
            },
            discount_breakdown: discounts
        });
    } catch (err) {
        console.error('Error getting discount report:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Get transaction type breakdown (POS vs Kiosk)
 * OBJECTIVE: Monitor usage of different ordering channels
 */
async function getTransactionTypeReport(req, res) {
    try {
        const { days } = req.query;
        const lookbackDays = days ? parseInt(days) : 7;

        const breakdown = await dbAll(
            `SELECT 
                transaction_type,
                COUNT(*) as transaction_count,
                SUM(total_after_discount) as total_revenue,
                ROUND(AVG(total_after_discount), 2) as avg_transaction,
                COUNT(DISTINCT DATE(created_at)) as days_active
            FROM transactions
            WHERE created_at >= datetime('now', '-${lookbackDays} days')
            AND status = 'completed'
            GROUP BY transaction_type`,
            []
        );

        const totals = breakdown.reduce((acc, row) => ({
            total_count: acc.total_count + row.transaction_count,
            total_revenue: acc.total_revenue + row.total_revenue
        }), { total_count: 0, total_revenue: 0 });

        res.json({
            period_days: lookbackDays,
            totals: totals,
            by_type: breakdown
        });
    } catch (err) {
        console.error('Error getting transaction type report:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Get hourly transaction trend
 * OBJECTIVE 1: Identify peak hours for staffing optimization
 */
async function getHourlyTrend(req, res) {
    try {
        const { date } = req.query;
        const reportDate = date || new Date().toISOString().split('T')[0];

        const hourly = await dbAll(
            `SELECT 
                strftime('%H:00', created_at) as hour,
                COUNT(*) as transaction_count,
                SUM(total_after_discount) as revenue,
                AVG(total_after_discount) as avg_transaction
            FROM transactions
            WHERE DATE(created_at) = ? AND status = 'completed'
            GROUP BY hour
            ORDER BY hour ASC`,
            [reportDate]
        );

        res.json({
            date: reportDate,
            hourly_trend: hourly
        });
    } catch (err) {
        console.error('Error getting hourly trend:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

module.exports = {
    getDailyReport,
    getMonthlyReport,
    getTopSellingProducts,
    getDiscountReport,
    getTransactionTypeReport,
    getHourlyTrend
};
