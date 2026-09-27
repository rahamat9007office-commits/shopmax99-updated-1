/* =========================================================
   SHOPMAX99 - MASTER / SUPPORT CENTER
   Support accounts, scoped lookup, product editing drafts,
   Admin approval workflow, audit trail and staff payouts.
   ========================================================= */
(function () {
  "use strict";

  const KEYS = {
    staff: "shopmax99_support_staff",
    requests: "shopmax99_support_requests",
    audit: "shopmax99_support_audit",
    session: "shopmax99_support_session",
    sellers: "shopmax99_sellers",
    products: "shopmax99_products",
    orders: "shopmax99_orders",
    customer: "shopmax99_customer_account",
    users: "shopmax99_users",
    wishlist: "shopmax99_wishlist",
    transactions: "shopmax99_transactions",
    courier: "shopmax99_courier_partners"
  };

  const PRODUCT_IMAGE_MAX_BYTES = 100 * 1024;
  const PRODUCT_IMAGE_MAX_LABEL = "100 KB";
  const PRODUCT_IMAGE_MAX_COUNT = 4;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
  const read = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const value = JSON.parse(raw);
      return value ?? fallback;
    } catch {
      return fallback;
    }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const makeId = prefix => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const toast = message => window.ShopMax99?.showToast ? window.ShopMax99.showToast(message) : alert(message);
  const isAdmin = () => read("shopmax99_admin_session", null)?.role === "admin";
  const getSession = () => read(KEYS.session, null);
  const staff = () => {
    const session = getSession();
    if (!session?.staffId) return null;
    return read(KEYS.staff, []).find(item => String(item.id) === String(session.staffId)) || null;
  };
  const roleLabel = role => role === "seller_support" ? "Seller Support" : "Customer Support";
  const PRICING = window.ShopMax99?.pricing || {
    categories: [99,199,299,399,499,599,699,799,899,999].map(price => ({id:`price_${price}`,price,label:`₹${price}`})).concat([{id:"price_above_1000",price:null,label:"Above ₹1000"}]),
    getCategory: value => { const n=Number(value)||0; const price=[99,199,299,399,499,599,699,799,899,999].find(x=>n<=x); return price?{id:`price_${price}`,price,label:`₹${price}`}:{id:"price_above_1000",price:null,label:"Above ₹1000"}; },
    getFee: value => Math.max(29,(Number(value)||0)*.12),
    getSellerCap: value => { const c=[99,199,299,399,499,599,699,799,899,999].find(x=>(Number(value)||0)<=x); if(c===99)return 70;if(c===199)return 160;return c?Math.max(1,Number((c-Math.max(29,c*.12)).toFixed(2))):null; }
  };
  const pricingOptions = selected => PRICING.categories.map(item => `<option value="${esc(item.id)}" ${String(selected||"")===String(item.id)?"selected":""}>${esc(item.label)}</option>`).join("");

  function ensureProductIds() {
    const list = Array.isArray(read(KEYS.products, [])) ? read(KEYS.products, []) : [];
    const used = new Set();
    let changed = false;
    const next = list.map(product => {
      const current = String(product?.id || "").trim();
      if (current && !used.has(current)) {
        used.add(current);
        return product;
      }
      let id = "SM99-P-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();
      while (used.has(id)) id = "SM99-P-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();
      used.add(id);
      changed = true;
      return { ...product, id };
    });
    if (changed) write(KEYS.products, next);
    return next;
  }

  function products() { return ensureProductIds(); }
  function sellers() { const value = read(KEYS.sellers, []); return Array.isArray(value) ? value : []; }
  function orders() { const value = read(KEYS.orders, []); return Array.isArray(value) ? value : []; }
  function customers() {
    const output = [];
    const account = read(KEYS.customer, null);
    if (account) output.push({ ...account, source: "customer_account" });
    const users = read(KEYS.users, []);
    if (Array.isArray(users)) users.forEach(item => {
      if (!output.some(existing => String(existing.id) === String(item.id))) output.push({ ...item, source: "users" });
    });
    return output;
  }

  function hideWorkspaces() {
    ["customerApp", "sellerApp", "adminApp", "sellerSupportApp", "customerSupportApp"].forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.hidden = true;
        element.style.display = "none";
      }
    });
  }

  function showSupport(role) {
    const session = getSession();
    const activeStaff = session?.staffId
      ? read(KEYS.staff, []).find(item => String(item.id) === String(session.staffId))
      : null;
    if (!session || session.role !== role || !activeStaff || activeStaff.status === "blocked") {
      localStorage.removeItem(KEYS.session);
      openSupportLogin(role);
      return false;
    }
    const target = document.getElementById(role === "seller_support" ? "sellerSupportApp" : "customerSupportApp");
    if (!target) return false;
    // Support staff are authorized access, so the public maintenance
    // screen must never remain above their workspace after login.
    const maintenanceScreen = document.getElementById("shopmax99MaintenanceScreen");
    if (maintenanceScreen) maintenanceScreen.hidden = true;
    document.body.classList.remove("shopmax99-maintenance-active");
    hideWorkspaces();
    target.hidden = false;
    target.style.display = "";
    document.body.dataset.activeRole = role;
    window.ShopMax99.currentRole = role;
    window.scrollTo(0, 0);
    renderSupport(role, "dashboard");
    return true;
  }
  window.ShopMax99.showSupport = showSupport;

  function openMasterLogin() {
    if (typeof window.__openShopMax99MasterPasskey === "function") {
      window.__openShopMax99MasterPasskey();
      return;
    }
    const modal = document.getElementById("masterPasskeyModal");
    if (!modal) {
      alert("Master login is currently unavailable.");
      return;
    }
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(() => document.getElementById("masterPasskeyInput")?.focus(), 30);
  }
  window.openMasterLogin = openMasterLogin;

  function openSupportLogin(role) {
    const modal = $("#supportLoginModal");
    if (!modal) return;
    $("#supportLoginType").value = role;
    $("#supportLoginTitle").textContent = roleLabel(role) + " Login";
    $("#supportLoginNote").textContent = "Use the username and password provided by the ShopMax99 Admin. This account cannot be self-registered.";
    modal.hidden = false;
    modal.style.zIndex = "4000000";
    bindSupportLoginForm();
    document.body.style.overflow = "hidden";
    $("#supportLoginUsername")?.focus();
  }
  window.openSupportLogin = openSupportLogin;

  function closeModalById(id) {
    const modal = document.getElementById(id);
    if (modal) modal.remove();
    if (!$$(".modal-overlay").some(item => !item.hidden)) document.body.style.overflow = "";
  }

  function supportLogin(event) {
    event.preventDefault();
    event.stopPropagation();
    const role = String($("#supportLoginType")?.value || "").trim().toLowerCase();
    const username = String($("#supportLoginUsername")?.value || "").trim().toLowerCase();
    const password = String($("#supportLoginPassword")?.value || "");
    const allowedRoles = new Set(["seller_support", "customer_support"]);
    if (!allowedRoles.has(role)) {
      toast("Invalid support login type.");
      return;
    }
    if (!username || !password) {
      toast("Enter your support username and password.");
      return;
    }
    const rawList = read(KEYS.staff, []);
    const list = Array.isArray(rawList) ? rawList : [];
    const normalizeRole = value => {
      const raw = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
      if (["seller", "seller_support", "sellersupport", "seller_support_staff", "seller_support_login"].includes(raw)) return "seller_support";
      if (["customer", "customer_support", "customersupport", "customer_support_staff", "customer_support_login"].includes(raw)) return "customer_support";
      return raw;
    };
    const normalizeUsername = value => String(value ?? "").trim().toLowerCase();
    const account = list.find(item => {
      const itemRole = normalizeRole(item?.role || item?.supportType || item?.type || item?.supportRole);
      const itemUsername = normalizeUsername(item?.username || item?.loginUsername || item?.supportUsername || item?.userName);
      return itemRole === role && itemUsername === username;
    });
    if (!account) {
      toast("Support ID not found for this support type. Check the username created by Admin.");
      return;
    }
    const savedPassword = String(account.password ?? account.loginPassword ?? account.pass ?? account.loginPass ?? "");
    if (savedPassword !== password) {
      toast("Incorrect support password. Check the exact password created by Admin.");
      return;
    }
    const status = String(account.status || "active").trim().toLowerCase();
    if (status === "blocked" || status === "disabled" || status === "suspended") {
      toast("This support ID is blocked by Admin.");
      return;
    }
    if (status !== "active" && status !== "approved") {
      toast("This support ID is not active. Contact Admin.");
      return;
    }
    account.role = role;
    account.status = "active";
    account.lastLoginAt = new Date().toISOString();
    const index = list.findIndex(item => String(item.id) === String(account.id));
    if (index >= 0) list[index] = account;
    write(KEYS.staff, list);
    write(KEYS.session, { staffId: account.id, role, loginAt: new Date().toISOString() });
    logAudit(account.id, role, "support_login", "system");
    const form = event.currentTarget;
    form.reset();
    const modal = $("#supportLoginModal");
    if (modal) modal.hidden = true;
    document.body.style.overflow = "";
    if (!showSupport(role)) {
      toast("Support workspace could not be opened. Please reload the page and try again.");
    }
  }

  function logoutSupport() {
    const session = getSession();
    if (session) logAudit(session.staffId, session.role, "support_logout", "system");
    localStorage.removeItem(KEYS.session);
    if (window.ShopMax99?.showRole) window.ShopMax99.showRole("customer");
  }
  window.shopmax99SupportLogout = logoutSupport;

  function logAudit(actorId, actorRole, action, target, extra = {}) {
    const rows = read(KEYS.audit, []);
    rows.unshift({ id: makeId("AUD"), actorId, actorRole, action, target, createdAt: new Date().toISOString(), ...extra });
    write(KEYS.audit, rows.slice(0, 1000));
  }

  function searchAccounts(type, query) {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return [];
    const list = type === "seller" ? sellers() : customers();
    return list.filter(item => [item.id, item.name, item.fullName, item.shopName, item.email, item.phone, item.mobile]
      .some(value => String(value || "").toLowerCase().includes(q)));
  }

  function sellerDetail(seller) {
    const ps = products().filter(product => String(product.sellerId || "") === String(seller.id) || String(product.sellerEmail || "").toLowerCase() === String(seller.email || "").toLowerCase());
    const os = orders().filter(order => (order.items || []).some(item => String(item.sellerId || "") === String(seller.id) || String(item.sellerEmail || "").toLowerCase() === String(seller.email || "").toLowerCase()));
    const tx = read(KEYS.transactions, []).filter(item => String(item.sellerId || "") === String(seller.id) || String(item.sellerEmail || "").toLowerCase() === String(seller.email || "").toLowerCase());
    return { seller, products: ps, orders: os, transactions: tx };
  }

  function customerDetail(customer) {
    const os = orders().filter(order =>
      String(order.customerId || "") === String(customer.id || "") ||
      String(order.customerMobile || order.mobile || order.deliveryDetails?.phone || "") === String(customer.mobile || customer.phone || "") ||
      String(order.customerEmail || "").toLowerCase() === String(customer.email || "").toLowerCase() ||
      String(order.customerName || order.deliveryDetails?.fullName || "").toLowerCase() === String(customer.name || customer.fullName || "").toLowerCase()
    );
    return { customer, orders: os, wishlist: read(KEYS.wishlist, []) };
  }

  function shell(role, body) {
    const sellerRole = role === "seller_support";
    const appId = sellerRole ? "sellerSupportApp" : "customerSupportApp";
    const title = sellerRole ? "Seller Support Center" : "Customer Support Center";
    const menu = sellerRole
      ? [
          ["dashboard", "fa-gauge-high", "Dashboard"],
          ["search", "fa-store", "Search Sellers"],
          ["products", "fa-boxes-stacked", "Search Products"],
          ["requests", "fa-file-circle-check", "My Requests"]
        ]
      : [
          ["dashboard", "fa-gauge-high", "Dashboard"],
          ["search", "fa-user", "Search Customers"],
          ["requests", "fa-file-circle-check", "My Requests"]
        ];
    return `<div class="support-workspace-shell">
      <header class="workspace-header support-header">
        <div class="workspace-brand">
          <button type="button" class="workspace-back-btn" data-role="customer"><i class="fa-solid fa-arrow-left"></i></button>
          <div class="workspace-logo"><span>ShopMax</span><strong>99</strong></div>
          <div class="workspace-title"><strong>${title}</strong><span>Lookup + controlled Admin approval workflow</span></div>
        </div>
        <div class="workspace-header-actions"><span class="admin-status-badge support-badge">${roleLabel(role)}</span><button type="button" class="workspace-theme-btn" data-theme-panel-toggle title="Switch theme" aria-label="Switch light and dark mode" aria-pressed="false"><i class="fa-solid fa-moon"></i><span>Theme</span></button><button type="button" class="workspace-logout-btn" id="${sellerRole ? "sellerSupportLogoutBtn" : "customerSupportLogoutBtn"}"><i class="fa-solid fa-right-from-bracket"></i> Logout</button></div>
      </header>
      <button type="button" class="workspace-mobile-menu-btn" data-workspace-menu="supportSidebar" aria-controls="supportSidebar" aria-expanded="false"><i class="fa-solid fa-bars"></i><span>Menu</span></button><div class="workspace-mobile-backdrop" data-workspace-backdrop hidden></div>
      <div class="workspace-layout">
        <aside class="workspace-sidebar support-sidebar" id="supportSidebar"><button type="button" class="workspace-mobile-close" data-workspace-menu-close aria-label="Close menu"><i class="fa-solid fa-xmark"></i></button><div class="workspace-sidebar-label">SUPPORT MENU</div><nav class="workspace-nav">${menu.map(item => `<button type="button" class="workspace-nav-item" data-support-page="${item[0]}" data-support-role="${role}"><i class="fa-solid ${item[1]}"></i><span>${item[2]}</span></button>`).join("")}</nav><div class="support-readonly-box"><i class="fa-solid fa-shield-halved"></i><strong>Controlled access</strong><span>Support can inspect records. Any business change becomes an Admin approval request.</span></div></aside>
        <main class="workspace-content"><div class="workspace-pages" id="${sellerRole ? "sellerSupportPages" : "customerSupportPages"}">${body}</div></main>
      </div>
    </div>`;
  }

  function ensureShell(role) {
    const target = document.getElementById(role === "seller_support" ? "sellerSupportApp" : "customerSupportApp");
    if (!target) return null;
    const contentId = role === "seller_support" ? "sellerSupportPageContent" : "customerSupportPageContent";
    if (!$("#" + contentId, target)) target.innerHTML = shell(role, `<div id="${contentId}"></div>`);
    return target;
  }

  function renderDashboard(role) {
    const account = staff();
    const all = read(KEYS.requests, []);
    const mine = all.filter(item => item.requestedBy === account?.id);
    const pending = mine.filter(item => ["pending", "accepted"].includes(item.status)).length;
    const completed = mine.filter(item => item.status === "completed").length;
    const rejected = mine.filter(item => item.status === "rejected").length;
    return `<div class="support-page-header"><div><span class="seller-kicker">SUPPORT OPERATIONS</span><h1>Welcome, ${esc(account?.displayName || account?.username || "Support Staff")}</h1><p>Search ${role === "seller_support" ? "seller and product" : "customer"} records, investigate issues and submit controlled changes.</p></div></div><div class="seller-stats-grid"><div class="seller-stat-card"><span>Open Requests</span><strong>${pending}</strong></div><div class="seller-stat-card approved"><span>Completed</span><strong>${completed}</strong></div><div class="seller-stat-card"><span>Rejected</span><strong>${rejected}</strong></div></div><div class="support-info-grid"><div class="support-info-card"><i class="fa-solid fa-eye"></i><strong>Detailed lookup</strong><span>View the records needed to resolve customer or seller queries.</span></div><div class="support-info-card"><i class="fa-solid fa-pen-to-square"></i><strong>Propose changes</strong><span>Product edits are prepared as drafts and sent to Admin for approval.</span></div><div class="support-info-card"><i class="fa-solid fa-user-shield"></i><strong>Admin controlled</strong><span>Support staff never directly changes protected business data.</span></div></div>`;
  }

  function renderSearchPage(role) {
    if (role === "seller_support") {
      return `<div class="support-page-header"><div><span class="seller-kicker">SELLER LOOKUP</span><h1>Search Sellers</h1><p>Search by seller ID, name, shop, email or phone.</p></div></div><form id="sellerSupportSearchForm" class="support-search-form"><input name="q" required placeholder="Seller ID / name / shop / email / phone"><button class="primary-btn" type="submit"><i class="fa-solid fa-magnifying-glass"></i> Search</button></form><div id="sellerSupportSearchResults" class="support-results"></div>`;
    }
    return `<div class="support-page-header"><div><span class="seller-kicker">CUSTOMER LOOKUP</span><h1>Search Customers</h1><p>Search by customer ID, name, mobile or email.</p></div></div><form id="customerSupportSearchForm" class="support-search-form"><input name="q" required placeholder="Customer ID / name / mobile / email"><button class="primary-btn" type="submit"><i class="fa-solid fa-magnifying-glass"></i> Search</button></form><div id="customerSupportSearchResults" class="support-results"></div>`;
  }

  function renderProductSearchPage() {
    return `<div class="support-page-header"><div><span class="seller-kicker">PRODUCT LOOKUP</span><h1>Search Seller Products</h1><p>Every listed product has a unique Product ID. Search by Product ID, product name, seller ID, shop name or seller email.</p></div></div><form id="sellerSupportProductSearchForm" class="support-search-form"><input name="q" required placeholder="Product ID / product name / seller ID / seller name / email"><button class="primary-btn" type="submit"><i class="fa-solid fa-magnifying-glass"></i> Search</button></form><div id="sellerSupportProductResults" class="support-results"></div>`;
  }

  function renderRequests(role) {
    const account = staff();
    const rows = read(KEYS.requests, []).filter(item => item.requestedBy === account?.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return `<div class="support-page-header"><div><span class="seller-kicker">WORKFLOW</span><h1>My Change Requests</h1><p>Track every request sent to Admin.</p></div></div><div class="support-request-list">${rows.length ? rows.map(requestCard).join("") : "<div class='support-empty'>No requests submitted yet.</div>"}</div>`;
  }

  function requestCard(request) {
    return `<article class="support-request-card"><div class="support-request-title-row"><strong>${esc(request.title)}</strong><span class="support-status ${esc(request.status)}">${esc(request.status)}</span></div><p>${esc(request.summary || "")}</p><small>Created ${request.createdAt ? new Date(request.createdAt).toLocaleString("en-IN") : "-"}${request.reviewedAt ? ` · Reviewed ${new Date(request.reviewedAt).toLocaleString("en-IN")}` : ""}</small>${request.adminNote ? `<div class="support-admin-note"><strong>Admin note:</strong> ${esc(request.adminNote)}</div>` : ""}</article>`;
  }

  function renderSupport(role, page = "dashboard") {
    if (getSession()?.role !== role) return;
    ensureShell(role);
    const content = $(role === "seller_support" ? "#sellerSupportPageContent" : "#customerSupportPageContent");
    if (!content) return;
    const selector = role === "seller_support" ? "#sellerSupportApp [data-support-page]" : "#customerSupportApp [data-support-page]";
    $$(selector).forEach(button => button.classList.toggle("active", button.dataset.supportPage === page));
    content.innerHTML = page === "dashboard" ? renderDashboard(role) : page === "search" ? renderSearchPage(role) : page === "products" ? renderProductSearchPage() : renderRequests(role);
  }

  function sellerResultHTML(seller) {
    const detail = sellerDetail(seller);
    return `<article class="support-result-card"><div class="support-result-head"><div><strong>${esc(seller.shopName || seller.fullName || seller.email)}</strong><span>${esc(seller.id)} · ${esc(seller.status || "pending")}</span></div><button class="primary-btn small" data-support-view="seller" data-id="${esc(seller.id)}">View full details</button></div><div class="support-mini-grid"><span><b>Email</b>${esc(seller.email || "-")}</span><span><b>Phone</b>${esc(seller.phone || "-")}</span><span><b>Products</b>${detail.products.length}</span><span><b>Orders</b>${detail.orders.length}</span></div></article>`;
  }

  function customerResultHTML(customer) {
    const detail = customerDetail(customer);
    return `<article class="support-result-card"><div class="support-result-head"><div><strong>${esc(customer.name || customer.fullName || customer.mobile || customer.email || "Customer")}</strong><span>${esc(customer.id || "-")} · ${esc(customer.status || "active")}</span></div><button class="primary-btn small" data-support-view="customer" data-id="${esc(customer.id || customer.mobile || customer.email)}">View full details</button></div><div class="support-mini-grid"><span><b>Mobile</b>${esc(customer.mobile || customer.phone || "-")}</span><span><b>Email</b>${esc(customer.email || "-")}</span><span><b>Orders</b>${detail.orders.length}</span><span><b>Account</b>${esc(customer.status || "active")}</span></div></article>`;
  }

  function productSearch(query) {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return [];
    const list = products();
    const sellerList = sellers();
    return list.filter(product => {
      const seller = sellerList.find(item => String(item.id) === String(product.sellerId || "") || String(item.email || "").toLowerCase() === String(product.sellerEmail || "").toLowerCase());
      return [
        product.id,
        product.name,
        product.category,
        product.sellerId,
        product.sellerEmail,
        seller?.fullName,
        seller?.shopName,
        seller?.email,
        seller?.phone
      ].some(value => String(value || "").toLowerCase().includes(q));
    });
  }

  function productResultHTML(product) {
    const seller = sellers().find(item => String(item.id) === String(product.sellerId || "") || String(item.email || "").toLowerCase() === String(product.sellerEmail || "").toLowerCase());
    return `<article class="support-result-card support-product-result"><div class="support-result-head"><div><strong>${esc(product.name || "Product")}</strong><span class="product-id-badge">${esc(product.id)}</span></div><button type="button" class="primary-btn small" data-support-product-edit="${esc(product.id)}">Edit Product</button></div><div class="support-mini-grid"><span><b>Seller</b>${esc(seller?.shopName || seller?.fullName || product.sellerEmail || "-")}</span><span><b>Seller ID</b>${esc(product.sellerId || "-")}</span><span><b>Seller Price</b>₹${Number(product.sellerPrice || 0)}</span><span><b>Status</b>${esc(product.status || "pending")}</span></div></article>`;
  }

  function sellerDetailHTML(seller) {
    const detail = sellerDetail(seller);
    const productsHtml = detail.products.length ? `<div class="support-table-wrap"><table><thead><tr><th>Product ID</th><th>Product</th><th>Category</th><th>Seller Price</th><th>Customer Price</th><th>Status</th><th>Stock</th><th>Action</th></tr></thead><tbody>${detail.products.map(product => `<tr><td>${esc(product.id)}</td><td>${esc(product.name || "-")}</td><td>${esc(product.pricingCategory || product.category || "-")}</td><td>₹${Number(product.sellerPrice || 0)}</td><td>₹${Number(product.customerPrice || product.price || 0)}</td><td>${esc(product.status || "-")}</td><td>${esc(product.stock ?? "-")}</td><td><button type="button" class="secondary-btn small" data-support-product-edit="${esc(product.id)}">Edit</button></td></tr>`).join("")}</tbody></table></div>` : "<p>No products.</p>";
    const transactionsJson = esc(JSON.stringify(detail.transactions || [], null, 2));
    const ordersJson = esc(JSON.stringify(detail.orders || [], null, 2));
    const profilePicture = seller.profilePicture || seller.avatar || "";
    return `<div class="support-detail">
      <div class="support-detail-header"><div><span class="seller-kicker">SELLER PROFILE + FULL RECORD</span><h2>${esc(seller.shopName || seller.fullName || "Seller")}</h2><p>${esc(seller.id)} · ${esc(seller.status || "active")}</p></div><button type="button" class="secondary-btn" data-support-back-search="seller">Back</button></div>
      <div class="support-detail-grid">
        <div><b>Full Name</b><span>${esc(seller.fullName || "-")}</span></div><div><b>Shop Name</b><span>${esc(seller.shopName || "-")}</span></div><div><b>Email</b><span>${esc(seller.email || "-")}</span></div><div><b>Phone</b><span>${esc(seller.phone || seller.mobile || "-")}</span></div><div><b>Address</b><span>${esc(seller.address || "-")}</span></div><div><b>City / State / PIN</b><span>${esc([seller.city,seller.state,seller.pincode].filter(Boolean).join(" / ") || "-")}</span></div><div><b>Profile Picture</b><span>${profilePicture ? "Uploaded" : "Not uploaded"}</span></div><div><b>Status</b><span>${esc(seller.status || "active")}</span></div><div><b>Created</b><span>${esc(seller.createdAt || "-")}</span></div><div><b>Transactions</b><span>${detail.transactions.length}</span></div><div><b>Orders</b><span>${detail.orders.length}</span></div><div><b>Listed Products</b><span>${detail.products.length}</span></div>
      </div>
      <div class="support-detail-section"><h3>Listed Items (${detail.products.length})</h3>${productsHtml}</div>
      <div class="support-detail-section"><h3>Orders (${detail.orders.length})</h3>${detail.orders.length ? `<div class="support-table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th><th>Date</th></tr></thead><tbody>${detail.orders.map(order => `<tr><td>${esc(order.id || "-")}</td><td>${esc(order.customerName || order.customerMobile || "-")}</td><td>${esc(order.status || "Placed")}</td><td>₹${Number(order.total || 0)}</td><td>${esc(order.date || order.createdAt || "-")}</td></tr>`).join("")}</tbody></table></div>` : "<p>No orders.</p>"}</div>
      <div class="support-detail-section"><h3>Transactions / Earnings (${detail.transactions.length})</h3>${detail.transactions.length ? `<div class="support-table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Amount</th><th>Reference</th><th>Status</th><th>Description</th></tr></thead><tbody>${detail.transactions.map(tx => `<tr><td>${esc(tx.createdAt ? new Date(tx.createdAt).toLocaleString("en-IN") : "-")}</td><td>${esc(tx.type || "-")}</td><td>${esc(tx.category || "-")}</td><td>₹${Number(tx.amount || 0)}</td><td>${esc(tx.reference || "-")}</td><td>${esc(tx.status || "-")}</td><td>${esc(tx.description || "-")}</td></tr>`).join("")}</tbody></table></div>` : "<p>No transactions.</p>"}</div>
      <div class="support-change-panel"><h3>Edit Complete Seller Record</h3><p>Support staff can prepare profile, profile picture, address, earnings/transactions and order-detail changes. <strong>Live data will not change until Admin approves.</strong> Listed products have their own Edit button above.</p>
        <form data-support-comprehensive-form data-target-type="seller" data-target-id="${esc(seller.id)}">
          <input type="hidden" name="targetName" value="${esc(seller.shopName || seller.fullName || seller.email || "")}">
          <div class="support-editor-grid">
            <label class="support-editor-field"><span>Full Name</span><input name="fullName" value="${esc(seller.fullName || "")}"></label>
            <label class="support-editor-field"><span>Shop Name</span><input name="shopName" value="${esc(seller.shopName || "")}"></label>
            <label class="support-editor-field"><span>Email</span><input name="email" type="email" value="${esc(seller.email || "")}"></label>
            <label class="support-editor-field"><span>Phone / Mobile</span><input name="phone" value="${esc(seller.phone || seller.mobile || "")}"></label>
            <label class="support-editor-field support-editor-wide"><span>Address</span><textarea name="address">${esc(seller.address || "")}</textarea></label>
            <label class="support-editor-field"><span>City</span><input name="city" value="${esc(seller.city || "")}"></label>
            <label class="support-editor-field"><span>State</span><input name="state" value="${esc(seller.state || "")}"></label>
            <label class="support-editor-field"><span>Pincode</span><input name="pincode" value="${esc(seller.pincode || "")}"></label>
            <label class="support-editor-field"><span>Account Status</span><select name="status"><option value="active" ${seller.status === "active" ? "selected" : ""}>Active</option><option value="approved" ${seller.status === "approved" ? "selected" : ""}>Approved</option><option value="pending" ${seller.status === "pending" ? "selected" : ""}>Pending</option><option value="blocked" ${seller.status === "blocked" ? "selected" : ""}>Blocked</option><option value="rejected" ${seller.status === "rejected" ? "selected" : ""}>Rejected</option></select></label>
            <label class="support-editor-field"><span>Profile Picture</span><input name="profilePictureFile" type="file" accept="image/*"><small>${profilePicture ? "Existing picture will be kept if no new file is selected." : "Optional image upload."}</small></label>
            <label class="support-editor-field support-editor-wide"><span>Earnings / Transactions — JSON</span><textarea name="transactionsJson" spellcheck="false">${transactionsJson}</textarea></label>
            <label class="support-editor-field support-editor-wide"><span>Order Details — JSON</span><textarea name="ordersJson" spellcheck="false">${ordersJson}</textarea></label>
          </div>
          <div class="support-editor-actions"><button class="primary-btn" type="submit"><i class="fa-solid fa-paper-plane"></i> Send Complete Before / After to Admin</button></div>
        </form>
      </div>
    </div>`;
  }

  function customerDetailHTML(customer) {
    const detail = customerDetail(customer);
    const transactions = read(KEYS.transactions, []).filter(tx => String(tx.customerId || "") === String(customer.id || "") || String(tx.customerEmail || "").toLowerCase() === String(customer.email || "").toLowerCase() || String(tx.customerMobile || tx.mobile || "") === String(customer.mobile || customer.phone || ""));
    const transactionsJson = esc(JSON.stringify(transactions, null, 2));
    const ordersJson = esc(JSON.stringify(detail.orders || [], null, 2));
    const profilePicture = customer.profilePicture || customer.avatar || "";
    return `<div class="support-detail">
      <div class="support-detail-header"><div><span class="seller-kicker">CUSTOMER PROFILE + FULL RECORD</span><h2>${esc(customer.name || customer.fullName || customer.mobile || "Customer")}</h2><p>${esc(customer.id || "-")} · ${esc(customer.status || "active")}</p></div><button type="button" class="secondary-btn" data-support-back-search="customer">Back</button></div>
      <div class="support-detail-grid">
        <div><b>Name</b><span>${esc(customer.name || customer.fullName || "-")}</span></div><div><b>Mobile</b><span>${esc(customer.mobile || customer.phone || "-")}</span></div><div><b>Email</b><span>${esc(customer.email || "-")}</span></div><div><b>Address</b><span>${esc(customer.address || "-")}</span></div><div><b>City / State / PIN</b><span>${esc([customer.city,customer.state,customer.pincode].filter(Boolean).join(" / ") || "-")}</span></div><div><b>Profile Picture</b><span>${profilePicture ? "Uploaded" : "Not uploaded"}</span></div><div><b>Status</b><span>${esc(customer.status || "active")}</span></div><div><b>Created</b><span>${esc(customer.createdAt || "-")}</span></div><div><b>Orders</b><span>${detail.orders.length}</span></div><div><b>Transactions</b><span>${transactions.length}</span></div>
      </div>
      <div class="support-detail-section"><h3>Order Details (${detail.orders.length})</h3>${detail.orders.length ? `<div class="support-table-wrap"><table><thead><tr><th>Order</th><th>Status</th><th>Total</th><th>Date</th><th>Items</th></tr></thead><tbody>${detail.orders.map(order => `<tr><td>${esc(order.id || "-")}</td><td>${esc(order.status || "Placed")}</td><td>₹${Number(order.total || 0)}</td><td>${esc(order.date || order.createdAt || "-")}</td><td>${esc((order.items || []).map(item => item.name || item.productName || "Item").join(", ") || "-")}</td></tr>`).join("")}</tbody></table></div>` : "<p>No orders found.</p>"}</div>
      <div class="support-detail-section"><h3>Transactions (${transactions.length})</h3>${transactions.length ? `<div class="support-table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Amount</th><th>Reference</th><th>Status</th></tr></thead><tbody>${transactions.map(tx => `<tr><td>${esc(tx.createdAt ? new Date(tx.createdAt).toLocaleString("en-IN") : "-")}</td><td>${esc(tx.type || "-")}</td><td>${esc(tx.category || "-")}</td><td>₹${Number(tx.amount || 0)}</td><td>${esc(tx.reference || "-")}</td><td>${esc(tx.status || "-")}</td></tr>`).join("")}</tbody></table></div>` : "<p>No transactions.</p>"}</div>
      <div class="support-change-panel"><h3>Edit Complete Customer Record</h3><p>Support staff can prepare number, email, profile picture, address, city/state/PIN, transactions and order-detail changes. <strong>Live data changes only after Admin approval.</strong></p>
        <form data-support-comprehensive-form data-target-type="customer" data-target-id="${esc(customer.id || customer.mobile || customer.email || "")}">
          <input type="hidden" name="targetName" value="${esc(customer.name || customer.fullName || customer.mobile || customer.email || "")}">
          <div class="support-editor-grid">
            <label class="support-editor-field"><span>Name</span><input name="name" value="${esc(customer.name || customer.fullName || "")}"></label>
            <label class="support-editor-field"><span>Mobile / Number</span><input name="mobile" value="${esc(customer.mobile || customer.phone || "")}"></label>
            <label class="support-editor-field"><span>Email</span><input name="email" type="email" value="${esc(customer.email || "")}"></label>
            <label class="support-editor-field"><span>Status</span><select name="status"><option value="active" ${customer.status !== "blocked" ? "selected" : ""}>Active</option><option value="blocked" ${customer.status === "blocked" ? "selected" : ""}>Blocked</option></select></label>
            <label class="support-editor-field support-editor-wide"><span>Address</span><textarea name="address">${esc(customer.address || "")}</textarea></label>
            <label class="support-editor-field"><span>City</span><input name="city" value="${esc(customer.city || "")}"></label>
            <label class="support-editor-field"><span>State</span><input name="state" value="${esc(customer.state || "")}"></label>
            <label class="support-editor-field"><span>Pincode</span><input name="pincode" value="${esc(customer.pincode || "")}"></label>
            <label class="support-editor-field"><span>Profile Picture</span><input name="profilePictureFile" type="file" accept="image/*"><small>${profilePicture ? "Existing picture will be kept if no new file is selected." : "Optional image upload."}</small></label>
            <label class="support-editor-field support-editor-wide"><span>Transactions — JSON</span><textarea name="transactionsJson" spellcheck="false">${transactionsJson}</textarea></label>
            <label class="support-editor-field support-editor-wide"><span>Order Details — JSON</span><textarea name="ordersJson" spellcheck="false">${ordersJson}</textarea></label>
          </div>
          <div class="support-editor-actions"><button class="primary-btn" type="submit"><i class="fa-solid fa-paper-plane"></i> Send Complete Before / After to Admin</button></div>
        </form>
      </div>
    </div>`;
  }

  function parseDetails(text) {
    const result = {};
    String(text || "").split(/\n|,/).forEach(part => {
      const match = part.match(/^\s*([^:=]+)\s*[:=]\s*(.*?)\s*$/);
      if (match) result[match[1].trim().toLowerCase()] = match[2].trim();
    });
    return result;
  }

  async function createComprehensiveRequest(form) {
    const currentStaff = staff();
    if (!currentStaff) return;
    const targetType = String(form.dataset.targetType || "");
    const targetId = String(form.dataset.targetId || "");
    const data = new FormData(form);
    const targetName = String(data.get("targetName") || targetId);
    let beforeSnapshot;
    let afterSnapshot;
    let existing;
    if (targetType === "seller") {
      existing = sellers().find(item => String(item.id) === targetId);
      if (!existing) { toast("Seller nahi mila."); return; }
      const detail = sellerDetail(existing);
      beforeSnapshot = { profile: JSON.parse(JSON.stringify(existing)), transactions: JSON.parse(JSON.stringify(detail.transactions || [])), orders: JSON.parse(JSON.stringify(detail.orders || [])), listedProducts: JSON.parse(JSON.stringify(detail.products || [])) };
      const profile = JSON.parse(JSON.stringify(existing));
      profile.fullName = String(data.get("fullName") || "").trim();
      profile.shopName = String(data.get("shopName") || "").trim();
      profile.email = String(data.get("email") || "").trim().toLowerCase();
      profile.phone = String(data.get("phone") || "").trim();
      profile.address = String(data.get("address") || "").trim();
      profile.city = String(data.get("city") || "").trim();
      profile.state = String(data.get("state") || "").trim();
      profile.pincode = String(data.get("pincode") || "").trim();
      profile.status = String(data.get("status") || existing.status || "active");
      const file = form.querySelector('[name="profilePictureFile"]')?.files?.[0];
      if (file) {
        if (!file.type.startsWith("image/")) { toast("Profile picture mein sirf image file allowed hai."); return; }
        if (file.size > 200 * 1024) { toast("Profile picture 200 KB se chhoti honi chahiye."); return; }
        profile.profilePicture = await readFileDataURL(file);
      }
      let transactions, orders;
      try { transactions = JSON.parse(String(data.get("transactionsJson") || "[]")); if (!Array.isArray(transactions)) throw new Error("Transactions JSON array hona chahiye."); } catch(e) { toast(`Transactions JSON invalid: ${e.message}`); return; }
      try { orders = JSON.parse(String(data.get("ordersJson") || "[]")); if (!Array.isArray(orders)) throw new Error("Orders JSON array hona chahiye."); } catch(e) { toast(`Orders JSON invalid: ${e.message}`); return; }
      afterSnapshot = { profile, transactions, orders, listedProducts: JSON.parse(JSON.stringify(detail.products || [])) };
    } else if (targetType === "customer") {
      existing = customers().find(item => String(item.id) === targetId || String(item.mobile || item.phone) === targetId || String(item.email || "").toLowerCase() === targetId.toLowerCase());
      if (!existing) { toast("Customer nahi mila."); return; }
      const detail = customerDetail(existing);
      const currentTransactions = read(KEYS.transactions, []).filter(tx => String(tx.customerId || "") === String(existing.id || "") || String(tx.customerEmail || "").toLowerCase() === String(existing.email || "").toLowerCase() || String(tx.customerMobile || tx.mobile || "") === String(existing.mobile || existing.phone || ""));
      beforeSnapshot = { profile: JSON.parse(JSON.stringify(existing)), transactions: JSON.parse(JSON.stringify(currentTransactions)), orders: JSON.parse(JSON.stringify(detail.orders || [])) };
      const profile = JSON.parse(JSON.stringify(existing));
      profile.name = String(data.get("name") || "").trim();
      profile.mobile = String(data.get("mobile") || "").trim();
      profile.email = String(data.get("email") || "").trim().toLowerCase();
      profile.address = String(data.get("address") || "").trim();
      profile.city = String(data.get("city") || "").trim();
      profile.state = String(data.get("state") || "").trim();
      profile.pincode = String(data.get("pincode") || "").trim();
      profile.status = String(data.get("status") || existing.status || "active");
      const file = form.querySelector('[name="profilePictureFile"]')?.files?.[0];
      if (file) {
        if (!file.type.startsWith("image/")) { toast("Profile picture mein sirf image file allowed hai."); return; }
        if (file.size > 200 * 1024) { toast("Profile picture 200 KB se chhoti honi chahiye."); return; }
        profile.profilePicture = await readFileDataURL(file);
      }
      let transactions, orders;
      try { transactions = JSON.parse(String(data.get("transactionsJson") || "[]")); if (!Array.isArray(transactions)) throw new Error("Transactions JSON array hona chahiye."); } catch(e) { toast(`Transactions JSON invalid: ${e.message}`); return; }
      try { orders = JSON.parse(String(data.get("ordersJson") || "[]")); if (!Array.isArray(orders)) throw new Error("Orders JSON array hona chahiye."); } catch(e) { toast(`Orders JSON invalid: ${e.message}`); return; }
      afterSnapshot = { profile, transactions, orders };
    } else return;
    const request = { id: makeId("REQ"), type: `${targetType}_account_update`, targetType, targetId, targetName, changeType: `${targetType}_account_update`, details: `Complete ${targetType} record edit`, detailsMap: {}, beforeSnapshot, afterSnapshot, status: "pending", requestedBy: currentStaff.id, requestedByRole: currentStaff.role, requestedByName: currentStaff.displayName || currentStaff.username, createdAt: new Date().toISOString(), title: `Complete ${targetType} record edit · ${targetName}`, summary: `Profile + address + contact + profile picture + transactions/earnings + order details` };
    write(KEYS.requests, [request, ...read(KEYS.requests, [])]);
    logAudit(currentStaff.id, currentStaff.role, "comprehensive_change_request_created", `${targetType}:${targetId}`, { requestId: request.id });
    form.reset();
    toast("Complete Before / After request Admin ko bhej diya gaya.");
    renderSupport(currentStaff.role, "requests");
  }

  function createGenericRequest(form) {
    const currentStaff = staff();
    if (!currentStaff) return;
    const data = new FormData(form);
    const targetType = data.get("targetType") || form.dataset.targetType;
    const targetId = data.get("targetId") || form.dataset.targetId;
    const changeType = String(data.get("changeType") || "");
    const targetName = String(data.get("targetName") || "");
    let details = String(data.get("details") || "").trim();
    if (form.dataset.supportEditForm === "true" || form.hasAttribute("data-support-edit-form")) {
      const pairs = [];
      for (const [key, value] of data.entries()) {
        if (["targetType","targetId","targetName","changeType","details","orderId"].includes(key)) continue;
        if (String(value).trim()) pairs.push(`${key} = ${String(value).trim()}`);
      }
      details = pairs.join("\n");
      const hidden = form.querySelector('[name="details"]');
      if (hidden) hidden.value = details;
    }
    if (!details) {
      toast("Change details required.");
      return;
    }
    const detailsMap = parseDetails(details);
    const request = {
      id: makeId("REQ"),
      type: changeType,
      targetType,
      targetId,
      targetName,
      orderId: String(data.get("orderId") || ""),
      details,
      detailsMap,
      beforeSnapshot: null,
      afterSnapshot: null,
      status: "pending",
      requestedBy: currentStaff.id,
      requestedByRole: currentStaff.role,
      requestedByName: currentStaff.displayName || currentStaff.username,
      createdAt: new Date().toISOString(),
      title: `${roleLabel(currentStaff.role)} request · ${targetName || targetId}`,
      summary: `${changeType.replaceAll("_", " ")} for ${targetName || targetId}`
    };

    if (targetType === "seller") {
      const target = sellers().find(item => String(item.id) === String(targetId));
      if (target) {
        request.beforeSnapshot = JSON.parse(JSON.stringify(target));
        const after = JSON.parse(JSON.stringify(target));
        if (changeType === "seller_profile") {
          if (detailsMap.name || detailsMap.fullname) after.fullName = detailsMap.name || detailsMap.fullname;
          if (detailsMap.shopname) after.shopName = detailsMap.shopname;
          if (detailsMap.email) after.email = detailsMap.email.toLowerCase();
          if (detailsMap.phone || detailsMap.mobile) after.phone = detailsMap.phone || detailsMap.mobile;
          if (detailsMap.address) after.address = detailsMap.address;
        } else if (changeType === "seller_status" && detailsMap.status) {
          after.status = detailsMap.status.toLowerCase();
        }
        request.afterSnapshot = after;
      }
    } else {
      const target = customers().find(item => String(item.id) === String(targetId) || String(item.mobile || item.phone) === String(targetId) || String(item.email || "").toLowerCase() === String(targetId).toLowerCase());
      if (target) {
        request.beforeSnapshot = JSON.parse(JSON.stringify(target));
        const after = JSON.parse(JSON.stringify(target));
        if (changeType === "customer_profile") {
          if (detailsMap.name || detailsMap.fullname) after.name = detailsMap.name || detailsMap.fullname;
          if (detailsMap.mobile || detailsMap.phone) after.mobile = detailsMap.mobile || detailsMap.phone;
          if (detailsMap.email) after.email = detailsMap.email.toLowerCase();
          if (detailsMap.address) after.address = detailsMap.address;
        } else if (changeType === "customer_status" && detailsMap.status) {
          after.status = detailsMap.status.toLowerCase();
        }
        request.afterSnapshot = after;
      }
      if (changeType === "order_status" && request.orderId) {
        const order = orders().find(item => String(item.id) === String(request.orderId));
        if (order) {
          request.beforeSnapshot = JSON.parse(JSON.stringify(order));
          request.afterSnapshot = { ...JSON.parse(JSON.stringify(order)), status: String(detailsMap.status || detailsMap.orderstatus || order.status || "placed").toLowerCase() };
        }
      }
    }

    write(KEYS.requests, [request, ...read(KEYS.requests, [])]);
    logAudit(currentStaff.id, currentStaff.role, "change_request_created", `${targetType}:${targetId}`, { requestId: request.id });
    form.reset();
    toast("Request sent to Admin for approval. Admin queue updated.");
    if (typeof window.renderAdminSupportRequests === "function" && document.getElementById("adminApp") && !document.getElementById("adminApp").hidden) {
      window.renderAdminSupportRequests();
    }
  }

  function readFileDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function createProductEditRequest(form) {
    const currentStaff = staff();
    if (!currentStaff) return;
    const productId = String(form.dataset.productId || "");
    const current = products().find(item => String(item.id) === productId);
    if (!current) {
      toast("Product nahi mila.");
      return;
    }
    const data = new FormData(form);
    const seller = sellers().find(item => String(item.id) === String(current.sellerId || "") || String(item.email || "").toLowerCase() === String(current.sellerEmail || "").toLowerCase());
    const customerPrice = Number(data.get("customerPrice"));
    const autoCategory = PRICING.getCategory(customerPrice);
    const sellerPrice = Number(data.get("sellerPrice"));
    const sellerCap = PRICING.getSellerCap(customerPrice);
    const stock = Number(data.get("stock"));
    if (!String(data.get("name") || "").trim() || !String(data.get("category") || "").trim() || !String(data.get("description") || "").trim()) {
      toast("Name, category aur description required hain.");
      return;
    }
    if (!Number.isFinite(customerPrice) || customerPrice < 1) {
      toast("Valid customer selling price enter karo.");
      return;
    }
    if (!Number.isFinite(sellerPrice) || sellerPrice < 1 || (sellerCap && sellerPrice > sellerCap) || (!sellerCap && sellerPrice >= customerPrice)) {
      toast(sellerCap ? `Seller price ${autoCategory.label} category mein ₹${sellerCap} se zyada nahi ho sakta.` : "Above ₹1000 category mein seller price customer selling price se kam hona chahiye.");
      return;
    }
    if (!Number.isFinite(customerPrice) || customerPrice < sellerPrice) {
      toast("Customer price seller price se kam nahi ho sakta.");
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      toast("Valid stock enter karo.");
      return;
    }

    const existingImages = Array.isArray(current.images) && current.images.length ? current.images : (current.image ? [current.image] : []);
    const files = [0, 1, 2, 3].map(index => form.querySelector(`[name="image${index + 1}"]`)?.files?.[0] || null);
    const newImages = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      if (!file) continue;
      if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
        toast(`Image ${index + 1} ${PRODUCT_IMAGE_MAX_LABEL} se badi hai.`);
        return;
      }
      if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
        toast(`Image ${index + 1}: JPG, PNG ya WebP hi allowed hai.`);
        return;
      }
      newImages.push(await readFileDataURL(file));
    }
    const images = newImages.length ? newImages : existingImages.slice(0, PRODUCT_IMAGE_MAX_COUNT);
    if (!images.length) {
      toast("Kam se kam 1 product image hona chahiye.");
      return;
    }

    const after = {
      ...current,
      id: current.id,
      name: String(data.get("name") || "").trim(),
      category: autoCategory.id,
      pricingCategory: autoCategory.label,
      description: String(data.get("description") || "").trim(),
      sellerPrice,
      customerPrice,
      price: customerPrice,
      platformFee: Number(PRICING.getFee(customerPrice).toFixed(2)),
      stock,
      status: String(data.get("status") || current.status || "pending"),
      images,
      image: images[0],
      sellerId: current.sellerId || seller?.id || "",
      sellerEmail: current.sellerEmail || seller?.email || "",
      updatedAt: new Date().toISOString()
    };

    const request = {
      id: makeId("REQ"),
      type: "product_update",
      targetType: "seller",
      targetId: current.sellerId || seller?.id || "",
      targetName: seller?.shopName || seller?.fullName || current.sellerEmail || "Seller",
      productId: current.id,
      productName: current.name,
      changeType: "product_update",
      details: `Product ${current.id} edited by ${currentStaff.displayName || currentStaff.username}`,
      detailsMap: {},
      beforeSnapshot: JSON.parse(JSON.stringify(current)),
      afterSnapshot: JSON.parse(JSON.stringify(after)),
      status: "pending",
      requestedBy: currentStaff.id,
      requestedByRole: currentStaff.role,
      requestedByName: currentStaff.displayName || currentStaff.username,
      createdAt: new Date().toISOString(),
      title: `Product edit · ${current.name || current.id}`,
      summary: `Proposed changes for Product ID ${current.id}`
    };
    write(KEYS.requests, [request, ...read(KEYS.requests, [])]);
    logAudit(currentStaff.id, currentStaff.role, "product_edit_request_created", `product:${current.id}`, { requestId: request.id });
    form.reset();
    closeModalById("sm99SupportProductEditorModal");
    toast("Edited product Before / After review ke liye Admin ko bhej diya gaya.");
    renderSupport(currentStaff.role, "requests");
  }

  function openProductEditor(productId) {
    const product = products().find(item => String(item.id) === String(productId));
    if (!product) {
      toast("Product nahi mila.");
      return;
    }
    const seller = sellers().find(item => String(item.id) === String(product.sellerId || "") || String(item.email || "").toLowerCase() === String(product.sellerEmail || "").toLowerCase());
    const modal = document.createElement("div");
    modal.id = "sm99SupportProductEditorModal";
    const images = Array.isArray(product.images) && product.images.length ? product.images : (product.image ? [product.image] : []);
    modal.innerHTML = `<div class="support-modal-backdrop"><div class="support-editor-modal support-product-editor-modal"><div class="support-editor-header"><div><span class="seller-kicker">STAFF PRODUCT EDIT</span><h2>Edit Product</h2><p>Product ID: <strong>${esc(product.id)}</strong> · Seller: ${esc(seller?.shopName || seller?.fullName || product.sellerEmail || "-")}</p></div><button type="button" class="support-modal-close" data-close-support-modal>×</button></div><form id="supportProductEditForm" data-product-id="${esc(product.id)}"><div class="support-editor-grid"><label class="support-editor-field"><span>Product ID</span><input value="${esc(product.id)}" disabled></label><label class="support-editor-field"><span>Product Name</span><input name="name" required value="${esc(product.name || "")}"></label><label class="support-editor-field"><span>Pricing Category</span><select name="category" required>${pricingOptions(product.category || "")}</select></label><label class="support-editor-field"><span>Seller Price</span><input name="sellerPrice" type="number" min="1" step="0.01" required value="${Number(product.sellerPrice || 0)}"></label><label class="support-editor-field"><span>Customer Price</span><input name="customerPrice" type="number" min="1" required value="${Number(product.customerPrice || product.price || 99)}"></label><label class="support-editor-field"><span>Stock</span><input name="stock" type="number" min="0" required value="${Number(product.stock || 0)}"></label><label class="support-editor-field"><span>Status</span><select name="status"><option value="pending" ${String(product.status).toLowerCase().includes("pending") ? "selected" : ""}>Pending</option><option value="approved" ${String(product.status).toLowerCase().includes("approved") ? "selected" : ""}>Approved</option><option value="rejected" ${String(product.status).toLowerCase().includes("rejected") ? "selected" : ""}>Rejected</option></select></label><label class="support-editor-field support-editor-wide"><span>Description</span><textarea name="description" required>${esc(product.description || "")}</textarea></label></div><div class="support-image-upload-panel"><div><strong>Product Images</strong><span>JPG, PNG or WebP · maximum ${PRODUCT_IMAGE_MAX_LABEL} per image · maximum ${PRODUCT_IMAGE_MAX_COUNT} images</span></div><div class="support-image-slots">${[0,1,2,3].map(index => `<label class="support-image-slot"><span>Image ${index + 1}</span><input name="image${index + 1}" type="file" accept="image/jpeg,image/png,image/webp"><small>${images[index] ? "Existing image will be kept unless replaced." : "Optional"}</small></label>`).join("")}</div></div><div class="support-editor-actions"><button type="button" class="secondary-btn" data-close-support-modal>Cancel</button><button type="submit" class="primary-btn">Done — Send Before / After to Admin</button></div></form></div></div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll("[data-close-support-modal]").forEach(button => button.addEventListener("click", () => closeModalById(modal.id)));
    modal.querySelector("#supportProductEditForm").addEventListener("submit", event => {
      event.preventDefault();
      createProductEditRequest(event.currentTarget);
    });
  }

  function snapshotTable(snapshot, empty = "No snapshot available.") {
    if (snapshot == null) return `<div class="support-empty">${empty}</div>`;
    const rows = [];
    const walk = (value, path) => {
      if (value === null || value === undefined || typeof value !== "object") { rows.push([path || "Value", value]); return; }
      if (Array.isArray(value)) { rows.push([path || "List", JSON.stringify(value, null, 2)]); return; }
      const entries = Object.entries(value);
      if (!entries.length) { rows.push([path || "Object", "{}"]); return; }
      entries.forEach(([key, child]) => walk(child, path ? `${path}.${key}` : key));
    };
    walk(snapshot, "");
    return `<div class="support-snapshot-grid">${rows.map(([label, value]) => `<div><b>${esc(label)}</b><span>${esc(typeof value === "string" ? value : JSON.stringify(value))}</span></div>`).join("")}</div>`;
  }

  function renderRequestReview(request) {
    const before = request.beforeSnapshot || null;
    const after = request.afterSnapshot || null;
    const isProduct = request.changeType === "product_update" && after;
    return `<div class="support-review-modal"><div class="support-review-header"><div><span class="seller-kicker">ADMIN REQUEST REVIEW</span><h2>${esc(request.title)}</h2><p>Requested by ${esc(request.requestedByName || request.requestedBy)} · Request ID ${esc(request.id)}</p></div><button type="button" class="support-modal-close" data-close-review>×</button></div><div class="support-review-tabs"><button type="button" class="active" data-review-tab="before">Before Edit</button><button type="button" data-review-tab="after">After Edit</button></div><div class="support-review-pane active" data-review-pane="before">${snapshotTable(before, "This request has no saved before snapshot. The original record will be shown from the current database where available.")}</div><div class="support-review-pane" data-review-pane="after" hidden>${snapshotTable(after || request.detailsMap || null, "Proposed change details are shown in the Admin editor.")}</div><div class="support-review-actions"><button type="button" class="secondary-btn danger" data-review-reject>Reject Request</button><button type="button" class="secondary-btn" data-review-edit>Edit Proposed Change</button><button type="button" class="primary-btn" data-review-apply>Accept & Apply</button></div></div>`;
  }

  function openRequestReviewModal(requestId) {
    if (!isAdmin()) return;
    const request = read(KEYS.requests, []).find(item => String(item.id) === String(requestId));
    if (!request) return;
    const old = document.getElementById("sm99SupportRequestReviewModal");
    old?.remove();
    const modal = document.createElement("div");
    modal.id = "sm99SupportRequestReviewModal";
    modal.className = "support-review-overlay";
    modal.innerHTML = renderRequestReview(request);
    document.body.appendChild(modal);
    modal.querySelector("[data-close-review]")?.addEventListener("click", () => modal.remove());
    modal.querySelectorAll("[data-review-tab]").forEach(button => button.addEventListener("click", () => {
      modal.querySelectorAll("[data-review-tab]").forEach(tab => tab.classList.toggle("active", tab === button));
      modal.querySelectorAll("[data-review-pane]").forEach(pane => pane.hidden = pane.dataset.reviewPane !== button.dataset.reviewTab);
    }));
    modal.querySelector("[data-review-edit]")?.addEventListener("click", () => {
      modal.remove();
      openAdminRequestEditor(request.id);
    });
    modal.querySelector("[data-review-reject]")?.addEventListener("click", () => rejectRequest(request.id));
    modal.querySelector("[data-review-apply]")?.addEventListener("click", () => openAdminRequestEditor(request.id));
  }

  function applyProductSnapshot(snapshot) {
    const list = products();
    const index = list.findIndex(item => String(item.id) === String(snapshot.id));
    if (index < 0) throw new Error("Product not found");
    const current = list[index];
    list[index] = { ...current, ...JSON.parse(JSON.stringify(snapshot)), id: current.id, updatedAt: new Date().toISOString() };
    write(KEYS.products, list);
    const sellerProducts = read("shopmax99SellerProducts", []);
    if (Array.isArray(sellerProducts)) {
      const sellerIndex = sellerProducts.findIndex(item => String(item.id) === String(snapshot.id));
      if (sellerIndex >= 0) sellerProducts[sellerIndex] = { ...sellerProducts[sellerIndex], ...JSON.parse(JSON.stringify(snapshot)) };
      write("shopmax99SellerProducts", sellerProducts);
    }
  }

  function applyComprehensiveRequest(request) {
    const snap = request.afterSnapshot || {};
    const profile = snap.profile || {};
    if (request.targetType === "seller") {
      const list = sellers();
      const index = list.findIndex(item => String(item.id) === String(request.targetId));
      if (index < 0) throw new Error("Seller not found");
      list[index] = { ...list[index], ...JSON.parse(JSON.stringify(profile)), id: list[index].id, updatedAt: new Date().toISOString() };
      write(KEYS.sellers, list);
      const currentTx = read(KEYS.transactions, []);
      const wanted = new Set((snap.transactions || []).map(item => String(item.id || "")));
      const targetOld = currentTx.filter(tx => String(tx.sellerId || "") === String(request.targetId) || String(tx.sellerEmail || "").toLowerCase() === String(list[index].email || "").toLowerCase());
      const untouched = currentTx.filter(tx => !targetOld.some(old => String(old.id || "") === String(tx.id || "")));
      write(KEYS.transactions, [...(snap.transactions || []), ...untouched.filter(tx => !wanted.has(String(tx.id || "")))]);
      const orderList = orders();
      const afterOrders = Array.isArray(snap.orders) ? snap.orders : [];
      const afterIds = new Set(afterOrders.map(o => String(o.id || "")));
      const ownedOrderIds = new Set(orderList.filter(order => (order.items || []).some(item => String(item.sellerId || "") === String(request.targetId) || String(item.sellerEmail || "").toLowerCase() === String(profile.email || "").toLowerCase())).map(o => String(o.id || "")));
      const mergedOrders = orderList.filter(o => !ownedOrderIds.has(String(o.id || ""))).concat(afterOrders);
      write(KEYS.orders, mergedOrders);
      return;
    }
    const list = customers();
    const existing = list.find(item => String(item.id) === String(request.targetId) || String(item.mobile || item.phone) === String(request.targetId) || String(item.email || "").toLowerCase() === String(request.targetId || "").toLowerCase());
    if (!existing) throw new Error("Customer not found");
    const mergedProfile = { ...existing, ...JSON.parse(JSON.stringify(profile)), id: existing.id, updatedAt: new Date().toISOString() };
    if (existing.source === "customer_account") write(KEYS.customer, mergedProfile);
    else {
      const users = read(KEYS.users, []); const i = users.findIndex(item => String(item.id) === String(existing.id));
      if (i >= 0) { users[i] = { ...users[i], ...mergedProfile }; write(KEYS.users, users); }
    }
    const currentTx = read(KEYS.transactions, []);
    const targetOld = currentTx.filter(tx => String(tx.customerId || "") === String(existing.id || "") || String(tx.customerEmail || "").toLowerCase() === String(existing.email || "").toLowerCase() || String(tx.customerMobile || tx.mobile || "") === String(existing.mobile || existing.phone || ""));
    const afterTx = Array.isArray(snap.transactions) ? snap.transactions : [];
    const mergedTx = currentTx.filter(tx => !targetOld.some(old => String(old.id || "") === String(tx.id || ""))).concat(afterTx);
    write(KEYS.transactions, mergedTx);
    const orderList = orders();
    const oldIds = new Set(orderList.filter(order => String(order.customerId || "") === String(existing.id || "") || String(order.customerMobile || order.mobile || order.deliveryDetails?.phone || "") === String(existing.mobile || existing.phone || "") || String(order.customerEmail || "").toLowerCase() === String(existing.email || "").toLowerCase()).map(o => String(o.id || "")));
    const afterOrders = Array.isArray(snap.orders) ? snap.orders : [];
    write(KEYS.orders, orderList.filter(o => !oldIds.has(String(o.id || ""))).concat(afterOrders));
  }

  function applyGenericRequest(request, map) {
    const normalized = key => String(key || "").toLowerCase().replace(/\s+/g, "");
    const details = map || request.detailsMap || parseDetails(request.details);
    if (request.targetType === "seller") {
      const list = sellers();
      const seller = list.find(item => String(item.id) === String(request.targetId));
      if (!seller) throw new Error("Seller not found");
      if (request.changeType === "seller_profile") {
        if (details.name || details.fullname) seller.fullName = details.name || details.fullname;
        if (details.shopname) seller.shopName = details.shopname;
        if (details.email) seller.email = details.email.toLowerCase();
        if (details.phone || details.mobile) seller.phone = details.phone || details.mobile;
        if (details.address) seller.address = details.address;
      } else if (request.changeType === "seller_status") {
        const status = String(details.status || "").toLowerCase();
        if (!["approved", "active", "blocked", "rejected", "pending"].includes(status)) throw new Error("Invalid seller status");
        seller.status = status;
      }
      write(KEYS.sellers, list);
      return;
    }

    const list = customers();
    const customer = list.find(item => String(item.id) === String(request.targetId) || String(item.mobile || item.phone) === String(request.targetId) || String(item.email || "").toLowerCase() === String(request.targetId || "").toLowerCase());
    if (!customer) throw new Error("Customer not found");
    if (request.changeType === "customer_profile") {
      if (details.name || details.fullname) customer.name = details.name || details.fullname;
      if (details.mobile || details.phone) customer.mobile = details.mobile || details.phone;
      if (details.email) customer.email = details.email.toLowerCase();
      if (details.address) customer.address = details.address;
      if (customer.source === "customer_account") write(KEYS.customer, customer);
      else {
        const users = read(KEYS.users, []);
        const index = users.findIndex(item => String(item.id) === String(customer.id));
        if (index >= 0) { users[index] = { ...users[index], ...customer }; write(KEYS.users, users); }
      }
    } else if (request.changeType === "customer_status") {
      const status = String(details.status || "").toLowerCase();
      if (!["active", "blocked"].includes(status)) throw new Error("Invalid customer status");
      customer.status = status;
      if (customer.source === "customer_account") write(KEYS.customer, customer);
      else {
        const users = read(KEYS.users, []);
        const index = users.findIndex(item => String(item.id) === String(customer.id));
        if (index >= 0) { users[index] = { ...users[index], status }; write(KEYS.users, users); }
      }
    } else {
      const orderList = orders();
      const order = orderList.find(item => String(item.id) === String(request.orderId));
      if (!order) throw new Error("Order not found");
      const status = normalized(details.status || details.orderstatus);
      if (!["pending", "confirmed", "packed", "shipped", "delivered", "cancelled", "returned", "refunded", "placed"].includes(status)) throw new Error("Invalid order status");
      order.status = status;
      order.updatedAt = new Date().toISOString();
      write(KEYS.orders, orderList);
    }
  }

  function rejectRequest(requestId) {
    if (!isAdmin()) return;
    const list = read(KEYS.requests, []);
    const request = list.find(item => String(item.id) === String(requestId));
    if (!request || ["completed", "deleted", "reverted"].includes(request.status)) return;
    const reason = window.prompt("Reject reason staff ko bhejna hai. Reason likhiye:", request.adminNote || "") || "";
    if (!String(reason).trim()) { toast("Reject reason required hai."); return; }
    request.status = "rejected";
    request.adminNote = String(reason).trim();
    request.rejectionReason = String(reason).trim();
    request.reviewedAt = new Date().toISOString();
    request.reviewedBy = read("shopmax99_admin_session", {}).email || "admin";
    write(KEYS.requests, list);
    logAudit(request.reviewedBy, "admin", "change_request_rejected", `${request.targetType}:${request.targetId}`, { requestId });
    document.getElementById("sm99SupportRequestReviewModal")?.remove();
    if (typeof window.showAdminSection === "function") window.showAdminSection("support-requests");
    else renderAdminSupportRequests();
    toast("Support request rejected. No change was applied.");
  }

  function openAdminRequestEditor(requestId) {
    if (!isAdmin()) return;
    const list = read(KEYS.requests, []);
    const request = list.find(item => String(item.id) === String(requestId));
    if (!request || !["accepted", "pending"].includes(request.status)) return;
    const proposed = request.afterSnapshot ? JSON.parse(JSON.stringify(request.afterSnapshot)) : null;
    const map = request.detailsMap || parseDetails(request.details);
    const modal = document.createElement("div");
    modal.id = "sm99SupportAdminEditorModal";
    let fields = "";
    if (request.changeType === "product_update" && proposed) {
      fields = `<label class="support-editor-field"><span>Product ID</span><input value="${esc(proposed.id)}" disabled></label><label class="support-editor-field"><span>Product Name</span><input name="name" value="${esc(proposed.name || "")}" required></label><label class="support-editor-field"><span>Pricing Category</span><select name="category" required>${pricingOptions(proposed.category || "")}</select></label><label class="support-editor-field"><span>Seller Price</span><input name="sellerPrice" type="number" min="1" step="0.01" value="${Number(proposed.sellerPrice || 0)}" required></label><label class="support-editor-field"><span>Customer Price</span><input name="customerPrice" type="number" min="1" value="${Number(proposed.customerPrice || proposed.price || 99)}" required></label><label class="support-editor-field"><span>Stock</span><input name="stock" type="number" min="0" value="${Number(proposed.stock || 0)}" required></label><label class="support-editor-field"><span>Status</span><select name="status"><option value="pending" ${String(proposed.status).toLowerCase().includes("pending") ? "selected" : ""}>Pending</option><option value="approved" ${String(proposed.status).toLowerCase().includes("approved") ? "selected" : ""}>Approved</option><option value="rejected" ${String(proposed.status).toLowerCase().includes("rejected") ? "selected" : ""}>Rejected</option></select></label><label class="support-editor-field support-editor-wide"><span>Description</span><textarea name="description" required>${esc(proposed.description || "")}</textarea></label>`;
    } else if (request.targetType === "seller") {
      fields = request.changeType === "seller_profile"
        ? `<label class="support-editor-field"><span>Full Name</span><input name="fullname" value="${esc(map.fullname || map.name || "")}"></label><label class="support-editor-field"><span>Shop Name</span><input name="shopname" value="${esc(map.shopname || "")}"></label><label class="support-editor-field"><span>Email</span><input name="email" value="${esc(map.email || "")}"></label><label class="support-editor-field"><span>Phone</span><input name="phone" value="${esc(map.phone || map.mobile || "")}"></label><label class="support-editor-field support-editor-wide"><span>Address</span><textarea name="address">${esc(map.address || "")}</textarea></label>`
        : `<label class="support-editor-field"><span>Status</span><select name="status"><option>pending</option><option>approved</option><option>active</option><option>blocked</option><option>rejected</option></select></label>`;
    } else if (request.changeType === "customer_profile") {
      fields = `<label class="support-editor-field"><span>Name</span><input name="name" value="${esc(map.name || map.fullname || "")}"></label><label class="support-editor-field"><span>Mobile</span><input name="mobile" value="${esc(map.mobile || map.phone || "")}"></label><label class="support-editor-field"><span>Email</span><input name="email" value="${esc(map.email || "")}"></label><label class="support-editor-field support-editor-wide"><span>Address</span><textarea name="address">${esc(map.address || "")}</textarea></label>`;
    } else if (request.changeType === "seller_account_update" || request.changeType === "customer_account_update") {
      fields = `<label class="support-editor-field support-editor-wide"><span>Profile / Account After Edit — JSON</span><textarea name="profileJson" spellcheck="false" required>${esc(JSON.stringify(proposed?.profile || {}, null, 2))}</textarea></label><label class="support-editor-field support-editor-wide"><span>Transactions / Earnings After Edit — JSON</span><textarea name="transactionsJson" spellcheck="false" required>${esc(JSON.stringify(proposed?.transactions || [], null, 2))}</textarea></label><label class="support-editor-field support-editor-wide"><span>Order Details After Edit — JSON</span><textarea name="ordersJson" spellcheck="false" required>${esc(JSON.stringify(proposed?.orders || [], null, 2))}</textarea></label>`;
    } else {
      fields = `<label class="support-editor-field"><span>Status</span><select name="status"><option>placed</option><option>pending</option><option>confirmed</option><option>packed</option><option>shipped</option><option>delivered</option><option>cancelled</option><option>returned</option><option>refunded</option></select></label>`;
    }
    const before = request.beforeSnapshot || null;
    modal.innerHTML = `<div class="support-modal-backdrop"><div class="support-editor-modal"><div class="support-editor-header"><div><span class="seller-kicker">ADMIN FINAL REVIEW</span><h2>${esc(request.title)}</h2><p>Before Edit aur After Edit compare karke final decision lo.</p></div><button type="button" class="support-modal-close" data-close-admin-editor>×</button></div><div class="support-review-tabs"><button type="button" class="active" data-admin-snapshot-tab="before">Before Edit</button><button type="button" data-admin-snapshot-tab="after">After Edit</button></div><div class="support-snapshot-panel active" data-admin-snapshot-pane="before">${snapshotTable(before, "No before snapshot stored for this request.")}</div><div class="support-snapshot-panel" data-admin-snapshot-pane="after" hidden>${snapshotTable(proposed || map, "No after snapshot stored.")}</div><form id="sm99SupportAdminEditorForm"><div class="support-editor-grid">${fields}</div><div class="support-editor-actions"><button type="button" class="secondary-btn danger" data-admin-editor-reject>Reject Request</button><button type="button" class="secondary-btn" data-close-admin-editor>Cancel</button><button type="submit" class="primary-btn">Accept & Apply Changes</button></div></form></div></div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll("[data-close-admin-editor]").forEach(button => button.addEventListener("click", () => modal.remove()));
    modal.querySelector("[data-admin-editor-reject]")?.addEventListener("click", () => rejectRequest(request.id));
    modal.querySelectorAll("[data-admin-snapshot-tab]").forEach(button => button.addEventListener("click", () => {
      modal.querySelectorAll("[data-admin-snapshot-tab]").forEach(tab => tab.classList.toggle("active", tab === button));
      modal.querySelectorAll("[data-admin-snapshot-pane]").forEach(pane => pane.hidden = pane.dataset.adminSnapshotPane !== button.dataset.adminSnapshotTab);
    }));
    modal.querySelector("#sm99SupportAdminEditorForm").addEventListener("submit", event => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      try {
        if (request.changeType === "seller_account_update" || request.changeType === "customer_account_update") {
          let profile, transactions, ordersAfter;
          try { profile = JSON.parse(String(data.get("profileJson") || "{}")); } catch(e) { throw new Error("Profile JSON invalid."); }
          try { transactions = JSON.parse(String(data.get("transactionsJson") || "[]")); } catch(e) { throw new Error("Transactions JSON invalid."); }
          try { ordersAfter = JSON.parse(String(data.get("ordersJson") || "[]")); } catch(e) { throw new Error("Order JSON invalid."); }
          if (!profile || typeof profile !== "object" || Array.isArray(profile)) throw new Error("Profile JSON object hona chahiye.");
          if (!Array.isArray(transactions) || !Array.isArray(ordersAfter)) throw new Error("Transactions aur Orders JSON arrays hone chahiye.");
          request.afterSnapshot = { profile, transactions, orders: ordersAfter, ...(request.targetType === "seller" ? { listedProducts: request.afterSnapshot?.listedProducts || [] } : {}) };
          applyComprehensiveRequest(request);
        } else if (request.changeType === "product_update") {
          const next = { ...proposed };
          next.name = String(data.get("name") || "").trim();
          next.category = String(data.get("category") || "").trim();
          next.description = String(data.get("description") || "").trim();
          next.sellerPrice = Number(data.get("sellerPrice"));
          next.customerPrice = Number(data.get("customerPrice"));
          next.price = next.customerPrice;
          next.stock = Number(data.get("stock"));
          next.status = String(data.get("status") || "pending");
          if (!next.name || !next.category || !next.description) throw new Error("Name, category aur description required hain.");
          if (!Number.isFinite(next.customerPrice) || next.customerPrice < 1) throw new Error("Valid customer selling price required.");
          const adminCategory = PRICING.getCategory(next.customerPrice);
          const adminCap = PRICING.getSellerCap(next.customerPrice);
          if (!Number.isFinite(next.sellerPrice) || next.sellerPrice < 1 || (adminCap && next.sellerPrice > adminCap) || (!adminCap && next.sellerPrice >= next.customerPrice)) throw new Error(adminCap ? `Seller price ${adminCategory.label} category mein ₹${adminCap} se zyada nahi ho sakta.` : "Above ₹1000 category mein seller price customer selling price se kam hona chahiye.");
          next.category = adminCategory.id;
          next.pricingCategory = adminCategory.label;
          next.platformFee = Number(PRICING.getFee(next.customerPrice).toFixed(2));
          if (!Number.isInteger(next.stock) || next.stock < 0) throw new Error("Invalid stock.");
          request.afterSnapshot = next;
          applyProductSnapshot(next);
        } else {
          const next = {};
          for (const [key, value] of data.entries()) next[key] = String(value).trim();
          request.detailsMap = next;
          applyGenericRequest(request, next);
        }
        request.status = "completed";
        request.adminNote = "Accepted by Admin after Before/After review.";
        request.reviewedAt = new Date().toISOString();
        request.reviewedBy = read("shopmax99_admin_session", {}).email || "admin";
        write(KEYS.requests, list);
        logAudit(request.reviewedBy, "admin", "change_request_completed", `${request.targetType}:${request.targetId}`, { requestId: request.id });
        modal.remove();
        if (typeof window.showAdminSection === "function") window.showAdminSection("support-requests");
        else renderAdminSupportRequests();
        toast("Request accepted and changes applied successfully.");
      } catch (error) {
        toast(`Change apply nahi hua: ${error.message || "Unknown error"}`);
      }
    });
  }

  function requestAdminSection(request) {
    if (request.changeType === "product_update") return "product-edit";
    if (request.targetType === "seller") return "all-sellers";
    if (request.changeType === "order_status") return "orders";
    return "customers";
  }

  function acceptRequest(requestId) {
    if (!isAdmin()) return;
    const list = read(KEYS.requests, []);
    const request = list.find(item => String(item.id) === String(requestId));
    if (!request || request.status !== "pending") return;
    request.status = "accepted";
    request.acceptedAt = new Date().toISOString();
    request.acceptedBy = read("shopmax99_admin_session", {}).email || "admin";
    write(KEYS.requests, list);
    logAudit(request.acceptedBy, "admin", "change_request_accepted_for_review", `${request.targetType}:${request.targetId}`, { requestId });
    if (typeof window.showAdminSection === "function") window.showAdminSection(requestAdminSection(request));
    setTimeout(() => openAdminRequestEditor(request.id), 80);
  }

  function deleteRequests(ids) {
    if (!isAdmin()) return;
    const selected = new Set(ids.map(String));
    if (!selected.size) return;
    if (!confirm(`Selected ${selected.size} request(s) permanently delete karna hai?`)) return;
    const current = read(KEYS.requests, []);
    const removed = current.filter(item => selected.has(String(item.id)));
    write(KEYS.requests, current.filter(item => !selected.has(String(item.id))));
    const admin = read("shopmax99_admin_session", {}).email || "admin";
    removed.forEach(item => logAudit(admin, "admin", "support_request_deleted", `${item.targetType}:${item.targetId}`, { requestId: item.id }));
    renderAdminSupportRequests();
    toast(`${removed.length} request(s) permanently deleted.`);
  }

  function filterRequests(list, filters) {
    const q = String(filters.query || "").trim().toLowerCase();
    return list.filter(request => {
      const matchesQuery = !q || [request.id, request.title, request.summary, request.details, request.requestedBy, request.requestedByName, request.targetId, request.productId, request.targetName]
        .some(value => String(value || "").toLowerCase().includes(q));
      const matchesStatus = filters.status === "all" || request.status === filters.status;
      const matchesType = filters.type === "all" || request.changeType === filters.type || request.type === filters.type;
      const matchesRole = filters.role === "all" || request.requestedByRole === filters.role;
      return matchesQuery && matchesStatus && matchesType && matchesRole;
    });
  }

  function requestCardAdmin(request) {
    const hasSnapshot = !!(request.beforeSnapshot || request.afterSnapshot);
    const actionButtons = request.status === "pending"
      ? `<button type="button" class="primary-btn small" data-support-admin-action="open-request-editor" data-id="${esc(request.id)}">Review Before / After</button><button type="button" class="secondary-btn danger" data-support-admin-action="reject-request" data-id="${esc(request.id)}">Reject</button>`
      : request.status === "accepted"
        ? `<button type="button" class="primary-btn small" data-support-admin-action="open-request-editor" data-id="${esc(request.id)}">Review Before / After</button><button type="button" class="secondary-btn danger" data-support-admin-action="reject-request" data-id="${esc(request.id)}">Reject</button>`
        : request.status === "completed"
          ? `<button type="button" class="secondary-btn" data-support-admin-action="view-request" data-id="${esc(request.id)}">View Before / After</button>`
          : `<button type="button" class="secondary-btn" data-support-admin-action="view-request" data-id="${esc(request.id)}">View Request</button>`;
    return `<article class="support-request-card admin" data-request-id="${esc(request.id)}"><div class="support-request-title-row"><label class="support-request-select"><input type="checkbox" data-request-select="${esc(request.id)}"><span></span></label><div><strong>${esc(request.title)}</strong><span class="support-status ${esc(request.status)}">${esc(request.status)}</span></div></div><p>${esc(request.summary || "")}</p><div class="support-request-meta"><span>Requested by: ${esc(request.requestedByName || request.requestedBy)}</span><span>Role: ${esc(roleLabel(request.requestedByRole || ""))}</span><span>Target: ${esc(request.targetType)} / ${esc(request.targetId)}</span><span>Product ID: ${esc(request.productId || request.afterSnapshot?.id || "-")}</span><span>Created: ${esc(request.createdAt ? new Date(request.createdAt).toLocaleString("en-IN") : "-")}</span></div>${hasSnapshot ? `<div class="support-request-preview"><button type="button" class="request-preview-tab active" data-inline-request-tab="before" data-request-id="${esc(request.id)}">Before Edit</button><button type="button" class="request-preview-tab" data-inline-request-tab="after" data-request-id="${esc(request.id)}">After Edit</button><div class="request-preview-pane" data-inline-request-pane="before" data-request-id="${esc(request.id)}">${snapshotTable(request.beforeSnapshot, "No before snapshot")}</div><div class="request-preview-pane" data-inline-request-pane="after" data-request-id="${esc(request.id)}" hidden>${snapshotTable(request.afterSnapshot || request.detailsMap, "No after snapshot")}</div></div>` : `<div class="support-request-detail-line">Details: ${esc(request.details || "-")}</div>`}<div class="support-row-actions">${actionButtons}<button type="button" class="secondary-btn danger" data-support-admin-action="delete-request" data-id="${esc(request.id)}">Delete</button></div>${request.adminNote ? `<small class="support-admin-note"><strong>Admin note:</strong> ${esc(request.adminNote)}</small>` : ""}</article>`;
  }

  function renderAdminSupportRequests() {
    const box = document.querySelector('[data-admin-section="support-requests"]');
    if (!box) return;
    const controls = `<div class="support-request-controls"><input id="supportRequestSearch" placeholder="Search Request ID / Product ID / staff / seller / customer / details"><select id="supportRequestStatus"><option value="all">All Status</option><option value="pending">Pending</option><option value="accepted">Accepted</option><option value="completed">Completed</option><option value="rejected">Rejected</option><option value="reverted">Reverted</option></select><select id="supportRequestType"><option value="all">All Types</option><option value="product_update">Product Update</option><option value="seller_profile">Seller Profile</option><option value="seller_account_update">Seller Complete Record</option><option value="seller_status">Seller Status</option><option value="customer_profile">Customer Profile</option><option value="customer_account_update">Customer Complete Record</option><option value="customer_status">Customer Status</option><option value="order_status">Order Status</option></select><select id="supportRequestRole"><option value="all">All Staff Roles</option><option value="seller_support">Seller Support</option><option value="customer_support">Customer Support</option></select><button type="button" class="secondary-btn" id="supportRequestClearFilters">Clear</button></div><div class="support-request-bulkbar"><label><input type="checkbox" id="supportRequestSelectAll"> Select all visible</label><button type="button" class="secondary-btn danger" id="supportRequestDeleteSelected">Delete Selected Permanently</button></div><div id="supportRequestResults" class="support-request-list"></div>`;
    box.innerHTML = `<div class="support-admin-page"><div class="support-page-header"><div><span class="seller-kicker">APPROVAL QUEUE</span><h1>Support Change Requests</h1><p>Support staff edits are held as drafts. Review Before Edit and After Edit, then Accept & Apply or Reject. Approved changes update the live record automatically.</p></div></div>${controls}</div>`;

    const render = () => {
      const all = read(KEYS.requests, []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const filtered = filterRequests(all, { query: $("#supportRequestSearch")?.value, status: $("#supportRequestStatus")?.value || "all", type: $("#supportRequestType")?.value || "all", role: $("#supportRequestRole")?.value || "all" });
      $("#supportRequestResults").innerHTML = filtered.length ? filtered.map(requestCardAdmin).join("") : `<div class="support-empty">No requests match the selected filters.</div>`;
      $("#supportRequestResults").dataset.count = String(filtered.length);
    };
    ["supportRequestSearch", "supportRequestStatus", "supportRequestType", "supportRequestRole"].forEach(id => $("#" + id)?.addEventListener(id === "supportRequestSearch" ? "input" : "change", render));
    $("#supportRequestClearFilters")?.addEventListener("click", () => {
      $("#supportRequestSearch").value = "";
      $("#supportRequestStatus").value = "all";
      $("#supportRequestType").value = "all";
      $("#supportRequestRole").value = "all";
      render();
    });
    $("#supportRequestSelectAll")?.addEventListener("change", event => {
      $$("[data-request-select]", $("#supportRequestResults")).forEach(input => { input.checked = event.target.checked; });
    });
    $("#supportRequestDeleteSelected")?.addEventListener("click", () => {
      const ids = $$("[data-request-select]:checked", $("#supportRequestResults")).map(input => input.dataset.requestSelect);
      deleteRequests(ids);
    });
    render();
  }

  window.addEventListener("storage", event => {
    if (event.key !== KEYS.requests) return;
    const section = document.querySelector('[data-admin-section="support-requests"]');
    if (section && section.classList.contains("active") && typeof window.renderAdminSupportRequests === "function") window.renderAdminSupportRequests();
    const session = getSession();
    if (session?.role && document.getElementById(session.role === "seller_support" ? "sellerSupportApp" : "customerSupportApp") && !document.getElementById(session.role === "seller_support" ? "sellerSupportApp" : "customerSupportApp").hidden) {
      renderSupport(session.role, "requests");
      const latest = read(KEYS.requests, []).find(item => item.requestedBy === session.staffId && item.status === "rejected" && item.rejectionReason);
      if (latest && latest.id !== session.lastRejectedRequestId) {
        session.lastRejectedRequestId = latest.id;
        write(KEYS.session, session);
        toast(`Admin ne request reject kiya: ${latest.rejectionReason}`);
      }
    }
  });

  function renderAdminSupportStaff() {
    const box = document.querySelector('[data-admin-section="support-staff"]');
    if (!box) return;
    const list = read(KEYS.staff, []);
    box.innerHTML = `<div class="support-admin-page"><div class="support-page-header"><div><span class="seller-kicker">MASTER ACCESS</span><h1>Support Staff</h1><p>Only Admin can create, block or unblock support credentials.</p></div></div><div class="support-admin-grid"><form id="supportStaffCreateForm" class="support-admin-card"><h3>Create Support Login</h3><label>Display Name<input name="displayName" required placeholder="Staff name"></label><label>Username<input name="username" required minlength="4" placeholder="seller.support01"></label><label>Password<input name="password" type="password" required minlength="6" placeholder="Create password"></label><label>Support Type<select name="role"><option value="seller_support">Seller Support</option><option value="customer_support">Customer Support</option></select></label><button class="primary-btn" type="submit">Create Support ID</button><small>Credentials are created only by Admin and can be blocked anytime.</small></form><div class="support-admin-card"><h3>Support Accounts (${list.length})</h3>${list.length ? list.map(item => `<div class="support-staff-row"><div><strong>${esc(item.displayName || item.username)}</strong><span>${esc(item.username)} · ${esc(roleLabel(item.role))}</span></div><span class="support-status ${item.status === "blocked" ? "rejected" : "approved"}">${esc(item.status || "active")}</span><div class="support-row-actions">${item.status === "blocked" ? `<button type="button" class="secondary-btn" data-support-admin-action="unblock-staff" data-id="${esc(item.id)}">Unblock</button>` : `<button type="button" class="secondary-btn danger" data-support-admin-action="block-staff" data-id="${esc(item.id)}">Block</button>`}</div></div>`).join("") : "<div class='support-empty'>No support IDs created.</div>"}</div></div></div>`;
  }

  function staffDirectory() {
    const support = read(KEYS.staff, []).map(item => ({ ...item, category: item.role === "seller_support" ? "Seller Support Staff" : "Customer Support Staff", id: item.id, name: item.displayName || item.username, username: item.username, type: "support" }));
    const seller = sellers().map(item => ({ ...item, category: "Sellers", id: item.id, name: item.shopName || item.fullName || item.email, username: item.email, type: "seller" }));
    const courierRaw = read(KEYS.courier, []);
    const courier = Array.isArray(courierRaw) ? courierRaw.map(item => ({ ...item, category: "Courier Partners", id: item.id || item.partnerId || makeId("COU"), name: item.name || item.company || item.fullName || item.email, username: item.username || item.email || item.phone || "", type: "courier" })) : [];
    return [...support, ...seller, ...courier];
  }

  function renderPayToStaff() {
    const box = document.querySelector('[data-admin-section="pay-to-staff"]');
    if (!box) return;
    const directory = staffDirectory();
    const categories = ["Seller Support Staff", "Customer Support Staff", "Sellers", "Courier Partners"];
    box.innerHTML = `<div class="support-admin-page"><div class="support-page-header"><div><span class="seller-kicker">PAYMENTS</span><h1>Pay to Staff</h1><p>Category-wise directory with searchable sublists. Select a person and record a payout.</p></div></div><div class="pay-staff-toolbar"><input id="payStaffSearch" placeholder="Search name / username / ID / email / phone"><select id="payStaffCategory"><option value="all">All Categories</option>${categories.map(category => `<option value="${esc(category)}">${esc(category)}</option>`).join("")}</select></div><div id="payStaffDirectory" class="pay-staff-directory"></div></div>`;
    const render = () => {
      const q = String($("#payStaffSearch")?.value || "").toLowerCase().trim();
      const category = $("#payStaffCategory")?.value || "all";
      const grouped = categories.map(name => ({ name, rows: directory.filter(item => item.category === name && (category === "all" || category === name) && (!q || [item.name, item.username, item.id, item.email, item.phone, item.shopName].some(value => String(value || "").toLowerCase().includes(q)))) })).filter(group => group.rows.length || category === "all" && group.name === "Courier Partners");
      $("#payStaffDirectory").innerHTML = grouped.map(group => `<section class="pay-staff-category"><div class="pay-staff-category-header"><h3>${esc(group.name)}</h3><span>${group.rows.length} record(s)</span></div><div class="pay-staff-sublist">${group.rows.length ? group.rows.map(item => `<article class="pay-staff-row"><div><strong>${esc(item.name || "Unnamed")}</strong><span>${esc(item.username || item.email || item.phone || "-")} · ID ${esc(item.id || "-")}</span></div><div class="pay-staff-row-actions"><button type="button" class="secondary-btn small" data-pay-view="${esc(item.id)}">View</button><button type="button" class="primary-btn small" data-pay-person="${esc(item.id)}">Pay</button></div></article>`).join("") : `<div class="support-empty">No records in this category.</div>`}</div></section>`).join("");
    };
    $("#payStaffSearch")?.addEventListener("input", render);
    $("#payStaffCategory")?.addEventListener("change", render);
    render();
  }

  function openPayView(personId) {
    const person = staffDirectory().find(item => String(item.id) === String(personId));
    if (!person) return;
    const payments = read(KEYS.transactions, []).filter(item => String(item.partyId || "") === String(person.id) && item.category === "payout");
    const modal = document.createElement("div");
    modal.id = "sm99PayStaffViewModal";
    modal.innerHTML = `<div class="support-modal-backdrop"><div class="support-editor-modal pay-staff-modal"><div class="support-editor-header"><div><span class="seller-kicker">PAYMENT HISTORY</span><h2>${esc(person.name || "Recipient")}</h2><p>${esc(person.category)} · ${esc(person.username || person.email || person.phone || "-")}</p></div><button type="button" class="support-modal-close" data-close-pay-view>×</button></div><div class="support-detail-grid"><div><b>ID</b><span>${esc(person.id || "-")}</span></div><div><b>Category</b><span>${esc(person.category || "-")}</span></div><div><b>Username / Contact</b><span>${esc(person.username || person.email || person.phone || "-")}</span></div><div><b>Total Paid</b><span>₹${payments.reduce((sum, item) => sum + Number(item.amount || 0), 0).toFixed(0)}</span></div></div><div class="support-detail-section"><h3>Payment History (${payments.length})</h3>${payments.length ? `<div class="support-table-wrap"><table><thead><tr><th>Date</th><th>Amount</th><th>Reference</th><th>Note</th></tr></thead><tbody>${payments.map(item => `<tr><td>${esc(item.createdAt ? new Date(item.createdAt).toLocaleString("en-IN") : "-")}</td><td>₹${Number(item.amount || 0)}</td><td>${esc(item.reference || "-")}</td><td>${esc(item.description || "-")}</td></tr>`).join("")}</tbody></table></div>` : `<div class="support-empty">No payments recorded yet.</div>`}</div></div></div>`;
    document.body.appendChild(modal);
    modal.querySelector("[data-close-pay-view]")?.addEventListener("click", () => modal.remove());
  }

  function openPayModal(personId) {
    const person = staffDirectory().find(item => String(item.id) === String(personId));
    if (!person) return;
    const modal = document.createElement("div");
    modal.id = "sm99PayStaffModal";
    modal.innerHTML = `<div class="support-modal-backdrop"><div class="support-editor-modal pay-staff-modal"><div class="support-editor-header"><div><span class="seller-kicker">STAFF PAYOUT</span><h2>Pay ${esc(person.name || "Recipient")}</h2><p>${esc(person.category)} · ${esc(person.username || person.email || person.phone || "-")}</p></div><button type="button" class="support-modal-close" data-close-pay>×</button></div><form id="payStaffForm"><input type="hidden" name="personId" value="${esc(person.id)}"><input type="hidden" name="category" value="${esc(person.category)}"><label class="support-editor-field"><span>Amount (₹)</span><input name="amount" type="number" min="1" step="1" required></label><label class="support-editor-field"><span>Payment Reference</span><input name="reference" required placeholder="PAY-001"></label><label class="support-editor-field support-editor-wide"><span>Note</span><textarea name="note" placeholder="Reason / salary / incentive / settlement"></textarea></label><div class="support-editor-actions"><button type="button" class="secondary-btn" data-close-pay>Cancel</button><button type="submit" class="primary-btn">Record Payment</button></div></form></div></div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll("[data-close-pay]").forEach(button => button.addEventListener("click", () => modal.remove()));
    modal.querySelector("#payStaffForm").addEventListener("submit", event => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const amount = Number(data.get("amount"));
      if (!Number.isFinite(amount) || amount <= 0) { toast("Valid amount enter karo."); return; }
      const transactions = read(KEYS.transactions, []);
      const isSeller = person.type === "seller" || person.category === "Sellers";
      transactions.unshift({ id: makeId("PAY"), category: isSeller ? "seller_payout" : "payout", type: "debit", amount, partyId: person.id, partyName: person.name, partyCategory: person.category, partyUsername: person.username || person.email || person.phone || "", ...(isSeller ? { sellerId: person.id || "", sellerEmail: String(person.email || "").toLowerCase() } : {}), reference: String(data.get("reference") || "").trim(), description: String(data.get("note") || (isSeller ? "Seller payment" : "")).trim(), status: "completed", bankAccountId: window.ShopMax99?.bank?.getActiveAccount?.()?.id || "BANK-CURRENT-001", createdAt: new Date().toISOString() });
      write(KEYS.transactions, transactions);
      logAudit(read("shopmax99_admin_session", {}).email || "admin", "admin", "staff_payout_recorded", `${person.category}:${person.id}`, { amount, reference: String(data.get("reference") || "") });
      modal.remove();
      toast("Payment recorded successfully.");
      renderPayToStaff();
    });
  }

  function bindSupportLoginForm() {
    const form = document.getElementById("supportLoginForm");
    if (!form || form.dataset.sm99Bound === "1") return;
    form.dataset.sm99Bound = "1";
    form.addEventListener("submit", supportLogin, true);
  }

  function initAdminSupport() {
    bindSupportLoginForm();
    if (window.__shopmax99SupportAdminBound) return;
    window.__shopmax99SupportAdminBound = true;
    ensureProductIds();

    document.addEventListener("click", event => {
      const navButton = event.target.closest("[data-support-page]");
      if (navButton) {
        event.preventDefault();
        const session = getSession();
        if (session?.role) renderSupport(session.role, navButton.dataset.supportPage);
        return;
      }
      const view = event.target.closest("[data-support-view]");
      if (view) {
        const type = view.dataset.supportView;
        const list = type === "seller" ? sellers() : customers();
        const found = list.find(item => String(item.id) === String(view.dataset.id) || String(item.mobile || item.phone) === String(view.dataset.id) || String(item.email || "").toLowerCase() === String(view.dataset.id).toLowerCase());
        const box = type === "seller" ? $("#sellerSupportSearchResults") : $("#customerSupportSearchResults");
        if (box && found) {
          logAudit(staff()?.id, staff()?.role, type === "seller" ? "seller_view" : "customer_view", `${type}:${found.id || found.mobile || found.email || view.dataset.id}`);
          box.innerHTML = type === "seller" ? sellerDetailHTML(found) : customerDetailHTML(found);
        }
        return;
      }
      const back = event.target.closest("[data-support-back-search]");
      if (back) { renderSupport(getSession().role, "search"); return; }
      const productEdit = event.target.closest("[data-support-product-edit]");
      if (productEdit) { openProductEditor(productEdit.dataset.supportProductEdit); return; }
      const logoutButton = event.target.closest("#sellerSupportLogoutBtn,#customerSupportLogoutBtn");
      if (logoutButton) { event.preventDefault(); logoutSupport(); return; }
      const adminAction = event.target.closest("[data-support-admin-action]");
      if (adminAction) {
        const action = adminAction.dataset.supportAdminAction;
        const requestId = adminAction.dataset.id;
        if (action === "accept-request") acceptRequest(requestId);
        else if (action === "open-request-editor") openAdminRequestEditor(requestId);
        else if (action === "reject-request") rejectRequest(requestId);
        else if (action === "view-request") openRequestReviewModal(requestId);
        else if (action === "delete-request") deleteRequests([requestId]);
        else if (action === "block-staff" || action === "unblock-staff") {
          if (!isAdmin()) return;
          const list = read(KEYS.staff, []);
          const account = list.find(item => String(item.id) === String(requestId));
          if (!account) return;
          account.status = action === "block-staff" ? "blocked" : "active";
          account.updatedAt = new Date().toISOString();
          write(KEYS.staff, list);
          logAudit(read("shopmax99_admin_session", {}).email || "admin", "admin", action, `support_staff:${requestId}`);
          renderAdminSupportStaff();
        }
        return;
      }
      const inlineTab = event.target.closest("[data-inline-request-tab]");
      if (inlineTab) {
        const idValue = inlineTab.dataset.requestId;
        const card = document.querySelector(`[data-request-id="${CSS.escape(idValue)}"]`);
        if (!card) return;
        $$("[data-inline-request-tab]", card).forEach(tab => tab.classList.toggle("active", tab === inlineTab));
        $$("[data-inline-request-pane]", card).forEach(pane => pane.hidden = pane.dataset.inlineRequestPane !== inlineTab.dataset.inlineRequestTab);
        return;
      }
      const payView = event.target.closest("[data-pay-view]");
      if (payView) { openPayView(payView.dataset.payView); return; }
      const payButton = event.target.closest("[data-pay-person]");
      if (payButton) { openPayModal(payButton.dataset.payPerson); return; }
    });

    document.addEventListener("submit", event => {
      if (event.target.id === "supportStaffCreateForm") {
        event.preventDefault();
        if (!isAdmin()) return;
        const data = new FormData(event.target);
        const username = String(data.get("username") || "").trim().toLowerCase();
        const list = read(KEYS.staff, []);
        if (list.some(item => String(item.username || "").toLowerCase() === username)) { toast("Username already exists."); return; }
        const role = ["seller_support", "customer_support"].includes(String(data.get("role") || "").trim()) ? String(data.get("role") || "").trim() : "seller_support";
        const password = String(data.get("password") || "");
        if (password.length < 6) { toast("Support password must be at least 6 characters."); return; }
        list.push({ id: makeId("SUP"), displayName: String(data.get("displayName") || "").trim(), username, password, role, status: "active", createdAt: new Date().toISOString(), createdBy: read("shopmax99_admin_session", {}).email || "admin" });
        write(KEYS.staff, list);
        event.target.reset();
        toast("Support ID created successfully.");
        renderAdminSupportStaff();
        return;
      }
      if (event.target.matches("[data-support-comprehensive-form]")) {
        event.preventDefault();
        createComprehensiveRequest(event.target);
        return;
      }
      if (event.target.matches("[data-support-request-form]")) {
        event.preventDefault();
        createGenericRequest(event.target);
        const role = getSession()?.role;
        if (role) renderSupport(role, "requests");
        return;
      }
      if (event.target.id === "sellerSupportSearchForm") {
        event.preventDefault();
        const query = String(new FormData(event.target).get("q") || "");
        const result = searchAccounts("seller", query);
        logAudit(staff()?.id, staff()?.role, "seller_search", query);
        $("#sellerSupportSearchResults").innerHTML = result.length ? result.map(sellerResultHTML).join("") : `<div class="support-empty">No seller account found.</div>`;
        return;
      }
      if (event.target.id === "customerSupportSearchForm") {
        event.preventDefault();
        const query = String(new FormData(event.target).get("q") || "");
        const result = searchAccounts("customer", query);
        logAudit(staff()?.id, staff()?.role, "customer_search", query);
        $("#customerSupportSearchResults").innerHTML = result.length ? result.map(customerResultHTML).join("") : `<div class="support-empty">No customer account found.</div>`;
        return;
      }
      if (event.target.id === "sellerSupportProductSearchForm") {
        event.preventDefault();
        const query = String(new FormData(event.target).get("q") || "");
        const result = productSearch(query);
        logAudit(staff()?.id, staff()?.role, "product_search", query);
        $("#sellerSupportProductResults").innerHTML = result.length ? result.map(productResultHTML).join("") : `<div class="support-empty">No matching product found.</div>`;
        return;
      }
    });
  }

  window.renderAdminSupportStaff = renderAdminSupportStaff;
  window.renderAdminSupportRequests = renderAdminSupportRequests;
  window.renderAdminSupportAudit = function renderAdminSupportAudit() {
    const box = document.querySelector('[data-admin-section="support-audit"]');
    if (!box) return;
    const rows = read(KEYS.audit, []).slice(0, 300);
    box.innerHTML = `<div class="support-admin-page"><div class="support-page-header"><div><span class="seller-kicker">TRACEABILITY</span><h1>Support Audit Log</h1><p>Support logins, searches, requests, approvals and payouts.</p></div></div><div class="support-table-wrap"><table><thead><tr><th>Date</th><th>Actor</th><th>Role</th><th>Action</th><th>Target</th></tr></thead><tbody>${rows.length ? rows.map(row => `<tr><td>${esc(row.createdAt ? new Date(row.createdAt).toLocaleString("en-IN") : "-")}</td><td>${esc(row.actorId || "-")}</td><td>${esc(row.actorRole || "-")}</td><td>${esc(row.action || "-")}</td><td>${esc(row.target || "-")}</td></tr>`).join("") : `<tr><td colspan="5">No audit entries.</td></tr>`}</tbody></table></div></div>`;
  };
  window.renderAdminPayToStaff = renderPayToStaff;
  window.initAdminSupport = initAdminSupport;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAdminSupport); else initAdminSupport();
})();
