/**
 * Desi Hookah Store - Cart & WhatsApp Integration JS
 * Handles local cart state, dynamic cart drawer, checkout modal,
 * and redirection to WhatsApp with structured product and cart details.
 */

const API_BASE = window.location.origin;

// State management
let cartItems = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadCartFromStorage();
  injectCartElements();
  updateNavbarCartCount();
  setupEventListeners();
  setupWhatsAppSingleProductHandler();
});

// Load cart items from localStorage
function loadCartFromStorage() {
  const stored = localStorage.getItem('desi_hookah_cart');
  if (stored) {
    try {
      cartItems = JSON.parse(stored);
    } catch (e) {
      console.error('Error parsing cart data', e);
      cartItems = [];
    }
  }
}

// Save cart items to localStorage
function saveCartToStorage() {
  localStorage.setItem('desi_hookah_cart', JSON.stringify(cartItems));
  updateNavbarCartCount();
  renderCartDrawer();
}

// Update the cart count badge in the navbar
function updateNavbarCartCount() {
  const cartBadge = document.querySelector('.cart-count');
  if (cartBadge) {
    const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    cartBadge.textContent = totalCount;
    cartBadge.style.display = totalCount > 0 ? 'flex' : 'none';
  }
}

// Inject slide-out drawer and checkout modal dynamically to body
function injectCartElements() {
  // Inject Drawer & Overlay
  const drawerHtml = `
    <div class="cart-overlay" id="cartOverlay"></div>
    <div class="cart-drawer" id="cartDrawer">
      <div class="cart-drawer-header">
        <h3>Shopping Cart</h3>
        <button class="cart-drawer-close" id="closeCartDrawer"><i class="fas fa-times"></i></button>
      </div>
      <div class="cart-drawer-body" id="cartDrawerBody">
        <!-- Dynamic cart items will load here -->
      </div>
      <div class="cart-drawer-footer" id="cartDrawerFooter">
        <div class="cart-drawer-subtotal">
          <span>Subtotal:</span>
          <span id="cartSubtotal">$0.00</span>
        </div>
        <button class="cart-checkout-btn" id="cartCheckoutBtn">
          <i class="fab fa-whatsapp"></i> Checkout via WhatsApp
        </button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', drawerHtml);

  // Inject Checkout Modal
  const modalHtml = `
    <div class="checkout-modal-backdrop" id="checkoutModalBackdrop">
      <div class="checkout-modal">
        <div class="checkout-modal-header">
          <h4>Delivery Information</h4>
          <button class="checkout-modal-close" id="closeCheckoutModal"><i class="fas fa-times"></i></button>
        </div>
        <div class="checkout-modal-body">
          <form id="whatsappCheckoutForm">
            <div class="checkout-form-group">
              <label for="checkoutName">Full Name *</label>
              <input type="text" id="checkoutName" required placeholder="e.g. John Doe">
            </div>
            <div class="checkout-form-group">
              <label for="checkoutPhone">Phone Number *</label>
              <input type="tel" id="checkoutPhone" required placeholder="e.g. +1 234 567 890">
            </div>
            <div class="checkout-form-group">
              <label for="checkoutAddress">Delivery Address *</label>
              <textarea id="checkoutAddress" required placeholder="Full street address, city, and state"></textarea>
            </div>
            <div class="checkout-form-group">
              <label for="checkoutPayment">Preferred Payment *</label>
              <select id="checkoutPayment" required>
                <option value="Cash on Delivery">Cash on Delivery (COD)</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI / Card">UPI / Card</option>
              </select>
            </div>
            <div class="checkout-form-group">
              <label for="checkoutNotes">Special Instructions / Notes</label>
              <textarea id="checkoutNotes" placeholder="Any preferences, gate codes, or delivery instructions..."></textarea>
            </div>
            <button type="submit" class="checkout-submit-btn">
              <i class="fab fa-whatsapp"></i> Confirm & Order via WhatsApp
            </button>
          </form>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Render cart drawer items
function renderCartDrawer() {
  const drawerBody = document.getElementById('cartDrawerBody');
  const drawerFooter = document.getElementById('cartDrawerFooter');
  
  if (!drawerBody) return;

  if (cartItems.length === 0) {
    drawerBody.innerHTML = `
      <div class="cart-empty-state">
        <i class="fas fa-shopping-bag"></i>
        <p>Your cart is empty</p>
        <button class="add-btn" style="height: 38px; line-height: 38px; padding: 0 20px; font-size: 13px;" onclick="closeCart(); window.location.href='product-list.html'">Shop Now</button>
      </div>
    `;
    if (drawerFooter) drawerFooter.style.display = 'none';
    return;
  }

  if (drawerFooter) drawerFooter.style.display = 'block';

  let subtotal = 0;
  let itemsHtml = '';

  cartItems.forEach(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;

    itemsHtml += `
      <div class="cart-drawer-item" data-id="${item.id}">
        <img src="${item.image}" alt="${item.name}">
        <div class="cart-item-details">
          <h4 class="cart-item-title">${item.name}</h4>
          <div class="cart-item-price">$${item.price.toFixed(2)}</div>
          <div class="cart-item-controls">
            <div class="cart-qty-selector">
              <button onclick="changeDrawerQty('${item.id}', -1)">-</button>
              <span>${item.quantity}</span>
              <button onclick="changeDrawerQty('${item.id}', 1)">+</button>
            </div>
            <button class="cart-item-remove" onclick="removeCartItem('${item.id}')" title="Remove Item">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  });

  drawerBody.innerHTML = itemsHtml;
  document.getElementById('cartSubtotal').textContent = `$${subtotal.toFixed(2)}`;
}

// Open/Close Drawer Functions
function openCart() {
  renderCartDrawer();
  document.getElementById('cartOverlay').classList.add('active');
  document.getElementById('cartDrawer').classList.add('active');
}

function closeCart() {
  document.getElementById('cartOverlay').classList.remove('active');
  document.getElementById('cartDrawer').classList.remove('active');
}

// Add Item to Cart
function addToCart(product, quantity = 1) {
  const existingItemIndex = cartItems.findIndex(item => item.id === product._id);
  const mainImage = product.mainImage || (product.images && product.images[0]) || 'images/product_img-1.png';

  if (existingItemIndex > -1) {
    cartItems[existingItemIndex].quantity += quantity;
  } else {
    cartItems.push({
      id: product._id,
      name: product.name,
      price: product.price,
      image: mainImage,
      quantity: quantity,
      sku: product.sku || ''
    });
  }

  saveCartToStorage();
  openCart();
}

// Remove Cart Item
window.removeCartItem = function(id) {
  cartItems = cartItems.filter(item => item.id !== id);
  saveCartToStorage();
};

// Change quantity in cart drawer
window.changeDrawerQty = function(id, change) {
  const itemIndex = cartItems.findIndex(item => item.id === id);
  if (itemIndex > -1) {
    const newQty = cartItems[itemIndex].quantity + change;
    if (newQty > 0) {
      cartItems[itemIndex].quantity = newQty;
    } else {
      cartItems = cartItems.filter(item => item.id !== id);
    }
    saveCartToStorage();
  }
};

// Setup DOM event listeners
function setupEventListeners() {
  // Cart toggle from Navbar (uncommented nav-right cartIcon)
  const navbarCartIcon = document.getElementById('cartIcon');
  if (navbarCartIcon) {
    // Clone and replace to remove old inline toggles that would conflict
    const newIcon = navbarCartIcon.cloneNode(true);
    navbarCartIcon.parentNode.replaceChild(newIcon, navbarCartIcon);
    
    newIcon.addEventListener('click', (e) => {
      e.preventDefault();
      openCart();
    });
  }

  // Close Drawer Listeners
  const closeBtn = document.getElementById('closeCartDrawer');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeCart);
  }

  const overlay = document.getElementById('cartOverlay');
  if (overlay) {
    overlay.addEventListener('click', closeCart);
  }

  // Open Checkout Modal
  const checkoutBtn = document.getElementById('cartCheckoutBtn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      closeCart();
      document.getElementById('checkoutModalBackdrop').classList.add('active');
    });
  }

  // Close Checkout Modal
  const closeCheckoutBtn = document.getElementById('closeCheckoutModal');
  const modalBackdrop = document.getElementById('checkoutModalBackdrop');
  if (closeCheckoutBtn && modalBackdrop) {
    closeCheckoutBtn.addEventListener('click', () => {
      modalBackdrop.classList.remove('active');
    });
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) {
        modalBackdrop.classList.remove('active');
      }
    });
  }

  // Submit Checkout Form
  const checkoutForm = document.getElementById('whatsappCheckoutForm');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('checkoutName').value;
      const phone = document.getElementById('checkoutPhone').value;
      const address = document.getElementById('checkoutAddress').value;
      const payment = document.getElementById('checkoutPayment').value;
      const notes = document.getElementById('checkoutNotes').value;

      try {
        // Fetch WhatsApp number
        const response = await fetch(`${API_BASE}/api/settings/whatsappNumber`);
        const result = await response.json();
        const whatsappNumber = result.success && result.value ? result.value : '919876543210';

        // Format Order Message
        let subtotal = 0;
        let itemsText = '';

        cartItems.forEach((item, index) => {
          const itemTotal = item.price * item.quantity;
          subtotal += itemTotal;
          itemsText += `${index + 1}. *${item.name}* (Qty: ${item.quantity}) - $${itemTotal.toFixed(2)}\n`;
          itemsText += `   _Link:_ ${API_BASE}/product-description.html?id=${item.id}\n`;
          if (item.sku) itemsText += `   _SKU:_ ${item.sku}\n`;
          itemsText += `\n`;
        });

        const message = `🛍️ *NEW ORDER PLACE REQUEST - DESI HOOKAH* 🛍️

*Customer Details:*
👤 *Name:* ${name}
📞 *Phone:* ${phone}
📍 *Address:* ${address}
💳 *Preferred Payment:* ${payment}
${notes ? `📝 *Notes:* ${notes}\n` : ''}
----------------------------------------

*Items Purchased:*
${itemsText}----------------------------------------
💰 *Total Amount:* $${subtotal.toFixed(2)}

Please confirm the delivery details and let's finalize the payment!`;

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

        // Clear cart
        cartItems = [];
        localStorage.removeItem('desi_hookah_cart');
        updateNavbarCartCount();
        
        // Close modal
        document.getElementById('checkoutModalBackdrop').classList.remove('active');

        // Redirect to WhatsApp
        window.open(whatsappUrl, '_blank');
      } catch (error) {
        console.error('Error placing order via WhatsApp:', error);
        alert('An error occurred. Please try again.');
      }
    });
  }

  // Connect Add to Cart in Product Details Page
  setupStorefrontProductDetailsPage();
}

// Connect product-description.html elements if we are on that page
function setupStorefrontProductDetailsPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  if (!productId) return;

  // Let's hook the Add to Cart button (uncommented class add-btn)
  // Wait, in product-description.html, the Shop Now/Add to Cart button might have .add-btn inside a commented area.
  // We will uncomment the area in the HTML modify step, and then reference it here.
  const addToCartBtn = document.querySelector('.cart-section .add-btn');
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        // Fetch current product details from API
        const response = await fetch(`${API_BASE}/api/products/${productId}`);
        const result = await response.json();
        if (result.success) {
          const qtyText = document.getElementById('qty');
          const qty = qtyText ? parseInt(qtyText.textContent) || 1 : 1;
          addToCart(result.data, qty);
        }
      } catch (error) {
        console.error('Error adding product to cart:', error);
      }
    });
  }
}

// Setup click handler for single product inquiry "WhatsApp Me" button
function setupWhatsAppSingleProductHandler() {
  // Button in product-description.html has class "whatsapp"
  const whatsappBtn = document.querySelector('.product-details button.whatsapp');
  if (whatsappBtn) {
    // Apply styling so it stands out beautifully like a modern CTA
    whatsappBtn.className = 'whatsapp-badge-product';
    
    // Setup click listener
    whatsappBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        if (!productId) return;

        // Fetch WhatsApp number and Product details
        const [settingsRes, productRes] = await Promise.all([
          fetch(`${API_BASE}/api/settings/whatsappNumber`).then(r => r.json()),
          fetch(`${API_BASE}/api/products/${productId}`).then(r => r.json())
        ]);

        const whatsappNumber = settingsRes.success && settingsRes.value ? settingsRes.value : '919876543210';
        if (!productRes.success) return;

        const product = productRes.data;

        // Format message
        const message = `👋 Hello! I am highly interested in discussing payment and delivery details for this product:

🏷️ *Name:* ${product.name}
💰 *Price:* $${product.price.toFixed(2)}
${product.sku ? `🔑 *SKU:* ${product.sku}\n` : ''}🔗 *Product Link:* ${window.location.href}

Could you please assist me with the checkout process and shipping options?`;

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

        window.open(whatsappUrl, '_blank');
      } catch (error) {
        console.error('Error opening single product WhatsApp inquiry:', error);
      }
    });
  }
}
