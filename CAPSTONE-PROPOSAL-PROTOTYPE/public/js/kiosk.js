/**
 * Kiosk JavaScript
 * OBJECTIVE 4: Customer kiosk ordering interface
 * SCOPE: No registration, session-based, payment at counter
 */

let kioskSession = null;
let kioskCart = [];
let allProducts = {};

// Initialize kiosk
async function initKiosk() {
    try {
        // Create kiosk session
        const sessionResponse = await fetch('/api/kiosk/session', { method: 'POST' });
        const sessionData = await sessionResponse.json();
        kioskSession = sessionData.session_id;

        // Load menu
        await loadKioskMenu();
    } catch (err) {
        console.error('Kiosk initialization error:', err);
        alert('Error initializing kiosk');
    }
}

/**
 * Load kiosk menu
 * OBJECTIVE 4: Display available products
 */
async function loadKioskMenu() {
    try {
        const response = await fetch('/api/kiosk/menu');
        const data = await response.json();

        allProducts = {};

        // Render beverages
        const beverageHtml = data.menu.beverages.map(product => {
            allProducts[product.id] = product;
            return `
                <div class="menu-item" onclick="addKioskItem(${product.id})">
                    <div style="font-size: 20px; margin-bottom: 5px;">☕</div>
                    <div style="font-weight: 600; font-size: 14px;">${product.name}</div>
                    <div class="price">₱${product.price.toFixed(2)}</div>
                    <div class="stock-info">Stock: ${product.current_stock}</div>
                </div>
            `;
        }).join('');
        document.getElementById('beverageList').innerHTML = beverageHtml;

        // Render food
        const foodHtml = data.menu.food.map(product => {
            allProducts[product.id] = product;
            return `
                <div class="menu-item" onclick="addKioskItem(${product.id})">
                    <div style="font-size: 20px; margin-bottom: 5px;">🥐</div>
                    <div style="font-weight: 600; font-size: 14px;">${product.name}</div>
                    <div class="price">₱${product.price.toFixed(2)}</div>
                    <div class="stock-info">Stock: ${product.current_stock}</div>
                </div>
            `;
        }).join('');
        document.getElementById('foodList').innerHTML = foodHtml;
    } catch (err) {
        console.error('Error loading kiosk menu:', err);
        alert('Error loading menu');
    }
}

/**
 * Add item to kiosk cart
 */
async function addKioskItem(productId) {
    try {
        const response = await fetch('/api/kiosk/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: kioskSession,
                product_id: productId,
                quantity: 1,
                notes: ''
            })
        });

        const data = await response.json();

        if (response.ok) {
            kioskCart = data.order_items;
            updateKioskCart();
        } else {
            alert(data.error);
        }
    } catch (err) {
        console.error('Error adding item:', err);
    }
}

/**
 * Update kiosk cart display
 */
async function updateKioskCart() {
    try {
        const response = await fetch(`/api/kiosk/cart/${kioskSession}`);
        const data = await response.json();

        const cartDiv = document.getElementById('cartItems');

        if (!data.cart || data.cart.length === 0) {
            cartDiv.innerHTML = '<p class="text-muted">Cart is empty</p>';
            document.getElementById('cartTotal').textContent = '₱0.00';
            return;
        }

        cartDiv.innerHTML = data.cart.map((item, index) => `
            <div class="cart-item">
                <div style="flex: 1;">
                    <div style="font-weight: 600;">${item.product_name}</div>
                    <div style="font-size: 12px; color: #666;">x${item.quantity} @ ₱${item.unit_price.toFixed(2)}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 600;">₱${item.subtotal.toFixed(2)}</div>
                    <button class="btn btn-danger" style="padding: 5px 10px; font-size: 12px;" onclick="removeKioskItem(${item.product_id})">
                        Remove
                    </button>
                </div>
            </div>
        `).join('');

        document.getElementById('cartTotal').textContent = `₱${data.total.toFixed(2)}`;
    } catch (err) {
        console.error('Error updating cart:', err);
    }
}

/**
 * Remove item from kiosk cart
 */
async function removeKioskItem(productId) {
    try {
        const response = await fetch('/api/kiosk/cart', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: kioskSession,
                product_id: productId
            })
        });

        if (response.ok) {
            kioskCart = (await response.json()).order_items;
            updateKioskCart();
        }
    } catch (err) {
        console.error('Error removing item:', err);
    }
}

/**
 * Submit order
 * OBJECTIVE 4: Place order for counter payment
 */
async function submitOrder() {
    try {
        if (!kioskCart || kioskCart.length === 0) {
            alert('Cart is empty');
            return;
        }

        const response = await fetch('/api/kiosk/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: kioskSession,
                customer_name: null
            })
        });

        const data = await response.json();

        if (response.ok) {
            showOrderConfirmation(data.order);
        } else {
            alert('Error: ' + data.error);
        }
    } catch (err) {
        console.error('Error submitting order:', err);
        alert('Connection error');
    }
}

/**
 * Show order confirmation
 */
function showOrderConfirmation(order) {
    const confirmDiv = document.getElementById('confirmContent');
    confirmDiv.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h3 style="color: #28a745;">✅ Order Placed Successfully!</h3>
            <p style="font-size: 18px; margin: 20px 0;">
                <strong>Order Number: ${order.transaction_number}</strong>
            </p>
            <p>Items: ${order.item_count}</p>
            <p style="font-size: 20px; color: #8B4513;">
                <strong>Total: ₱${order.total.toFixed(2)}</strong>
            </p>
            <p style="color: #666; margin-top: 20px;">
                Please proceed to the counter to complete your payment.
            </p>
        </div>
    `;
    document.getElementById('confirmModal').classList.add('show');
}

/**
 * Close confirmation modal
 */
function closeConfirm() {
    document.getElementById('confirmModal').classList.remove('show');
}

/**
 * Go to counter (placeholder)
 */
function goToCounter() {
    closeConfirm();
    newOrder();
}

/**
 * Start new order
 */
async function newOrder() {
    kioskCart = [];
    // Create new session
    const sessionResponse = await fetch('/api/kiosk/session', { method: 'POST' });
    const sessionData = await sessionResponse.json();
    kioskSession = sessionData.session_id;
    updateKioskCart();
}

/**
 * Reset order
 */
function resetOrder() {
    if (confirm('Clear your cart?')) {
        kioskCart = [];
        updateKioskCart();
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initKiosk);
