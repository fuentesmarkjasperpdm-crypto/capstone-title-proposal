/**
 * Dashboard JavaScript
 * OBJECTIVE 1: Real-time metrics display
 */

let currentUser = null;

// Initialize dashboard
async function initDashboard() {
    try {
        // Get current user
        const userResponse = await fetch('/api/auth/me');
        const userData = await userResponse.json();

        if (!userData.user) {
            window.location.href = '/login';
            return;
        }

        currentUser = userData.user;
        document.getElementById('userFullName').textContent = currentUser.full_name;
        document.getElementById('userRole').textContent = `(${currentUser.role})`;

        // Load dashboard data
        await loadDailyStats();
        await loadRecentTransactions();
        await loadLowStockItems();
        await loadProductStats();

        // Refresh data every 30 seconds
        setInterval(async () => {
            await loadDailyStats();
            await loadRecentTransactions();
            await loadLowStockItems();
        }, 30000);
    } catch (err) {
        console.error('Dashboard initialization error:', err);
    }
}

/**
 * Load today's statistics
 */
async function loadDailyStats() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`/api/reports/daily?date=${today}`);
        const data = await response.json();

        document.getElementById('todayTransactions').textContent = data.total_transactions || '0';
        document.getElementById('todayRevenue').textContent = `₱${(data.total_revenue || 0).toFixed(2)}`;
    } catch (err) {
        console.error('Error loading daily stats:', err);
    }
}

/**
 * Load recent transactions
 */
async function loadRecentTransactions() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`/api/reports/daily?date=${today}`);
        const data = await response.json();

        const tbody = document.getElementById('recentTransactions');
        
        if (!data.transactions || data.transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No transactions today</td></tr>';
            return;
        }

        tbody.innerHTML = data.transactions.map(trans => {
            const time = new Date(trans.created_at).toLocaleTimeString();
            return `
                <tr>
                    <td><strong>${trans.transaction_number}</strong></td>
                    <td>${trans.customer_name || 'N/A'}</td>
                    <td><a href="#" onclick="viewTransaction(${trans.id})">View</a></td>
                    <td>₱${trans.total_after_discount.toFixed(2)}</td>
                    <td>${time}</td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error('Error loading recent transactions:', err);
        document.getElementById('recentTransactions').innerHTML = 
            '<tr><td colspan="5" class="text-center text-muted">Error loading transactions</td></tr>';
    }
}

/**
 * Load low stock items
 */
async function loadLowStockItems() {
    try {
        const response = await fetch('/api/inventory/low-stock');
        const data = await response.json();

        document.getElementById('lowStockCount').textContent = data.count || '0';

        const alertDiv = document.getElementById('lowStockAlert');
        
        if (!data.low_stock_items || data.low_stock_items.length === 0) {
            alertDiv.innerHTML = '<p class="text-muted">✓ All items are sufficiently stocked</p>';
            return;
        }

        alertDiv.innerHTML = `
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Current Stock</th>
                        <th>Threshold</th>
                        <th>Needed</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.low_stock_items.map(item => `
                        <tr>
                            <td><strong>${item.name}</strong></td>
                            <td>${item.current_stock} ${item.unit || 'units'}</td>
                            <td>${item.low_stock_threshold}</td>
                            <td><span class="badge badge-warning">${item.stock_needed}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        console.error('Error loading low stock items:', err);
    }
}

/**
 * Load product statistics
 */
async function loadProductStats() {
    try {
        const response = await fetch('/api/inventory');
        const data = await response.json();

        document.getElementById('totalProducts').textContent = data.products.length || '0';
    } catch (err) {
        console.error('Error loading product stats:', err);
    }
}

/**
 * View transaction details
 */
function viewTransaction(transactionId) {
    // Open receipt in new window
    window.open(`/api/transactions/${transactionId}/receipt`, '_blank');
}

/**
 * Logout
 */
async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
    } catch (err) {
        console.error('Logout error:', err);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initDashboard);
