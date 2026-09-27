/* =========================================================
   SHOPMAX99 - APP.JS
   Common Application / Navigation / Cart / Auth / Modals
========================================================= */

(function () {
    "use strict";

    const STORAGE = {
        cart: "shopmax99_cart",
        wishlist: "shopmax99_wishlist",
        user: "shopmax99_user",
        orders: "shopmax99_orders",
        sellers: "shopmax99_sellers",
        products: "shopmax99_products",
        transactions: "shopmax99_transactions",
        customerAccount: "shopmax99_customer_account",
        customerSession: "shopmax99_customer_session"
    };

    window.ShopMax99 = window.ShopMax99 || {};

    /* =====================================================
       STORAGE HELPERS
    ====================================================== */

    function getData(key, fallback) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : fallback;
        } catch (error) {
            console.error("Storage read error:", error);
            return fallback;
        }
    }

    function setData(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error("Storage save error:", error);
        }
    }

    window.ShopMax99.storage = {
        get: getData,
        set: setData,
        keys: STORAGE
    };

    /* =====================================================
       SHOPMAX99 PRICING CATEGORIES
    ====================================================== */
    const PRICING_CATEGORIES = [99, 199, 299, 399, 499, 599, 699, 799, 899, 999];
    const PRICE_CATEGORY_OPTIONS = [
        ...PRICING_CATEGORIES.map(price => ({ id: `price_${price}`, price, label: `₹${price}` })),
        { id: "price_above_1000", price: null, label: "Above ₹1000" }
    ];

    function getPriceCategory(customerPrice) {
        const value = Number(customerPrice);
        if (!Number.isFinite(value) || value <= 0) return PRICE_CATEGORY_OPTIONS[0];
        const match = PRICING_CATEGORIES.find(price => value <= price);
        return match ? { id: `price_${match}`, price: match, label: `₹${match}` } : PRICE_CATEGORY_OPTIONS.at(-1);
    }

    function getPlatformFee(customerPrice) {
        const value = Number(customerPrice) || 0;
        return Math.max(29, value * 0.12);
    }

    function getSellerPriceCap(customerPrice) {
        const category = getPriceCategory(customerPrice);
        if (category.price === 99) return 70;
        if (category.price === 199) return 160;
        if (category.price) return Math.max(1, Number((category.price - getPlatformFee(category.price)).toFixed(2)));
        return null;
    }

    window.ShopMax99.pricing = {
        categories: PRICE_CATEGORY_OPTIONS,
        getCategory: getPriceCategory,
        getFee: getPlatformFee,
        getSellerCap: getSellerPriceCap
    };


    /* =====================================================
       ELEMENT HELPERS
    ====================================================== */

    const $ = (selector, parent = document) =>
        parent.querySelector(selector);

    const $$ = (selector, parent = document) =>
        [...parent.querySelectorAll(selector)];


    /* =====================================================
       TOAST
    ====================================================== */

    function showToast(message, type = "success") {

        const container = $("#toastContainer");

        if (!container) return;

        const toast = document.createElement("div");

        toast.className = `toast ${type}`;

        let icon = "fa-circle-check";

        if (type === "error") {
            icon = "fa-circle-xmark";
        }

        if (type === "warning") {
            icon = "fa-triangle-exclamation";
        }

        toast.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <span>${escapeHTML(message)}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateX(15px)";

            setTimeout(() => toast.remove(), 200);
        }, 2800);
    }

    window.ShopMax99.showToast = showToast;


    /* =====================================================
       HTML ESCAPE
    ====================================================== */

    function escapeHTML(value) {

        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    window.ShopMax99.escapeHTML = escapeHTML;


    /* =====================================================
       MODALS
    ====================================================== */

    function openModal(id) {

        const modal = document.getElementById(id);

        if (!modal) return;

        modal.hidden = false;
        document.body.style.overflow = "hidden";
    }

    function closeModal(id) {

        const modal = document.getElementById(id);

        if (!modal) return;

        modal.hidden = true;

        const anyOpen = $$(".modal-overlay").some(modal => !modal.hidden);

        if (!anyOpen) {
            document.body.style.overflow = "";
        }
    }

    window.ShopMax99.openModal = openModal;
    window.ShopMax99.closeModal = closeModal;


    /* =====================================================
       ROLE SWITCHING
    ====================================================== */

    function showRole(role) {
    const customer = document.getElementById("customerApp");
    const seller = document.getElementById("sellerApp");
    const admin = document.getElementById("adminApp");
    const sellerSupport = document.getElementById("sellerSupportApp");
    const customerSupport = document.getElementById("customerSupportApp");

    // Har role workspace ko completely hide karo before showing the target.
    [customer, seller, admin, sellerSupport, customerSupport].forEach(panel => {
        if (!panel) return;

        panel.hidden = true;
        panel.style.display = "none";
    });

    // Sirf selected role show karo
    let target = null;

    if (role === "customer") {
        target = customer;
    }

    if (role === "seller") {
        target = seller;
    }

    if (role === "admin") {
        target = admin;
    }

    if (!target) return;

    target.hidden = false;
    target.style.display = "";

    window.ShopMax99.currentRole = role;
    document.body.dataset.activeRole = role;

    // Page ko top par lao
    window.scrollTo({
        top: 0,
        behavior: "auto"
    });

    // Seller initialize
    if (
        role === "seller" &&
        typeof window.initSellerCenter === "function"
    ) {
        window.initSellerCenter();

        if (typeof window.showSellerPage === "function") {
            window.showSellerPage("dashboard");
        }
    }

    // Admin initialize
    if (
        role === "admin" &&
        typeof window.initAdminCenter === "function"
    ) {
        window.initAdminCenter();

        if (typeof window.showAdminPage === "function") {
            window.showAdminPage("dashboard");
        }
    }

    // Customer home
    if (
        role === "customer" &&
        typeof window.showCustomerPage === "function"
    ) {
        window.showCustomerPage("home");
    }
}

// Public role-switch API used by Admin, Seller and Support login bridges.
// Keep this assignment explicit so role authentication never falls back to
// the "workspace unavailable" message when the function itself exists.
window.ShopMax99.showRole = showRole;
window.showRole = showRole;

    /* =====================================================
       CUSTOMER PAGE NAVIGATION
    ====================================================== */

    function showCustomerPage(page) {

        const pages = $$(".customer-page");

        pages.forEach(section => {
            const isTarget = section.dataset.page === page;

            section.hidden = !isTarget;
            section.classList.toggle("active-page", isTarget);
        });

        $$(".customer-nav-item[data-customer-page]").forEach(item => {
            item.classList.toggle(
                "active",
                item.dataset.customerPage === page
            );
        });

        window.ShopMax99.currentCustomerPage = page;

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        if (page === "categories" && typeof window.renderShopMax99CategoryBrowser === "function") {
            window.renderShopMax99CategoryBrowser("all");
        }

        if (page === "cart" && typeof window.renderCart === "function") {
            window.renderCart();
        }

        if (
            page === "wishlist" &&
            typeof window.renderWishlist === "function"
        ) {
            window.renderWishlist();
        }

        if (
            page === "orders" &&
            typeof window.renderOrders === "function"
        ) {
            window.renderOrders();
        }
        if (page === "profile") renderCustomerProfile();
    }

    window.ShopMax99.showCustomerPage = showCustomerPage;

    // Compatibility API used by footer/admin/legacy navigation.
    window.showCustomerSection = function(section) {
        const map = { home: "home", products: "home", cart: "cart", orders: "orders", wishlist: "wishlist", profile: "profile", categories: "categories" };
        const page = map[section] || "home";
        showRole("customer");
        showCustomerPage(page);
        if (section === "products") {
            requestAnimationFrame(() => {
                const target = document.getElementById("productGrid");
                if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        } else if (section === "home") {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };
    window.ShopMax99.showCustomerSection = window.showCustomerSection;


    /* =====================================================
       CART
    ====================================================== */

    function getCart() {
        return getData(STORAGE.cart, []);
    }

    function saveCart(cart) {
        setData(STORAGE.cart, cart);
        updateCartCount();

        if (typeof window.renderCart === "function") {
            window.renderCart();
        }
    }

    function addToCart(product) {

        if (!product || !product.id) return;

        const cart = getCart();

        const existing = cart.find(
            item => String(item.id) === String(product.id)
        );

        if (existing) {
            existing.quantity = Number(existing.quantity || 1) + 1;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: 99,
                image: product.image || "",
                category: product.category || "",
                quantity: 1
            });
        }

        saveCart(cart);

        showToast("Product added to cart.");

        return cart;
    }

    function removeFromCart(productId) {

        let cart = getCart();

        cart = cart.filter(
            item => String(item.id) !== String(productId)
        );

        saveCart(cart);

        showToast("Product removed from cart.", "warning");
    }

    function changeCartQuantity(productId, amount) {

        const cart = getCart();

        const item = cart.find(
            product => String(product.id) === String(productId)
        );

        if (!item) return;

        item.quantity += amount;

        if (item.quantity <= 0) {
            removeFromCart(productId);
            return;
        }

        saveCart(cart);
    }

    function updateCartCount() {

        const cart = getCart();

        const count = cart.reduce(
            (total, item) => total + Number(item.quantity || 0),
            0
        );

        const ids = [
            "cartCount",
            "sidebarCartCount"
        ];

        ids.forEach(id => {
            const element = document.getElementById(id);

            if (element) {
                element.textContent = count;
            }
        });
    }

    window.ShopMax99.cart = {
        get: getCart,
        add: addToCart,
        remove: removeFromCart,
        changeQuantity: changeCartQuantity,
        save: saveCart
    };

    window.ShopMax99.user = {
        get: getUser
    };

    window.ShopMax99.checkout = checkout;
    window.ShopMax99.updateCartCount = updateCartCount;


    /* =====================================================
       WISHLIST COUNT
    ====================================================== */

    function getWishlist() {
        return getData(STORAGE.wishlist, []);
    }

    function updateWishlistCount() {

        const count = getWishlist().length;

        [
            "wishlistCount",
            "sidebarWishlistCount"
        ].forEach(id => {

            const element = document.getElementById(id);

            if (element) {
                element.textContent = count;
            }
        });
    }

    window.ShopMax99.wishlist = {
        get: getWishlist,
        save: function (items) {
            setData(STORAGE.wishlist, items);
            updateWishlistCount();
        }
    };


    /* =====================================================
       USER
    ====================================================== */

    function getUser() {
        return getData(STORAGE.user, null);
    }

    function updateUserUI() {
        const customerSession = getData(STORAGE.customerSession, null);
        const customerAccount = getData(STORAGE.customerAccount, null);
        const legacyUser = getUser();
        const loggedCustomer = customerSession?.loggedIn && customerAccount ? customerAccount : legacyUser;

        const name = loggedCustomer?.name ? loggedCustomer.name : "Sign in";
        const sidebarName = loggedCustomer?.name ? loggedCustomer.name : "ShopMax User";
        const profileName = loggedCustomer?.name ? loggedCustomer.name : "ShopMax User";
        const email = loggedCustomer?.email ? loggedCustomer.email : "Not logged in";

        const accountName = $("#accountName");
        const sidebarUserName = $("#sidebarUserName");
        const profileNameElement = $("#profileName");
        const profileEmail = $("#profileEmail");

        if (accountName) accountName.textContent = name;
        if (sidebarUserName) sidebarUserName.textContent = sidebarName;
        if (profileNameElement) profileNameElement.textContent = profileName;
        if (profileEmail) profileEmail.textContent = email;

        // Keep the uploaded profile picture visible everywhere on the customer UI.
        const picture = customerAccount?.profilePicture || loggedCustomer?.profilePicture || "";
        const avatarTargets = [$("#profileAvatarPreview"), $("#sidebarAvatar")];
        avatarTargets.forEach(avatar => {
            if (!avatar) return;
            if (picture) {
                avatar.innerHTML = `<img src="${escapeHTML(picture)}" alt="Profile picture">`;
                avatar.classList.add("has-profile-photo");
            } else {
                avatar.innerHTML = `<i class="fa-solid fa-user"></i>`;
                avatar.classList.remove("has-profile-photo");
            }
        });
    }



    /* =====================================================
       LOGIN FORM
    ====================================================== */

    function handleAuthSubmit(event) {

        event.preventDefault();

        const nameInput = $("#authName");
        const emailInput = $("#authEmail");

        const email = emailInput ? emailInput.value.trim() : "";
        const name =
            nameInput && nameInput.value.trim()
                ? nameInput.value.trim()
                : email.split("@")[0] || "ShopMax User";

        if (!email) {
            showToast("Please enter your email.", "error");
            return;
        }

        const user = {
            id: "CUS-" + Date.now(),
            name,
            email,
            createdAt: new Date().toISOString()
        };

        setData(STORAGE.user, user);

        updateUserUI();

        closeModal("authModal");

        showToast("Welcome to ShopMax99!");

        const form = $("#authForm");

        if (form) form.reset();
    }


    /* =====================================================
       SELLER REGISTRATION
    ====================================================== */

    function handleSellerRegistration(event) {

        event.preventDefault();

        const form = event.currentTarget;

        const formData = new FormData(form);

        const seller = {
            id: "SEL-" + Date.now(),

            fullName:
                formData.get("fullName")?.toString().trim(),

            shopName:
                formData.get("shopName")?.toString().trim(),

            email:
                formData.get("email")?.toString().trim(),

            phone:
                formData.get("phone")?.toString().trim(),

            address:
                formData.get("address")?.toString().trim(),

            status: "active",
            accountStatus: "active",
            password:
                formData.get("password")?.toString() || "",

            createdAt: new Date().toISOString()
        };

        if (
            !seller.fullName ||
            !seller.shopName ||
            !seller.email ||
            !seller.phone ||
            !seller.address
        ) {
            showToast(
                "Please fill all seller registration fields.",
                "error"
            );

            return;
        }

        const sellers = getData(STORAGE.sellers, []);

        sellers.push(seller);

        setData(STORAGE.sellers, sellers);

        closeModal("sellerRegisterModal");

        form.reset();

        showToast(
            "Seller account created successfully. You can login now."
        );

        if (typeof window.refreshAdminData === "function") {
            window.refreshAdminData();
        }
    }


    /* =====================================================
       SEARCH
    ====================================================== */

    function performSearch() {

        const input = $("#productSearch");

        const query = input
            ? input.value.trim()
            : "";

        if (typeof window.searchProducts === "function") {
            window.searchProducts(query);
        }

        showCustomerPage("home");
    }


    /* =====================================================
       CATEGORY
    ====================================================== */

    function selectCategory(category) {

        if (!category) return;

        $$(".category-link").forEach(item => {
            item.classList.toggle(
                "active",
                item.dataset.category === category
            );
        });

        if (window.ShopMax99.currentCustomerPage === "categories" && typeof window.openShopMax99CategoryBrowser === "function") {
            window.openShopMax99CategoryBrowser(category);
            return;
        }
        if (typeof window.filterProducts === "function") {
            window.filterProducts(category);
        }

        showCustomerPage("home");
    }


    /* =====================================================
       CHECKOUT
    ====================================================== */

    function checkout() {
        const cart = getCart();
        if (!cart.length) { showToast("Your cart is empty.", "warning"); return; }
        $$(".modal-overlay").forEach(modal => { modal.hidden = true; modal.style.display = ""; });
        document.body.style.overflow = "";
        const session = getData(STORAGE.customerSession, null);
        const customer = getData(STORAGE.customerAccount, null);
        if (session?.loggedIn && customer) {
            const required = [customer.name, customer.mobile, customer.address, customer.city, customer.pincode];
            if (required.some(value => !String(value || "").trim())) {
                showToast("Checkout se pehle My Profile mein delivery details complete karein.", "warning");
                showCustomerPage("profile"); return;
            }
        }
        renderCheckoutSummary();
        applyCustomerProfileToCheckout();
        showCustomerPage("checkout");
    }

    function applyCustomerProfileToCheckout() {
        const session = getData(STORAGE.customerSession, null);
        const customer = getData(STORAGE.customerAccount, null);
        if (!session?.loggedIn || !customer) return;
        const values = { checkoutFullName: customer.name || "", checkoutPhone: customer.mobile || "", checkoutAddress: customer.address || "", checkoutCity: customer.city || "", checkoutPincode: customer.pincode || "" };
        Object.entries(values).forEach(([id,value]) => { const input=document.getElementById(id); if(!input)return; input.value=value; input.readOnly=true; input.setAttribute("aria-readonly","true"); input.classList.add("profile-locked-field"); });
        const fields=document.querySelector("#checkoutForm .checkout-fields");
        if(fields && !fields.querySelector(".checkout-profile-lock-note")){ const note=document.createElement("div"); note.className="checkout-profile-lock-note full-field"; note.innerHTML='<i class="fa-solid fa-lock"></i><span>Delivery details profile se saved hain. Update karne ke liye <strong>My Profile</strong> par jayein.</span><button type="button" class="text-btn" data-customer-page="profile">Edit Profile</button>'; fields.prepend(note); }
    }
    function handleBuyNowCheckout() {
        const params = new URLSearchParams(window.location.search);
        const fromQuery = params.get("shopmax99_buy_now") === "1";
        const fromStorage = localStorage.getItem("shopmax99_buy_now") === "1";
        if (!fromQuery && !fromStorage) return;

        // Consume both triggers so refresh does not reopen checkout.
        localStorage.removeItem("shopmax99_buy_now");
        if (fromQuery) {
            try {
                const cleanUrl = window.location.pathname + window.location.hash;
                window.history.replaceState({}, document.title, cleanUrl);
            } catch (e) {}
        }

        // Let the normal V16 initialization finish first, then open the
        // existing checkout page using the same checkout() function as
        // the normal Cart -> Checkout button.
        setTimeout(function () {
            const cart = getCart();
            if (!cart.length) return;
            checkout();
        }, 100);
    }

    window.ShopMax99.applyCustomerProfileToCheckout=applyCustomerProfileToCheckout;

    function renderCheckoutSummary() {
        const cart = getCart();
        const items = $("#checkoutItems");
        const subtotalEl = $("#checkoutSubtotal");
        const totalEl = $("#checkoutTotal");

        let total = 0;

        if (items) {
            items.innerHTML = cart.map(item => {
                const qty = Number(item.quantity || 1);
                const price = Number(item.price || 99);
                total += price * qty;
                return `<div class="checkout-item">
                    <div class="checkout-item-image">${item.image ? `<img src="${escapeHTML(item.image)}" alt="">` : `<i class="fa-solid fa-box"></i>`}</div>
                    <div class="checkout-item-info"><strong>${escapeHTML(item.name)}</strong><span>Qty: ${qty}</span></div>
                    <strong>₹${price * qty}</strong>
                </div>`;
            }).join("");
        } else {
            total = cart.reduce((sum, item) => sum + Number(item.price || 99) * Number(item.quantity || 1), 0);
        }

        if (subtotalEl) subtotalEl.textContent = `₹${total}`;
        if (totalEl) totalEl.textContent = `₹${total}`;
    }

    function placeOrder(event) {
        event.preventDefault();

        const cart = getCart();
        if (!cart.length) {
            showToast("Your cart is empty.", "warning");
            showCustomerPage("cart");
            return;
        }

        const form = event.currentTarget;
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const paymentMethod = form.elements.paymentMethod?.value;
        if (!paymentMethod) {
            showToast("Please select a payment method.", "warning");
            return;
        }

        const total = cart.reduce(
            (sum, item) => sum + Number(item.price || 99) * Number(item.quantity || 1),
            0
        );

        const orders = getData(STORAGE.orders, []);
        const customer = getCustomerAccount() || {};
        const order = {
            id: "ORD-" + Date.now(),
            customerId: customer.id || getData(STORAGE.customerSession, null)?.customerId || "",
            customerName: customer.name || form.elements.fullName.value.trim(),
            customerEmail: customer.email || "",
            customerMobile: customer.mobile || form.elements.phone.value.trim(),
            items: cart.map(item => ({ ...item })),
            total,
            orderValue: total,
            sellerCost: cart.reduce((sum, item) => sum + Number(item.sellerPrice || 0) * Number(item.quantity || 1), 0),
            courierCost: 0,
            courierName: "",
            origin: "ShopMax99 Warehouse",
            destination: [form.elements.address.value.trim(), form.elements.city.value.trim(), customer.state || form.elements.state?.value?.trim() || "", form.elements.pincode.value.trim()].filter(Boolean).join(", "),
            deliveryBlocked: false,
            status: paymentMethod === "COD" ? "Placed" : "Payment Pending",
            paymentMethod,
            paymentStatus: paymentMethod === "COD" ? "Cash on Delivery" : "Pending - gateway required",
            deliveryDetails: {
                fullName: form.elements.fullName.value.trim(),
                phone: form.elements.phone.value.trim(),
                address: form.elements.address.value.trim(),
                city: form.elements.city.value.trim(),
                state: customer.state || form.elements.state?.value?.trim() || "",
                pincode: form.elements.pincode.value.trim()
            },
            date: new Date().toISOString()
        };

        orders.unshift(order);
        setData(STORAGE.orders, orders);

        // Record seller earnings in the shared financial ledger.
        const transactions = getData(STORAGE.transactions, []);
        const sellers = getData(STORAGE.sellers, []);
        (order.items || []).forEach((item, index) => {
            const sellerEmail = String(item.sellerEmail || "").toLowerCase();
            if (!sellerEmail) return;
            const seller = sellers.find(s => String(s.email || "").toLowerCase() === sellerEmail);
            const txId = `TX-ORDER-${order.id}-${index}-${sellerEmail}`;
            if (transactions.some(t => String(t.id) === txId)) return;
            transactions.push({
                id: txId,
                category: "order",
                type: "credit",
                amount: Number(item.sellerPrice || 0) * Number(item.quantity || 1),
                partyId: seller?.id || sellerEmail,
                partyName: seller?.shopName || seller?.name || sellerEmail,
                sellerId: seller?.id || "",
                sellerEmail,
                reference: order.id,
                description: `Seller earning from ${order.id} - ${item.name || "Product"}`,
                status: "completed",
                createdAt: order.date
            });
        });
        setData(STORAGE.transactions, transactions);

        setData(STORAGE.cart, []);
        updateCartCount();

        if (typeof window.renderCart === "function") window.renderCart();
        if (typeof window.renderOrders === "function") window.renderOrders();

        showCustomerPage("orders");

        if (paymentMethod === "COD") {
            showToast("Order placed successfully with Cash on Delivery!");
        } else {
            showToast("Order recorded. Connect a payment gateway to collect online payment.", "warning");
        }
    }


    /* =====================================================
       CUSTOMER PROFILE CENTER
    ====================================================== */
    function getCustomerAccount(){return getData(STORAGE.customerAccount,null);}
    function saveCustomerAccount(c){
        setData(STORAGE.customerAccount,c);
        const session=getData(STORAGE.customerSession,null);
        if(session?.loggedIn){
            setData(STORAGE.customerSession,{...session,name:c.name||"Customer",mobile:c.mobile||""});
            setData(STORAGE.user,{id:c.id,name:c.name||"Customer",email:c.email||"",mobile:c.mobile||"",profilePicture:c.profilePicture||"",createdAt:c.createdAt||new Date().toISOString()});
        }
        // Keep Admin Customer Directory synchronized after profile edits.
        try {
            const raw = JSON.parse(localStorage.getItem("shopmax99_users") || "[]");
            const users = Array.isArray(raw) ? raw : [];
            const index = users.findIndex(u => String(u.id || u.customerId || "") === String(c.id || ""));
            const record = { ...(index >= 0 ? users[index] : {}), ...c, id: c.id, customerId: c.id, role: "customer", updatedAt: new Date().toISOString() };
            if (index >= 0) users[index] = record; else users.unshift(record);
            localStorage.setItem("shopmax99_users", JSON.stringify(users));
        } catch (error) { console.warn("Customer directory update failed", error); }
        updateUserUI();
        if(typeof window.updateCustomerHeader==="function")window.updateCustomerHeader();
    }
    function setProfileFormEditable(type,editable){
        const card=document.querySelector(`[data-profile-card="${type}"]`);if(!card)return;
        card.querySelectorAll("input,textarea,select").forEach(el=>el.disabled=!editable);
        const actions=card.querySelector(`[data-profile-actions="${type}"]`);if(actions)actions.hidden=!editable;
        card.classList.toggle("is-editing",editable);
    }
    function clearProfileOtp(type){
        window.__shopmax99ProfileOtp=null;
        const box=document.getElementById(type==="address"?"profileAddressOtpBox":"profileContactOtpBox");
        if(box)box.hidden=true;
        const input=document.getElementById(type==="address"?"profileAddressOtp":"profileContactOtp");
        if(input)input.value="";
    }
    function populateCustomerProfile(){
        let c=getCustomerAccount();
        const session=getData(STORAGE.customerSession,null);
        const legacy=getUser();
        if(!c && session?.loggedIn){
            c={id:session.customerId||legacy?.id||("CUS_"+Date.now()),name:session.name||legacy?.name||"Customer",mobile:session.mobile||legacy?.mobile||"",email:legacy?.email||"",profilePicture:legacy?.profilePicture||"",createdAt:legacy?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
            saveCustomerAccount(c);
        }
        if(!c)return;
        const map={profileFullName:c.name||"",profileDob:c.dob||"",profileGender:c.gender||"",profileEmailInput:c.email||"",profileContactEmail:c.email||"",profileMobile:c.mobile||"",profileAddress:c.address||"",profileCity:c.city||"",profileState:c.state||"",profilePincode:c.pincode||""};
        Object.entries(map).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.value=v;});
        const n=$("#profileName"),e=$("#profileEmail"),m=$("#profileMobileDisplay"),id=$("#profileCustomerId");
        if(n)n.textContent=c.name||"Customer"; if(e)e.textContent=c.email||"Email not added"; if(m)m.textContent=c.mobile?`+91 ${c.mobile}`:"Mobile not added"; if(id)id.textContent=c.id||"—";
        const avatar=$("#profileAvatarPreview"); if(avatar){if(c.profilePicture){avatar.innerHTML=`<img src="${escapeHTML(c.profilePicture)}" alt="Profile picture">`;avatar.classList.add("has-profile-photo");}else{avatar.innerHTML='<i class="fa-solid fa-user"></i>';avatar.classList.remove("has-profile-photo");}}
        const side=$("#sidebarAvatar"); if(side){if(c.profilePicture){side.innerHTML=`<img src="${escapeHTML(c.profilePicture)}" alt="Profile picture">`;side.classList.add("has-profile-photo");}else{side.innerHTML='<i class="fa-solid fa-user"></i>';side.classList.remove("has-profile-photo");}}
        const vals=[c.name,c.dob,c.mobile,c.email,c.address,c.city,c.state,c.pincode,c.profilePicture],percent=Math.round(vals.filter(v=>String(v||"").trim()).length/vals.length*100);const pill=$("#profileCompletionPill");if(pill)pill.innerHTML=`<i class="fa-solid fa-shield-heart"></i> Profile ${percent}% Complete`;
    }
    function renderCustomerProfile(){
        const session=getData(STORAGE.customerSession,null),guest=$("#profileGuestState"),content=$("#profileLoggedInContent");if(!guest||!content)return;
        if(session?.loggedIn)populateCustomerProfile();
        const c=getCustomerAccount(),loggedIn=Boolean(session?.loggedIn&&c);guest.hidden=loggedIn;content.hidden=!loggedIn;if(!loggedIn)return;
        populateCustomerProfile();["personal","contact","address"].forEach(t=>setProfileFormEditable(t,false));clearProfileOtp("contact");clearProfileOtp("address");
    }
    function createProfileOtp(type){
        const mobile=document.getElementById("profileMobile")?.value.trim()||getCustomerAccount()?.mobile||"";
        if(!/^[6-9]\d{9}$/.test(mobile)){showToast("Valid 10-digit Indian mobile number enter karein.","error");return false;}
        const otp=String(Math.floor(100000+Math.random()*900000));
        window.__shopmax99ProfileOtp={otp,mobile,createdAt:Date.now(),type};
        const box=document.getElementById(type==="address"?"profileAddressOtpBox":"profileContactOtpBox");
        const demo=document.getElementById(type==="address"?"profileAddressDemoOtp":"profileContactDemoOtp");
        if(box)box.hidden=false;if(demo)demo.textContent=`Demo OTP: ${otp}`;
        showToast("OTP generated. Verify karke change save karein.");return true;
    }
    function startContactOTP(){return createProfileOtp("contact");}
    function verifyContactOTP(){
        const q=window.__shopmax99ProfileOtp,otp=$("#profileContactOtp")?.value.trim()||"";
        if(!q||q.type!=="contact"||Date.now()-q.createdAt>300000){showToast("OTP expired. Dobara OTP request karein.","error");return;}
        if(otp!==q.otp){showToast("Incorrect OTP.","error");return;}
        const c=getCustomerAccount();if(!c)return;
        c.mobile=q.mobile;c.mobileVerified=true;c.email=$("#profileContactEmail")?.value.trim()||c.email||"";c.updatedAt=new Date().toISOString();saveCustomerAccount(c);clearProfileOtp("contact");populateCustomerProfile();setProfileFormEditable("contact",false);showToast("Contact details verified and updated successfully.");
    }
    function verifyAddressOTP(){
        const q=window.__shopmax99ProfileOtp,otp=$("#profileAddressOtp")?.value.trim()||"";
        if(!q||q.type!=="address"||Date.now()-q.createdAt>300000){showToast("OTP expired. Dobara OTP request karein.","error");return;}
        if(otp!==q.otp){showToast("Incorrect OTP.","error");return;}
        const c=getCustomerAccount();if(!c)return;
        c.address=$("#profileAddress").value.trim();c.city=$("#profileCity").value.trim();c.state=$("#profileState").value.trim();c.pincode=$("#profilePincode").value.trim();c.addressVerified=true;c.updatedAt=new Date().toISOString();saveCustomerAccount(c);clearProfileOtp("address");populateCustomerProfile();setProfileFormEditable("address",false);showToast("Address verified and updated successfully.");
    }
    function bindProfileEvents(){
        document.addEventListener("click",event=>{
            const edit=event.target.closest("[data-profile-edit]");if(edit){setProfileFormEditable(edit.dataset.profileEdit,true);return;}
            const cancel=event.target.closest("[data-profile-cancel]");if(cancel){populateCustomerProfile();setProfileFormEditable(cancel.dataset.profileCancel,false);clearProfileOtp(cancel.dataset.profileCancel);return;}
        });
        $("#profileGuestLoginBtn")?.addEventListener("click",()=>openCustomerAuth());
        $("#profileVerifyContactOtp")?.addEventListener("click",verifyContactOTP);
        $("#profileVerifyAddressOtp")?.addEventListener("click",verifyAddressOTP);
        $("#profilePictureInput")?.addEventListener("change",event=>{const file=event.target.files?.[0];if(!file)return;if(!file.type.startsWith("image/")){showToast("Sirf image file upload karein.","error");event.target.value="";return;}if(file.size>200*1024){showToast("Profile picture 200 KB se chhoti honi chahiye.","error");event.target.value="";return;}const r=new FileReader();r.onload=()=>{const c=getCustomerAccount();if(!c)return;c.profilePicture=r.result;c.updatedAt=new Date().toISOString();saveCustomerAccount(c);populateCustomerProfile();showToast("Profile picture updated.");};r.readAsDataURL(file);});
        $("#profilePersonalForm")?.addEventListener("submit",event=>{event.preventDefault();const c=getCustomerAccount();if(!c)return;c.name=$("#profileFullName").value.trim();c.dob=$("#profileDob").value;c.gender=$("#profileGender").value;c.email=$("#profileEmailInput").value.trim();c.updatedAt=new Date().toISOString();saveCustomerAccount(c);populateCustomerProfile();setProfileFormEditable("personal",false);showToast("Personal details saved.");});
        $("#profileAddressForm")?.addEventListener("submit",event=>{event.preventDefault();const c=getCustomerAccount();if(!c)return;if(!$("#profileAddress").value.trim()||!$("#profileCity").value.trim()||!$("#profileState").value.trim()||!/^[0-9]{6}$/.test($("#profilePincode").value.trim())){showToast("Complete valid address details first.","error");return;}createProfileOtp("address");});
        $("#profileContactForm")?.addEventListener("submit",event=>{event.preventDefault();const c=getCustomerAccount();if(!c)return;const mobile=$("#profileMobile").value.trim();if(!/^[6-9]\d{9}$/.test(mobile)){showToast("Valid 10-digit mobile number enter karein.","error");return;}createProfileOtp("contact");});
    }

    /* =====================================================
       EVENT LISTENERS
    ====================================================== */

    function bindEvents() {

        /* Customer navigation */

        document.addEventListener("click", function (event) {

            const pageButton =
                event.target.closest("[data-customer-page]");

            if (pageButton) {

                const page =
                    pageButton.dataset.customerPage;

                showRole("customer");

                showCustomerPage(page);

                return;
            }


            const browserCategory = event.target.closest("[data-category-browser]");
            if (browserCategory && typeof window.openShopMax99CategoryBrowser === "function") {
                window.openShopMax99CategoryBrowser(browserCategory.dataset.categoryBrowser || "all");
                return;
            }

            /* Category buttons */

            const categoryButton =
                event.target.closest("[data-category]");

            if (
                categoryButton &&
                categoryButton.dataset.category
            ) {

                selectCategory(
                    categoryButton.dataset.category
                );

                return;
            }


            /* Role buttons */

            const roleButton =
                event.target.closest("[data-role]");

            if (roleButton) {

                showRole(
                    roleButton.dataset.role
                );

                return;
            }


            /* Close modal */

            const closeButton =
                event.target.closest("[data-close-modal]");

            if (closeButton) {

                closeModal(
                    closeButton.dataset.closeModal
                );

                return;
            }


            /* Account actions */

            const accountAction =
                event.target.closest("[data-account-action]");

            if (accountAction) {

                const action =
                    accountAction.dataset.accountAction;

                const dropdown = $("#accountDropdown");

                if (dropdown) {
                    dropdown.hidden = true;
                }

                if (action === "login") {
                    openModal("authModal");
                }

                if (action === "profile") {
                    showRole("customer");
                    showCustomerPage("profile");
                }

                if (action === "seller") {
                    showRole("seller");
                }

                if (action === "admin") {
                    showRole("admin");
                }

                return;
            }


            /* Seller nav */

            const sellerNav =
                event.target.closest("[data-seller-page]");

            if (sellerNav) {
                event.preventDefault();
                if (typeof window.showSellerPage === "function") {
                    window.showSellerPage(sellerNav.dataset.sellerPage);
                }
                return;
            }


            /* Admin nav */

            const adminNav =
                event.target.closest("[data-admin-page]");

            if (adminNav) {
                event.preventDefault();
                if (typeof window.showAdminPage === "function") {
                    window.showAdminPage(adminNav.dataset.adminPage);
                }
                return;
            }

        });


        /* Logo */

        const logo = $("#shopLogo");

        if (logo) {
            logo.addEventListener("click", () => {
                showRole("customer");
                showCustomerPage("home");
            });
        }


        /* Search */

        const searchButton = $("#searchBtn");

        if (searchButton) {
            searchButton.addEventListener(
                "click",
                performSearch
            );
        }

        const searchInput = $("#productSearch");

        if (searchInput) {

            searchInput.addEventListener(
                "keydown",
                event => {

                    if (event.key === "Enter") {
                        performSearch();
                    }

                }
            );
        }


        /* Account dropdown */

        const accountButton = $("#accountBtn");
        const accountDropdown = $("#accountDropdown");

        if (accountButton && accountDropdown) {

            accountButton.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    accountDropdown.hidden =
                        !accountDropdown.hidden;
                }
            );

            document.addEventListener("click", event => {

                if (
                    !accountDropdown.contains(event.target) &&
                    !accountButton.contains(event.target)
                ) {
                    accountDropdown.hidden = true;
                }

            });
        }


        /* Login buttons */

        const loginSidebar = $("#loginSidebarBtn");

        if (loginSidebar) {
            loginSidebar.addEventListener(
                "click",
                () => openModal("authModal")
            );
        }

        /* Seller registration */

        const sellerRegister =
            $("#openSellerRegister");

        if (sellerRegister) {
            sellerRegister.addEventListener(
                "click",
                () => openModal("sellerRegisterModal")
            );
        }


        /* Forms */

        const authForm = $("#authForm");

        if (authForm) {
            authForm.addEventListener(
                "submit",
                handleAuthSubmit
            );
        }

        const sellerForm =
            $("#sellerRegisterForm");

        if (sellerForm) {
            sellerForm.addEventListener(
                "submit",
                handleSellerRegistration
            );
        }


        /* Checkout */

        const checkoutButton = $("#checkoutBtn");

        if (checkoutButton) {
            checkoutButton.addEventListener("click", function (event) {
                event.preventDefault();
                checkout();
            });
        }

        const checkoutForm = $("#checkoutForm");
        if (checkoutForm) {
            checkoutForm.addEventListener("submit", placeOrder);
        }

        const backToCartButton = $("#backToCartBtn");
        if (backToCartButton) {
            backToCartButton.addEventListener("click", function () {
                showCustomerPage("cart");
            });
        }


        /* Escape key */

        document.addEventListener(
            "keydown",
            event => {

                if (event.key === "Escape") {

                    $$(".modal-overlay").forEach(
                        modal => {
                            modal.hidden = true;
                        }
                    );

                    document.body.style.overflow = "";
                }
            }
        );
    }


    /* =====================================================
       INITIALIZE
    ====================================================== */

    function initApp() {

        bindEvents();

        // Theme is handled centrally by bootstrap.js. Avoid a second click handler
        // here because two handlers can toggle dark mode twice in one click.
        bindProfileEvents();

        updateCartCount();
        updateWishlistCount();
        updateUserUI();

        showRole("customer");
        showCustomerPage("home");

        if (typeof window.initCustomer === "function") {
            window.initCustomer();
        }

        // Handle a Buy Now request after the complete V16 customer
        // initialization has finished. This keeps the normal home-page
        // initialization intact while opening the existing checkout page.
        handleBuyNowCheckout();
    }


    document.addEventListener(
        "DOMContentLoaded",
        initApp
    );

})();





/* =========================================================
   SHOPMAX99 — LOGOUT
========================================================= */

(function () {
    "use strict";

    function logoutToCustomer() {

        if (typeof window.ShopMax99?.showRole === "function") {
            window.ShopMax99.showRole("customer");
        } else {
            const customer = document.getElementById("customerApp");
            const seller = document.getElementById("sellerApp");
            const admin = document.getElementById("adminApp");

            if (customer) {
                customer.hidden = false;
                customer.style.display = "";
            }

            if (seller) {
                seller.hidden = true;
                seller.style.display = "none";
            }

            if (admin) {
                admin.hidden = true;
                admin.style.display = "none";
            }
        }

        if (typeof window.showCustomerPage === "function") {
            window.showCustomerPage("home");
        }

        window.scrollTo({
            top: 0,
            behavior: "auto"
        });
    }


    /* CUSTOMER LOGOUT */

    window.shopmax99CustomerLogout = function () {

        localStorage.removeItem("shopmax99_user");

        logoutToCustomer();

        if (typeof window.ShopMax99?.showToast === "function") {
            window.ShopMax99.showToast("Customer logout ho gaya.");
        }
    };


    /* SELLER LOGOUT */

    window.shopmax99SellerLogout = function () {

        /*
         * Seller bhi current shopmax99_user
         * se identify hota hai.
         */
        localStorage.removeItem("shopmax99_user");

        logoutToCustomer();

        if (typeof window.ShopMax99?.showToast === "function") {
            window.ShopMax99.showToast("Seller logout ho gaya.");
        }
    };


    /* ADMIN LOGOUT */

    window.shopmax99AdminLogout = function () {

        localStorage.removeItem("shopmax99_admin_session");

        logoutToCustomer();

        if (typeof window.ShopMax99?.showToast === "function") {
            window.ShopMax99.showToast("Admin logout ho gaya.");
        }
    };


    /* CUSTOMER ACCOUNT DROPDOWN */

    document.addEventListener("click", function (event) {

        const logoutButton =
            event.target.closest('[data-account-action="logout"]');

        if (!logoutButton) return;

        event.preventDefault();

        const dropdown =
            document.getElementById("accountDropdown");

        if (dropdown) {
            dropdown.hidden = true;
        }

        window.shopmax99CustomerLogout();
    });


    /* SELLER */

    document.addEventListener("click", function (event) {

        const button =
            event.target.closest("#sellerLogoutBtn");

        if (!button) return;

        event.preventDefault();

        window.shopmax99SellerLogout();
    });


    /* ADMIN */

    document.addEventListener("click", function (event) {

        const button =
            event.target.closest("#adminLogoutBtn");

        if (!button) return;

        event.preventDefault();

        window.shopmax99AdminLogout();
    });

})();

/* =========================================================
   SHOPMAX99 CUSTOMER LOGIN / SIGNUP
   Mobile Number + OTP Verification
   Login -> Logout
========================================================= */

(function () {
    "use strict";

    const CUSTOMER_KEY = "shopmax99_customer_account";
    const CUSTOMER_SESSION_KEY = "shopmax99_customer_session";

    function getCustomer() {
        try {
            return JSON.parse(
                localStorage.getItem(CUSTOMER_KEY) || "null"
            );
        } catch {
            return null;
        }
    }

    function getSession() {
        try {
            return JSON.parse(
                localStorage.getItem(CUSTOMER_SESSION_KEY) || "null"
            );
        } catch {
            return null;
        }
    }

    function saveCustomer(customer) {
        localStorage.setItem(
            CUSTOMER_KEY,
            JSON.stringify(customer)
        );

        // Maintain a permanent customer directory for Admin/Support.
        // Older builds only kept the currently logged-in customer in
        // shopmax99_customer_account, so every verified account is now
        // also upserted into shopmax99_users.
        try {
            const raw = JSON.parse(localStorage.getItem("shopmax99_users") || "[]");
            const users = Array.isArray(raw) ? raw : [];
            const index = users.findIndex(u => String(u.id || u.customerId || "") === String(customer.id || ""));
            const record = {
                ...(index >= 0 ? users[index] : {}),
                ...customer,
                customerId: customer.id,
                role: "customer",
                updatedAt: new Date().toISOString()
            };
            if (index >= 0) users[index] = record;
            else users.unshift(record);
            localStorage.setItem("shopmax99_users", JSON.stringify(users));
        } catch (error) {
            console.warn("Customer directory sync failed", error);
        }
    }

    function saveSession(customer) {
        localStorage.setItem(
            CUSTOMER_SESSION_KEY,
            JSON.stringify({
                loggedIn: true,
                customerId: customer.id,
                name: customer.name,
                mobile: customer.mobile,
                loginAt: new Date().toISOString()
            })
        );
    }

    function clearSession() {
        localStorage.removeItem(CUSTOMER_SESSION_KEY);
    }

    function makeId() {
        return (
            "CUS_" +
            Date.now() +
            "_" +
            Math.random()
                .toString(36)
                .substring(2, 8)
        );
    }

    function showMessage(message, type = "error") {
        const box = document.getElementById(
            "shopmax99CustomerAuthMessage"
        );

        if (!box) return;

        box.textContent = message;
        box.className =
            "shopmax99-auth-message " + type;
        box.style.display = "block";
    }

    function hideMessage() {
        const box = document.getElementById(
            "shopmax99CustomerAuthMessage"
        );

        if (box) {
            box.style.display = "none";
        }
    }

    /* =====================================================
       UPDATE HEADER
    ===================================================== */

    function updateCustomerHeader() {

        const accountBtn =
            document.getElementById("accountBtn");

        const accountName =
            document.getElementById("accountName");

        if (!accountBtn) return;

        const session = getSession();

        if (session && session.loggedIn) {

            accountBtn.innerHTML = `
                <i class="fa-solid fa-right-from-bracket"></i>

                <span class="account-text">
                    <small>Hello,</small>
                    <strong id="accountName">
                        ${escapeHTML(
                            session.name || "Customer"
                        )}
                    </strong>
                </span>

                <span class="account-logout-text">
                    Logout
                </span>
            `;

            accountBtn.classList.add(
                "customer-logged-in"
            );

            accountBtn.onclick = function (e) {
                e.preventDefault();
                customerLogout();
            };

        } else {

            accountBtn.innerHTML = `
                <i class="fa-regular fa-user"></i>

                <span class="account-text">
                    <small>Hello,</small>
                    <strong id="accountName">
                        Sign in
                    </strong>
                </span>

                <i class="fa-solid fa-chevron-down account-arrow"></i>
            `;

            accountBtn.classList.remove(
                "customer-logged-in"
            );

            accountBtn.onclick = function (e) {
                e.preventDefault();
                openCustomerAuth();
            };
        }
    }

    /* =====================================================
       HTML ESCAPE
    ===================================================== */

    function escapeHTML(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /* =====================================================
       AUTH MODAL
    ===================================================== */

    function createAuthModal() {

        if (
            document.getElementById(
                "shopmax99CustomerAuthModal"
            )
        ) {
            return;
        }

        const modal =
            document.createElement("div");

        modal.id =
            "shopmax99CustomerAuthModal";

        modal.className =
            "shopmax99-auth-overlay";

        modal.innerHTML = `

            <div class="shopmax99-auth-modal">

                <button
                    type="button"
                    class="shopmax99-auth-close"
                    id="shopmax99AuthClose"
                >
                    ×
                </button>

                <div class="shopmax99-auth-logo">
                    <img
                        src="logo.max99"
                        alt="ShopMax99"
                    >
                </div>

                <h2 id="shopmax99AuthTitle">
                    Login / Sign Up
                </h2>

                <p class="shopmax99-auth-subtitle">
                    Login or create your ShopMax99 account
                </p>

                <div
                    id="shopmax99CustomerAuthMessage"
                    class="shopmax99-auth-message"
                ></div>

                <!-- STEP 1 -->

                <form
                    id="shopmax99MobileForm"
                    class="shopmax99-auth-step"
                >

                    <div
                        class="shopmax99-auth-field"
                    >
                        <label>
                            Full Name
                        </label>

                        <input
                            type="text"
                            id="shopmax99CustomerName"
                            placeholder="Enter your full name"
                            maxlength="80"
                            required
                        >
                    </div>

                    <div
                        class="shopmax99-auth-field"
                    >
                        <label>
                            Mobile Number
                        </label>

                        <div
                            class="shopmax99-mobile-input"
                        >
                            <span>+91</span>

                            <input
                                type="tel"
                                id="shopmax99CustomerMobile"
                                placeholder="10-digit mobile number"
                                maxlength="10"
                                inputmode="numeric"
                                required
                            >
                        </div>
                    </div>

                    <div
                        class="shopmax99-auth-field"
                    >
                        <label>
                            Create Password
                        </label>

                        <input
                            type="password"
                            id="shopmax99CustomerPassword"
                            placeholder="Create a password"
                            minlength="6"
                            required
                        >
                    </div>

                    <button
                        type="submit"
                        class="shopmax99-auth-submit"
                    >
                        Send OTP
                    </button>

                </form>

                <!-- STEP 2 -->

                <form
                    id="shopmax99OtpForm"
                    class="shopmax99-auth-step"
                    style="display:none;"
                >

                    <div class="shopmax99-otp-info">
                        <i class="fa-solid fa-mobile-screen-button"></i>

                        <p>
                            OTP verification required
                        </p>

                        <span id="shopmax99OtpMobile">
                            +91 XXXXX XXXXX
                        </span>
                    </div>

                    <div
                        class="shopmax99-auth-field"
                    >
                        <label>
                            Enter OTP
                        </label>

                        <input
                            type="text"
                            id="shopmax99Otp"
                            placeholder="Enter 6-digit OTP"
                            maxlength="6"
                            inputmode="numeric"
                            autocomplete="one-time-code"
                            required
                        >
                    </div>

                    <button
                        type="submit"
                        class="shopmax99-auth-submit"
                    >
                        Verify OTP & Continue
                    </button>

                    <button
                        type="button"
                        id="shopmax99ResendOtp"
                        class="shopmax99-resend-btn"
                    >
                        Resend OTP
                    </button>

                    <button
                        type="button"
                        id="shopmax99ChangeMobile"
                        class="shopmax99-change-btn"
                    >
                        Change Mobile Number
                    </button>

                    <div
                        id="shopmax99DemoOtp"
                        class="shopmax99-demo-otp"
                    ></div>

                </form>

            </div>
        `;

        document.body.appendChild(modal);

        bindAuthEvents();
    }

    /* =====================================================
       OPEN AUTH
    ===================================================== */

    function openCustomerAuth() {

        createAuthModal();

        const modal =
            document.getElementById(
                "shopmax99CustomerAuthModal"
            );

        if (!modal) return;

        modal.style.display = "flex";

        showMobileStep();

        hideMessage();
    }

    /* =====================================================
       CLOSE AUTH
    ===================================================== */

    function closeCustomerAuth() {

        const modal =
            document.getElementById(
                "shopmax99CustomerAuthModal"
            );

        if (modal) {
            modal.style.display = "none";
        }
    }

    /* =====================================================
       MOBILE STEP
    ===================================================== */

    function showMobileStep() {

        const mobileForm =
            document.getElementById(
                "shopmax99MobileForm"
            );

        const otpForm =
            document.getElementById(
                "shopmax99OtpForm"
            );

        if (mobileForm) {
            mobileForm.style.display = "block";
        }

        if (otpForm) {
            otpForm.style.display = "none";
        }

        const title =
            document.getElementById(
                "shopmax99AuthTitle"
            );

        if (title) {
            title.textContent =
                "Login / Sign Up";
        }

        const otpBox =
            document.getElementById(
                "shopmax99DemoOtp"
            );

        if (otpBox) {
            otpBox.textContent = "";
        }
    }

    /* =====================================================
       SEND OTP
    ===================================================== */

    function sendCustomerOTP() {

        const name =
            document.getElementById(
                "shopmax99CustomerName"
            ).value.trim();

        const mobile =
            document.getElementById(
                "shopmax99CustomerMobile"
            ).value.trim();

        const password =
            document.getElementById(
                "shopmax99CustomerPassword"
            ).value;

        if (!name) {
            showMessage(
                "Please enter your full name."
            );
            return;
        }

        if (!/^[6-9]\d{9}$/.test(mobile)) {
            showMessage(
                "Please enter a valid 10-digit Indian mobile number."
            );
            return;
        }

        if (password.length < 6) {
            showMessage(
                "Password must contain at least 6 characters."
            );
            return;
        }

        /*
         * DEMO OTP
         * Real SMS OTP should be generated and sent
         * through backend/SMS provider.
         */

        const otp =
            Math.floor(
                100000 +
                Math.random() * 900000
            ).toString();

        window.shopmax99PendingCustomer = {
            name: name,
            mobile: mobile,
            password: password,
            otp: otp,
            createdAt: Date.now()
        };

        const mobileText =
            document.getElementById(
                "shopmax99OtpMobile"
            );

        if (mobileText) {
            mobileText.textContent =
                "+91 " +
                mobile.substring(0, 5) +
                " " +
                mobile.substring(5);
        }

        const demoOtp =
            document.getElementById(
                "shopmax99DemoOtp"
            );

        if (demoOtp) {
            demoOtp.innerHTML = `
                Demo OTP:
                <strong>${otp}</strong>
            `;
        }

        document.getElementById(
            "shopmax99MobileForm"
        ).style.display = "none";

        document.getElementById(
            "shopmax99OtpForm"
        ).style.display = "block";

        document.getElementById(
            "shopmax99AuthTitle"
        ).textContent = "Verify Mobile Number";

        hideMessage();

        document.getElementById(
            "shopmax99Otp"
        ).focus();
    }

    /* =====================================================
       VERIFY OTP
    ===================================================== */

    function verifyCustomerOTP() {

        const enteredOtp =
            document.getElementById(
                "shopmax99Otp"
            ).value.trim();

        const pending =
            window.shopmax99PendingCustomer;

        if (!pending) {
            showMessage(
                "OTP session expired. Please request a new OTP."
            );
            return;
        }

        if (
            Date.now() -
            pending.createdAt >
            5 * 60 * 1000
        ) {
            showMessage(
                "OTP expired. Please request a new OTP."
            );
            return;
        }

        if (enteredOtp !== pending.otp) {
            showMessage(
                "Incorrect OTP. Please enter the correct OTP."
            );
            return;
        }

        let existingCustomer =
            getCustomer();

        /*
         * Existing account with same mobile:
         * Login with verified mobile.
         */

        if (
            existingCustomer &&
            existingCustomer.mobile === pending.mobile
        ) {

            existingCustomer.name =
                pending.name ||
                existingCustomer.name;

            saveCustomer(existingCustomer);

            saveSession(existingCustomer);

        } else {

            /*
             * New customer account
             */

            const customer = {
                id: makeId(),
                name: pending.name,
                mobile: pending.mobile,
                password: pending.password,
                mobileVerified: true,
                createdAt:
                    new Date().toISOString(),
                updatedAt:
                    new Date().toISOString()
            };

            saveCustomer(customer);
            saveSession(customer);
        }

        window.shopmax99PendingCustomer = null;

        // Keep all customer UI layers synchronized after OTP login.
        const loggedCustomer = getCustomer();
        if (loggedCustomer) {
            saveSession(loggedCustomer);
            setData(STORAGE.user, {
                id: loggedCustomer.id,
                name: loggedCustomer.name || "Customer",
                email: loggedCustomer.email || "",
                mobile: loggedCustomer.mobile || "",
                profilePicture: loggedCustomer.profilePicture || "",
                createdAt: loggedCustomer.createdAt || new Date().toISOString()
            });
        }

        closeCustomerAuth();

        updateCustomerHeader();

        showCustomerLoginSuccess();
    }

    /* =====================================================
       LOGOUT
    ===================================================== */

    function customerLogout() {

        clearSession();
        localStorage.removeItem(STORAGE.user);

        updateCustomerHeader();

        /*
         * Return to customer home.
         */

        if (
            typeof window.showCustomerSection ===
            "function"
        ) {
            try {
                window.showCustomerSection("home");
            } catch (e) {}
        }

        alert("You have been logged out successfully.");
    }

    /* =====================================================
       SUCCESS MESSAGE
    ===================================================== */

    function showCustomerLoginSuccess() {

        const old =
            document.getElementById(
                "shopmax99LoginSuccess"
            );

        if (old) old.remove();

        const box =
            document.createElement("div");

        box.id =
            "shopmax99LoginSuccess";

        box.innerHTML = `
            <div class="shopmax99-success-box">
                <i class="fa-solid fa-circle-check"></i>
                <strong>Login Successful</strong>
                <span>
                    Welcome to ShopMax99.
                </span>
            </div>
        `;

        document.body.appendChild(box);

        setTimeout(() => {
            box.remove();
        }, 2500);
    }

    /* =====================================================
       RESEND OTP
    ===================================================== */

    function resendOTP() {

        const pending =
            window.shopmax99PendingCustomer;

        if (!pending) {
            showMobileStep();
            return;
        }

        const newOtp =
            Math.floor(
                100000 +
                Math.random() * 900000
            ).toString();

        pending.otp = newOtp;
        pending.createdAt = Date.now();

        const demoOtp =
            document.getElementById(
                "shopmax99DemoOtp"
            );

        if (demoOtp) {
            demoOtp.innerHTML = `
                Demo OTP:
                <strong>${newOtp}</strong>
            `;
        }

        showMessage(
            "A new OTP has been generated.",
            "success"
        );
    }

    /* =====================================================
       SITE MAINTENANCE CONTROL
       Admin can disable Customer + Seller access while keeping
       Admin / Staff access available.
    ====================================================== */

    (function initMaintenanceControl() {
        const SETTINGS_KEY = "shopmax99_settings";
        const MASTER_PASSKEY = "9007102062";

        function getSettings() {
            try {
                const raw = localStorage.getItem(SETTINGS_KEY);
                const value = JSON.parse(raw || "{}");
                return value && typeof value === "object" ? value : {};
            } catch (error) {
                return {};
            }
        }

        function saveSettings(settings) {
            try {
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
                window.dispatchEvent(new StorageEvent("storage", {
                    key: SETTINGS_KEY,
                    newValue: JSON.stringify(settings)
                }));
            } catch (error) {
                console.error("Maintenance settings save error:", error);
            }
        }

        function isActive() {
            return String(getSettings().storeStatus || "open") === "maintenance";
        }

        function showMaintenanceScreen() {
            const screen = document.getElementById("shopmax99MaintenanceScreen");
            if (!screen) return;
            screen.hidden = false;
            document.body.classList.add("shopmax99-maintenance-active");
        }

        function hideMaintenanceScreen() {
            const screen = document.getElementById("shopmax99MaintenanceScreen");
            if (!screen) return;
            screen.hidden = true;
            document.body.classList.remove("shopmax99-maintenance-active");
        }

        function apply(role) {
            const normalized = String(role || "customer").toLowerCase();
            if (isActive() && normalized !== "admin" && normalized !== "staff" && normalized !== "support") {
                showMaintenanceScreen();
                return true;
            }
            hideMaintenanceScreen();
            return false;
        }

        function openControl() {
            const modal = document.getElementById("maintenancePasskeyModal");
            const form = document.getElementById("maintenancePasskeyForm");
            const input = document.getElementById("maintenancePasskeyInput");
            const title = document.getElementById("maintenancePasskeyTitle");
            const text = document.getElementById("maintenancePasskeyText");
            if (!modal || !form || !input) {
                alert("Maintenance control is currently unavailable.");
                return;
            }
            const active = isActive();
            if (title) title.textContent = active ? "Take Site Live" : "Put Site Under Maintenance";
            if (text) text.textContent = active
                ? "Enter the master passkey to enable customer and seller access again."
                : "Enter the master passkey to disable customer and seller access.";
            input.value = "";
            modal.hidden = false;
            modal.style.zIndex = "4000000";
            document.body.style.overflow = "hidden";
            setTimeout(() => input.focus(), 30);
        }

        function bind() {
            const form = document.getElementById("maintenancePasskeyForm");
            if (!form || form.dataset.maintenanceBound === "1") return;
            form.dataset.maintenanceBound = "1";
            form.addEventListener("submit", function (event) {
                event.preventDefault();
                const input = document.getElementById("maintenancePasskeyInput");
                const value = String(input?.value || "").trim();
                if (value !== MASTER_PASSKEY) {
                    if (input) { input.value = ""; input.focus(); }
                    alert("Incorrect master passkey.");
                    return;
                }

                const settings = getSettings();
                const nextActive = !isActive();
                settings.storeStatus = nextActive ? "maintenance" : "open";
                settings.maintenanceUpdatedAt = new Date().toISOString();
                saveSettings(settings);

                const modal = document.getElementById("maintenancePasskeyModal");
                if (modal) modal.hidden = true;
                document.body.style.overflow = "";
                if (input) input.value = "";

                apply("admin");
                if (typeof window.refreshMaintenanceControlUI === "function") {
                    window.refreshMaintenanceControlUI();
                }
                if (typeof window.ShopMax99.showToast === "function") {
                    window.ShopMax99.showToast(nextActive
                        ? "Site is now under maintenance. Customer and Seller access is disabled."
                        : "Site is live again. Customer and Seller access is enabled.");
                }
            });
        }

        window.ShopMax99.maintenance = {
            isActive,
            apply,
            openControl,
            show: showMaintenanceScreen,
            hide: hideMaintenanceScreen
        };

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", function () {
                bind();
                apply("customer");
            }, { once: true });
        } else {
            bind();
            apply("customer");
        }
    })();


    /* =====================================================
       EVENT BINDING
    ===================================================== */

    function bindAuthEvents() {

        document
            .getElementById(
                "shopmax99AuthClose"
            )
            ?.addEventListener(
                "click",
                closeCustomerAuth
            );

        document
            .getElementById(
                "shopmax99MobileForm"
            )
            ?.addEventListener(
                "submit",
                function (e) {
                    e.preventDefault();
                    sendCustomerOTP();
                }
            );

        document
            .getElementById(
                "shopmax99OtpForm"
            )
            ?.addEventListener(
                "submit",
                function (e) {
                    e.preventDefault();
                    verifyCustomerOTP();
                }
            );

        document
            .getElementById(
                "shopmax99ResendOtp"
            )
            ?.addEventListener(
                "click",
                resendOTP
            );

        document
            .getElementById(
                "shopmax99ChangeMobile"
            )
            ?.addEventListener(
                "click",
                function () {
                    window.shopmax99PendingCustomer =
                        null;

                    showMobileStep();
                    hideMessage();
                }
            );
    }

    /* =====================================================
       INITIALIZE
    ===================================================== */

    function initCustomerAuth() {

        createAuthModal();

        updateCustomerHeader();

        /*
         * Restrict mobile field to numbers.
         */

        const mobileInput =
            document.getElementById(
                "shopmax99CustomerMobile"
            );

        if (mobileInput) {

            mobileInput.addEventListener(
                "input",
                function () {
                    this.value =
                        this.value
                            .replace(/\D/g, "")
                            .substring(0, 10);
                }
            );
        }

        const otpInput =
            document.getElementById(
                "shopmax99Otp"
            );

        if (otpInput) {

            otpInput.addEventListener(
                "input",
                function () {
                    this.value =
                        this.value
                            .replace(/\D/g, "")
                            .substring(0, 6);
                }
            );
        }
    }

    /*
     * Global functions
     */

    window.openCustomerAuth =
        openCustomerAuth;

    window.customerLogout =
        customerLogout;

    window.updateCustomerHeader =
        updateCustomerHeader;

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initCustomerAuth
        );
    } else {
        initCustomerAuth();
    }

})();
