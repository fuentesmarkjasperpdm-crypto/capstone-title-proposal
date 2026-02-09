/**
 * POS JavaScript
 * OBJECTIVE 1: Fast transaction processing
 * OBJECTIVE 2: Flexible billing with discount support
 */

let cart = [];
let products = [];
let currentTransaction = null;
let currentDiscount = 0;

// Initialize POS
async function initPOS() {
    try {
        const userResponse = await fetch('/api/auth/me');
        const userData = await userResponse.json();
        document.getElementById('userFullName').textContent = userData.user.full_name;

        await loadProducts();
        await loadPendingKioskOrders();
        
        // OBJECTIVE 4: Poll for new kiosk orders every 5 seconds
        setInterval(loadPendingKioskOrders, 5000);
    } catch (err) {
        console.error('POS initialization error:', err);
    }
}

/**
 * Load products from inventory
 */
async function loadProducts() {
    try {
        const response = await fetch('/api/inventory');
        const data = await response.json();

        products = data.products.filter(p => p.category !== 'ingredient');

        const productList = document.getElementById('productList');
        productList.innerHTML = products.map(product => `
            <div style="margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <strong>${product.name}</strong>
                    <span style="color: #28a745;">₱${product.price.toFixed(2)}</span>
                </div>
                <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
                    Stock: ${product.current_stock} ${product.unit}
                </div>
                <div style="display: flex; gap: 5px;">
                    <input type="number" id="qty_${product.id}" value="1" min="1" max="${product.current_stock}" style="width: 50px; padding: 5px;">
                    <button class="btn btn-primary" style="flex: 1;" onclick="addToCart(${product.id})">
                        Add
                    </button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error loading products:', err);
    }
}

/**
 * Load pending kiosk orders
 * OBJECTIVE 4: Real-time notifications for kiosk orders
 */
async function loadPendingKioskOrders() {
    try {
        const response = await fetch('/api/transactions/kiosk/pending');
        const data = await response.json();

        const kioskOrdersDiv = document.getElementById('kioskOrders');
        
        if (data.pending_orders && data.pending_orders.length > 0) {
            // Show notification badge
            document.getElementById('kioskOrderBadge').textContent = data.pending_orders.length;
            document.getElementById('kioskOrderBadge').style.display = 'inline-block';

            kioskOrdersDiv.innerHTML = `
                <div style="background: #fff3cd; padding: 15px; border-radius: 5px; border: 1px solid #ffc107;">
                    <h4 style="margin-top: 0; color: #856404;">🔔 Pending Kiosk Orders (${data.pending_orders.length})</h4>
                    ${data.pending_orders.map(order => `
                        <div style="background: white; padding: 10px; margin-bottom: 10px; border-left: 4px solid #ffc107; border-radius: 3px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <strong>${order.transaction_number}</strong>
                                <small style="color: #666;">${new Date(order.created_at).toLocaleTimeString()}</small>
                            </div>
                            <div style="margin-bottom: 8px;">
                                <strong>Customer:</strong> ${order.customer_name}
                            </div>
                            <div style="margin-bottom: 8px;">
                                <strong>Items (${order.item_count}):</strong>
                                <ul style="margin: 5px 0; padding-left: 20px; font-size: 13px;">
                                    ${order.items.map(item => `
                                        <li>${item.quantity}x ${item.name}</li>
                                    `).join('')}
                                </ul>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <strong style="color: #28a745;">₱${order.total_after_discount.toFixed(2)}</strong>
                                <button class="btn btn-success" onclick="processKioskOrder(${order.id})" style="padding: 5px 15px;">
                                    Pay Now
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            document.getElementById('kioskOrderBadge').style.display = 'none';
            kioskOrdersDiv.innerHTML = '<small style="color: #666;">No pending kiosk orders</small>';
        }
    } catch (err) {
        console.error('Error loading kiosk orders:', err);
    }
}

/**
 * Process kiosk order payment
 */
function processKioskOrder(transactionId) {
    // Load transaction details and open payment modal for kiosk order
    fetch(`/api/transactions/${transactionId}`)
        .then(res => res.json())
        .then(data => {
            currentTransaction = data.transaction;
            
            // Set payment modal for kiosk order
            const total = data.transaction.total_after_discount || 0;
            document.getElementById('amountDue').textContent = `₱${total.toFixed(2)}`;
            document.getElementById('amountPaid').value = '';
            document.getElementById('changeAmount').textContent = '₱0.00';
            
            document.getElementById('paymentModal').classList.add('show');
            document.getElementById('paymentModalTitle').textContent = `Process Kiosk Order - ${data.transaction.transaction_number}`;
            document.getElementById('amountPaid').focus();
        })
        .catch(err => {
            console.error('Error loading transaction:', err);
            alert('Error loading order');
        });
}

/**
 * Add item to cart
 * OBJECTIVE 1: Fast POS transaction entry
 */
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const qty = parseInt(document.getElementById(`qty_${productId}`).value);

    if (qty <= 0) {
        alert('Please enter a valid quantity');
        return;
    }

    if (qty > product.current_stock) {
        alert('Insufficient stock');
        return;
    }

    // Check if item already in cart
    const existingItem = cart.find(item => item.product_id === productId);
    if (existingItem) {
        existingItem.quantity += qty;
    } else {
        cart.push({
            product_id: productId,
            product_name: product.name,
            quantity: qty,
            unit_price: product.price,
            subtotal: product.price * qty
        });
    }

    updateCartDisplay();
    document.getElementById(`qty_${productId}`).value = '1';
}

/**
 * Remove item from cart
 */
function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartDisplay();
}

/**
 * Update cart display
 */
function updateCartDisplay() {
    const cartItemsDiv = document.getElementById('cartItems');
    
    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Cart is empty</td></tr>';
    } else {
        cartItemsDiv.innerHTML = cart.map((item, index) => `
            <tr>
                <td>${item.product_name}</td>
                <td>${item.quantity}</td>
                <td>₱${item.unit_price.toFixed(2)}</td>
                <td>₱${item.subtotal.toFixed(2)}</td>
                <td><button class="btn btn-danger" style="padding: 5px 10px;" onclick="removeFromCart(${index})">Remove</button></td>
            </tr>
        `).join('');
    }

    updateTotals();
}

/**
 * Update totals
 */
function updateTotals() {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const total = subtotal - currentDiscount;

    document.getElementById('subtotal').textContent = `₱${subtotal.toFixed(2)}`;
    document.getElementById('discountDisplay').textContent = `₱${currentDiscount.toFixed(2)}`;
    document.getElementById('total').textContent = `₱${Math.max(0, total).toFixed(2)}`;
    document.getElementById('amountDue').textContent = `₱${Math.max(0, total).toFixed(2)}`;
}

/**
 * Apply discount
 * OBJECTIVE 2: Support senior citizen, PWD, student discounts
 */
async function applyDiscount(reason) {
    if (cart.length === 0) {
        alert('Cart is empty');
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    
    const discounts = {
        'senior_citizen': 0.20,
        'pwd': 0.20,
        'student': 0.10
    };

    currentDiscount = subtotal * discounts[reason];
    updateTotals();

    alert(`${reason.replace('_', ' ').toUpperCase()} discount (${discounts[reason] * 100}%) applied: ₱${currentDiscount.toFixed(2)}`);
}

/**
 * Open manual discount modal
 */
function openDiscountModal() {
    document.getElementById('discountModal').classList.add('show');
}

/**
 * Close discount modal
 */
function closeDiscountModal() {
    document.getElementById('discountModal').classList.remove('show');
}

/**
 * Apply manual discount
 */
function applyManualDiscount() {
    const amount = parseFloat(document.getElementById('discountAmount').value);
    
    if (isNaN(amount) || amount < 0) {
        alert('Please enter a valid discount amount');
        return;
    }

    currentDiscount = amount;
    updateTotals();
    closeDiscountModal();
    
    document.getElementById('discountAmount').value = '';
    document.getElementById('discountReason').value = '';
}

/**
 * Proceed to payment
 * OBJECTIVE 1: Create transaction
 */
async function proceedToPayment() {
    if (cart.length === 0) {
        alert('Cart is empty');
        return;
    }

    try {
        const customerName = document.getElementById('customerName').value || null;
        
        const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                items: cart.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    notes: ''
                })),
                customer_name: customerName
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert('Error creating transaction: ' + data.error);
            return;
        }

        currentTransaction = data.transaction;

        // Apply discount if any
        if (currentDiscount > 0) {
            const discountResponse = await fetch(`/api/transactions/${currentTransaction.id}/discount`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    discount_reason: 'manual',
                    discount_amount: currentDiscount
                })
            });

            const discountData = await discountResponse.json();
            currentTransaction = { ...currentTransaction, ...discountData.transaction };
        }

        // Open payment modal
        document.getElementById('paymentModal').classList.add('show');
        document.getElementById('amountPaid').focus();

    } catch (err) {
        console.error('Error creating transaction:', err);
        alert('Connection error');
    }
}

/**
 * Calculate change
 */
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('amountPaid')?.addEventListener('input', function() {
        const amountPaid = parseFloat(this.value) || 0;
        const amountDue = parseFloat(document.getElementById('amountDue').textContent.replace('₱', '')) || 0;
        const change = amountPaid - amountDue;
        
        document.getElementById('changeAmount').textContent = `₱${Math.max(0, change).toFixed(2)}`;
    });
});

/**
 * Close payment modal
 */
function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('show');
}

/**
 * Confirm payment
 * OBJECTIVE 3: Auto-deduct inventory and finalize transaction
 */
async function confirmPayment() {
    const amountPaid = parseFloat(document.getElementById('amountPaid').value);
    const amountDue = parseFloat(document.getElementById('amountDue').textContent.replace('₱', ''));

    if (isNaN(amountPaid) || amountPaid < amountDue) {
        alert('Insufficient payment');
        return;
    }

    try {
        const response = await fetch(`/api/transactions/${currentTransaction.id}/payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount_paid: amountPaid
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert('Error processing payment: ' + data.error);
            return;
        }

        // Print receipt
        const receiptWindow = window.open(`/api/transactions/${currentTransaction.id}/receipt`, '_blank');
        receiptWindow.print();

        // Reset form
        cart = [];
        currentDiscount = 0;
        document.getElementById('customerName').value = '';
        updateCartDisplay();
        closePaymentModal();

        alert('✅ Payment successful! Transaction completed.');
    } catch (err) {
        console.error('Error processing payment:', err);
        alert('Connection error');
    }
}

/**
 * Logout
 */
async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initPOS);
