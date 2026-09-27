/* =========================================================
   SHOPMAX99 - ADMIN CONTROL CENTER
   Complete admin.js
   ========================================================= */

(function () {
    "use strict";

    const SM = window.ShopMax99 || (window.ShopMax99 = {});

    const KEYS = {
        sellers: "shopmax99_sellers",
        products: "shopmax99_products",
        orders: "shopmax99_orders",
        users: "shopmax99_users",
        settings: "shopmax99_settings",
        transactions: "shopmax99_transactions"
    };

    /* =========================================================
       BASIC STORAGE
       ========================================================= */

    function getData(key, fallback = []) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function saveData(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    function makeId(prefix = "id") {
        return prefix + "_" + Date.now() + "_" +
            Math.random().toString(36).substring(2, 8);
    }

    function escapeHTML(value) {
        if (value === null || value === undefined) return "";

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function money(value) {
        return "₹" + Number(value || 0).toFixed(0);
    }

    function notify(message) {
        let box = document.getElementById("shopmax99AdminToast");

        if (!box) {
            box = document.createElement("div");
            box.id = "shopmax99AdminToast";

            box.style.cssText = `
                position:fixed;
                right:20px;
                bottom:20px;
                z-index:99999;
                background:#171122;
                color:#fff;
                padding:13px 18px;
                border-radius:10px;
                box-shadow:0 8px 30px rgba(0,0,0,.25);
                font-size:14px;
                max-width:350px;
                display:none;
            `;

            document.body.appendChild(box);
        }

        box.textContent = message;
        box.style.display = "block";

        clearTimeout(window.__shopmax99AdminToastTimer);

        window.__shopmax99AdminToastTimer = setTimeout(() => {
            box.style.display = "none";
        }, 2500);
    }


    


    /* =========================================================
       ADMIN SECTION NAVIGATION
       ========================================================= */

    const sectionAliases = {
        dashboard: "dashboard",

        "seller-accounts": "seller-accounts",
        sellers: "seller-accounts",

        "pending-seller-approval": "pending-seller-approval",
        "pending-sellers": "pending-seller-approval",

        "all-sellers": "all-sellers",

        "blocked-held-sellers": "blocked-held-sellers",
        "blocked-sellers": "blocked-held-sellers",
        blocked: "blocked-held-sellers",

        "all-products": "all-products",
        products: "all-products",

        "pending-products": "pending-products",

        "approved-products": "approved-products",

        "rejected-products": "rejected-products",

        "product-edit": "product-edit",
        "edit-products": "product-edit",

        orders: "orders",
        customers: "customers",
        reports: "reports",
        "courier-partners": "courier-partners",
        courier: "courier-partners",
        transactions: "transactions",
        "bank-account": "bank-account",
        bank: "bank-account",
        settings: "settings",
        "support-staff": "support-staff",
        "pay-to-staff": "pay-to-staff",
        "support-requests": "support-requests",
        "support-audit": "support-audit",
        "seller-payments": "seller-payments"
    };

    function normalizeSection(section) {
        section = String(section || "")
            .toLowerCase()
            .trim();

        return sectionAliases[section] || section;
    }

    function findAdminSection(section) {
        const normalized = normalizeSection(section);

        const capitalized = normalized
            .split("-")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join("");

        const selectors = [
            `[data-admin-section="${normalized}"]`,
            `[data-section="${normalized}"].admin-section`,
            `#admin${capitalized}`,
            `#admin-${normalized}`,
            `#${normalized}`,
            `.admin-section[data-section="${normalized}"]`
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);

            if (element) {
                return element;
            }
        }

        return null;
    }

    function showAdminSection(section) {
        const normalized = normalizeSection(section);

        // Admin menu clicks must only switch the current tab.
        // Do NOT call showRole("admin") here because showRole() itself
        // initializes the Admin workspace and opens Dashboard, which used
        // to create a recursive Dashboard reset on every menu click.
        const adminApp = document.getElementById("adminApp");
        if (adminApp) {
            adminApp.hidden = false;
            adminApp.style.display = "";
        }
        document.body.dataset.activeRole = "admin";
        if (window.ShopMax99) window.ShopMax99.currentRole = "admin";

        const sections = document.querySelectorAll(
            ".admin-section, [data-admin-section]"
        );

        sections.forEach(el => {
            el.style.display = "none";
            el.classList.remove("active");
        });

        const target = findAdminSection(normalized);
        if (!target) {
            // If a support/bank page was added by another module, allow that
            // module to render it without breaking the rest of Admin.
            console.warn("ShopMax99 Admin section not found:", normalized);
            return false;
        }

        target.style.display = "";
        target.classList.add("active");

        // Highlight exactly the clicked Admin menu item.
        document.querySelectorAll(".admin-sidebar [data-admin-page]").forEach(btn => {
            btn.classList.toggle(
                "active",
                normalizeSection(btn.dataset.adminPage) === normalized
            );
        });

        renderAdminSection(normalized);
        return true;
    }

    window.showAdminSection = showAdminSection;
    SM.showAdminSection = showAdminSection;


    /* =========================================================
       SELLER MANAGEMENT
       ========================================================= */

    function getSellers() {
        return getData(KEYS.sellers, []);
    }

    function saveSellers(sellers) {
        saveData(KEYS.sellers, sellers);
    }

    function approveSeller(id) {
        const sellers = getSellers();

        const seller = sellers.find(s => String(s.id) === String(id));

        if (!seller) {
            notify("Seller nahi mila.");
            return;
        }

        seller.status = "approved";
        seller.approvedAt = new Date().toISOString();

        saveSellers(sellers);

        notify("Seller approved successfully.");

        renderAllAdminSections();
    }

    function rejectSeller(id) {
        const sellers = getSellers();

        const seller = sellers.find(s => String(s.id) === String(id));

        if (!seller) {
            notify("Seller nahi mila.");
            return;
        }

        seller.status = "rejected";
        seller.rejectedAt = new Date().toISOString();

        saveSellers(sellers);

        notify("Seller rejected.");

        renderAllAdminSections();
    }

    function blockSeller(id) {
        const sellers = getSellers();

        const seller = sellers.find(s => String(s.id) === String(id));

        if (!seller) {
            notify("Seller nahi mila.");
            return;
        }

        seller.status = "blocked";
        seller.blockedAt = new Date().toISOString();

        saveSellers(sellers);

        notify("Seller blocked.");

        renderAllAdminSections();
    }

    function unblockSeller(id) {
        const sellers = getSellers();

        const seller = sellers.find(s => String(s.id) === String(id));

        if (!seller) {
            notify("Seller nahi mila.");
            return;
        }

        seller.status = "approved";

        saveSellers(sellers);

        notify("Seller unblocked.");

        renderAllAdminSections();
    }

    function deleteSeller(id) {
        if (!confirm("Is seller account ko delete karna hai?")) {
            return;
        }

        let sellers = getSellers();

        sellers = sellers.filter(
            s => String(s.id) !== String(id)
        );

        saveSellers(sellers);

        notify("Seller account deleted.");

        renderAllAdminSections();
    }


    /* =========================================================
       PRODUCT MANAGEMENT
       ========================================================= */

    function getProducts() {
        return getData(KEYS.products, []);
    }

    function saveProducts(products) {
        saveData(KEYS.products, products);
    }

    function approveProduct(id) {
        const products = getProducts();

        const product = products.find(
            p => String(p.id) === String(id)
        );

        if (!product) {
            notify("Product nahi mila.");
            return;
        }

        product.status = "approved";
        product.customerPrice = 99;
        product.approvedAt = new Date().toISOString();

        saveProducts(products);

        notify("Product approved. Ab home par show hoga.");

        renderAllAdminSections();

        if (typeof window.renderApprovedProducts === "function") {
            window.renderApprovedProducts();
        }
    }

    function rejectProduct(id) {
        const products = getProducts();

        const product = products.find(
            p => String(p.id) === String(id)
        );

        if (!product) {
            notify("Product nahi mila.");
            return;
        }

        product.status = "rejected";
        product.rejectedAt = new Date().toISOString();

        saveProducts(products);

        notify("Product rejected.");

        renderAllAdminSections();

        if (typeof window.renderApprovedProducts === "function") {
            window.renderApprovedProducts();
        }
    }

    function deleteProduct(id) {
        if (!confirm("Is product ko permanently delete karna hai?")) {
            return;
        }

        let products = getProducts();

        products = products.filter(
            p => String(p.id) !== String(id)
        );

        saveProducts(products);

        notify("Product deleted.");

        renderAllAdminSections();

        if (typeof window.renderApprovedProducts === "function") {
            window.renderApprovedProducts();
        }
    }

    function editProduct(id) {
        const products = getProducts();
        const index = products.findIndex(
            product => String(product.id) === String(id)
        );

        if (index === -1) {
            notify("Product nahi mila.");
            return;
        }

        const product = products[index];

        document.getElementById("sm99AdminEditProductModal")?.remove();

        const modal = document.createElement("div");
        modal.id = "sm99AdminEditProductModal";
        modal.innerHTML = `
            <div style="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;">
                <div style="width:min(700px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:16px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.25);">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:20px;">
                        <div>
                            <h2 style="margin:0 0 5px;">Edit Product</h2>
                            <p style="margin:0;color:#666;font-size:13px;">Admin edit ke baad product dobara approval ke liye Pending ho jayega.</p>
                        </div>
                        <button type="button" data-close-admin-edit style="border:0;background:#f1f1f1;border-radius:8px;padding:8px 12px;font-size:18px;cursor:pointer;">×</button>
                    </div>

                    <form id="sm99AdminEditProductForm">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                            <label style="display:block;">
                                <span style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;">Product Name *</span>
                                <input id="sm99AdminEditName" required value="${escapeHTML(product.name || "")}" style="width:100%;box-sizing:border-box;padding:11px;border:1px solid #ddd;border-radius:8px;">
                            </label>
                            <label style="display:block;">
                                <span style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;">Category *</span>
                                <input id="sm99AdminEditCategory" required value="${escapeHTML(product.category || "")}" style="width:100%;box-sizing:border-box;padding:11px;border:1px solid #ddd;border-radius:8px;">
                            </label>
                            <label style="display:block;">
                                <span style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;">Seller Price (₹1–₹70) *</span>
                                <input id="sm99AdminEditPrice" type="number" min="1" max="70" required value="${Number(product.sellerPrice || 0)}" style="width:100%;box-sizing:border-box;padding:11px;border:1px solid #ddd;border-radius:8px;">
                            </label>
                            <label style="display:block;">
                                <span style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;">Stock *</span>
                                <input id="sm99AdminEditStock" type="number" min="1" step="1" required value="${Number(product.stock || 1)}" style="width:100%;box-sizing:border-box;padding:11px;border:1px solid #ddd;border-radius:8px;">
                            </label>
                        </div>

                        <label style="display:block;margin-top:14px;">
                            <span style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;">Description</span>
                            <textarea id="sm99AdminEditDescription" rows="5" style="width:100%;box-sizing:border-box;padding:11px;border:1px solid #ddd;border-radius:8px;resize:vertical;">${escapeHTML(product.description || "")}</textarea>
                        </label>

                        <div style="margin-top:14px;padding:14px;background:#f8f8fb;border-radius:10px;">
                            <div style="font-size:13px;font-weight:700;margin-bottom:10px;">Product Images</div>
                            <div id="sm99AdminCurrentImages" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px;">
                                ${(Array.isArray(product.images) ? product.images : (product.image ? [product.image] : [])).map((img, i) => `
                                    <div data-admin-existing-image="${i}" style="position:relative;border:1px solid #ddd;border-radius:10px;padding:6px;background:#fff;">
                                        <img src="${escapeHTML(img)}" style="width:100%;height:90px;object-fit:contain;border-radius:7px;display:block;">
                                        <button type="button" data-remove-admin-image="${i}" style="position:absolute;top:4px;right:4px;border:0;border-radius:50%;width:24px;height:24px;background:#dc2626;color:#fff;cursor:pointer;font-weight:700;">×</button>
                                    </div>`).join("")}
                            </div>
                            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:7px;">Replace / Add Images (up to 4)</label>
                            <input id="sm99AdminEditImages" type="file" accept="image/*" multiple style="width:100%;padding:10px;border:1px dashed #bbb;border-radius:8px;background:#fff;">
                            <div style="margin-top:6px;font-size:12px;color:#777;">× se existing image remove karo. New images existing images ke saath add hongi (maximum 4 total).</div>
                        </div>

                        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
                            <button type="button" data-close-admin-edit style="padding:10px 18px;border:1px solid #ddd;background:#fff;border-radius:8px;cursor:pointer;">Cancel</button>
                            <button type="submit" style="padding:10px 20px;border:0;background:#6d28d9;color:#fff;border-radius:8px;cursor:pointer;font-weight:600;">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelectorAll("[data-close-admin-edit]").forEach(button => {
            button.addEventListener("click", close);
        });

        const adminExistingImages = Array.isArray(product.images) ? product.images : (product.image ? [product.image] : []);
        const adminRemovedImages = new Set();
        modal.querySelectorAll("[data-remove-admin-image]").forEach(button => {
            button.addEventListener("click", () => {
                const i = Number(button.dataset.removeAdminImage);
                adminRemovedImages.add(i);
                modal.querySelector(`[data-admin-existing-image="${i}"]`)?.remove();
            });
        });

        modal.querySelector("#sm99AdminEditProductForm").addEventListener("submit", async event => {
            event.preventDefault();

            const name = modal.querySelector("#sm99AdminEditName").value.trim();
            const category = modal.querySelector("#sm99AdminEditCategory").value.trim();
            const price = Number(modal.querySelector("#sm99AdminEditPrice").value);
            const stock = Number(modal.querySelector("#sm99AdminEditStock").value);
            const description = modal.querySelector("#sm99AdminEditDescription").value.trim();
            const imageFiles = Array.from(modal.querySelector("#sm99AdminEditImages")?.files || []);
            let updatedImages = adminExistingImages.filter((_, i) => !adminRemovedImages.has(i));

            if (imageFiles.length) {
                const fileImages = await Promise.all(imageFiles.map(file => new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                })));
                updatedImages = updatedImages.concat(fileImages);
            }

            updatedImages = updatedImages.filter(Boolean).slice(0, 4);
            if (!updatedImages.length) {
                notify("Kam se kam 1 product image rakho.");
                return;
            }

            if (!name || !category) {
                notify("Product name aur category required hain.");
                return;
            }

            if (!Number.isFinite(price) || price < 1 || price > 70) {
                notify("Seller price ₹1 se ₹70 ke beech hona chahiye.");
                return;
            }

            if (!Number.isInteger(stock) || stock < 1) {
                notify("Stock kam se kam 1 hona chahiye.");
                return;
            }

            const now = new Date().toISOString();
            const updated = {
                ...products[index],
                name,
                category,
                sellerPrice: price,
                customerPrice: 99,
                stock,
                description,
                image: updatedImages[0],
                images: updatedImages,
                status: "pending",
                updatedAt: now,
                approvedAt: null,
                rejectedAt: null
            };

            products[index] = updated;
            saveProducts(products);

            const requests = getData("nestedProductRequests", []);
            const filtered = requests.filter(
                request => String(request.productId || request.product?.id || "") !== String(id)
            );
            filtered.unshift({
                id: `REQ-${id}`,
                type: "product",
                productId: id,
                status: "pending",
                product: updated,
                createdAt: now
            });
            saveData("nestedProductRequests", filtered);

            close();
            notify("Product edit save ho gaya aur approval ke liye Pending ho gaya.");
            renderAllAdminSections();

            if (typeof window.renderApprovedProducts === "function") {
                window.renderApprovedProducts();
            }
        });
    }

    /* =========================================================
       HTML BUILDERS
       ========================================================= */

    function statusBadge(status) {
        const value = String(status || "pending").toLowerCase();

        let label = value;

        if (value === "approved") label = "Approved";
        if (value === "pending") label = "Pending";
        if (value === "rejected") label = "Rejected";
        if (value === "blocked") label = "Blocked";
        if (value === "held") label = "Held";

        return `
            <span class="admin-status admin-status-${escapeHTML(value)}"
                style="
                    display:inline-block;
                    padding:4px 9px;
                    border-radius:20px;
                    font-size:12px;
                    font-weight:600;
                    background:#eee;
                ">
                ${escapeHTML(label)}
            </span>
        `;
    }

    function sellerCard(seller) {
        const status = String(seller.status || "pending");

        return `
            <div class="admin-card"
                data-seller-id="${escapeHTML(seller.id)}"
                style="
                    background:#fff;
                    border:1px solid #e5e5e5;
                    border-radius:12px;
                    padding:16px;
                    margin-bottom:12px;
                ">

                <div style="
                    display:flex;
                    justify-content:space-between;
                    gap:15px;
                    align-items:flex-start;
                ">

                    <div>
                        <h3 style="margin:0 0 7px;">
                            ${escapeHTML(
                                seller.shopName ||
                                seller.name ||
                                "Seller"
                            )}
                        </h3>

                        <div style="font-size:13px;color:#666;">
                            Seller: ${escapeHTML(seller.name || "-")}
                        </div>

                        <div style="font-size:13px;color:#666;">
                            Email: ${escapeHTML(seller.email || "-")}
                        </div>

                        <div style="font-size:13px;color:#666;">
                            Phone: ${escapeHTML(seller.phone || "-")}
                        </div>
                    </div>

                    <div>
                        ${statusBadge(status)}
                    </div>
                </div>

                <div style="
                    display:flex;
                    flex-wrap:wrap;
                    gap:8px;
                    margin-top:14px;
                ">

                    ${
                        status === "pending"
                        ? `
                            <button
    type="button"
    class="admin-action-btn approve"
    data-admin-action="approve-seller"
    data-id="${escapeHTML(seller.id)}">
    Approve
</button>

                            <button
    type="button"
    class="admin-action-btn reject"
    data-admin-action="reject-seller"
    data-id="${escapeHTML(seller.id)}">
    Reject
</button>
                        `
                        : ""
                    }

                    ${
                        status === "approved"
                        ? `
                            <button
    type="button"
    class="admin-action-btn block"
    data-admin-action="block-seller"
    data-id="${escapeHTML(seller.id)}">
    Block
</button>
                        `
                        : ""
                    }

                    ${
                        status === "blocked" || status === "held"
                        ? `
                            <button
    type="button"
    class="admin-action-btn approve"
    data-admin-action="unblock-seller"
    data-id="${escapeHTML(seller.id)}">
    Unblock
</button>
                        `
                        : ""
                    }

                   <button
    type="button"
    class="admin-action-btn delete"
    data-admin-action="delete-seller"
    data-id="${escapeHTML(seller.id)}">
    Delete
</button>
                </div>
            </div>
        `;
    }

    function productCard(product) {
        const status = String(product.status || "pending");

        return `
            <div class="admin-card"
                data-product-id="${escapeHTML(product.id)}"
                style="
                    background:#fff;
                    border:1px solid #e5e5e5;
                    border-radius:12px;
                    padding:16px;
                    margin-bottom:12px;
                ">

                <div style="
                    display:flex;
                    justify-content:space-between;
                    gap:15px;
                    align-items:flex-start;
                ">

                    <div>
                        <h3 style="margin:0 0 7px;">
                            ${escapeHTML(product.name || "Product")}
                        </h3>

                        <div style="font-size:13px;color:#666;">
                            Category:
                            ${escapeHTML(product.category || "-")}
                        </div>

                        <div style="font-size:13px;color:#666;">
                            Seller:
                            ${escapeHTML(product.sellerName || product.sellerId || "-")}
                        </div>

                        <div style="font-size:13px;color:#666;">
                            Seller Price:
                            <strong>${money(product.sellerPrice)}</strong>
                        </div>

                        <div style="font-size:13px;color:#666;">
                            Customer Price:
                            <strong>₹99</strong>
                        </div>
                    </div>

                    <div>
                        ${statusBadge(status)}
                    </div>
                </div>

                <div style="
                    display:flex;
                    flex-wrap:wrap;
                    gap:8px;
                    margin-top:14px;
                ">

                    ${
                        status === "pending"
                        ? `
                            <button
    type="button"
    class="admin-action-btn approve"
    data-admin-action="approve-product"
    data-id="${escapeHTML(product.id)}">
    Approve
</button>

                            <button
    type="button"
    class="admin-action-btn reject"
    data-admin-action="reject-product"
    data-id="${escapeHTML(product.id)}">
    Reject
</button>
                        `
                        : ""
                    }

                    <button
    type="button"
    class="admin-action-btn edit"
    data-admin-action="edit-product"
    data-id="${escapeHTML(product.id)}">
    Edit
</button>

                    <button
    type="button"
    class="admin-action-btn delete"
    data-admin-action="delete-product"
    data-id="${escapeHTML(product.id)}">
    Delete
</button>
                </div>
            </div>
        `;
    }


    /* =========================================================
       FIND CONTAINER
       ========================================================= */

    function findContainer(type) {
        const map = {
            dashboard: [
                "#adminDashboardContent",
                "#adminDashboard",
                '[data-admin-content="dashboard"]'
            ],

            "seller-accounts": [
                "#adminSellerAccounts",
                '[data-admin-content="seller-accounts"]'
            ],

            "pending-seller-approval": [
                "#adminPendingSellerApproval",
                '[data-admin-content="pending-seller-approval"]'
            ],

            "all-sellers": [
                "#adminAllSellers",
                '[data-admin-content="all-sellers"]'
            ],

            "blocked-held-sellers": [
                "#adminBlockedHeldSellers",
                '[data-admin-content="blocked-held-sellers"]'
            ],

            "all-products": [
                "#adminAllProducts",
                '[data-admin-content="all-products"]'
            ],

            "pending-products": [
                "#adminPendingProducts",
                '[data-admin-content="pending-products"]'
            ],

            "approved-products": [
                "#adminApprovedProducts",
                '[data-admin-content="approved-products"]'
            ],

            "rejected-products": [
                "#adminRejectedProducts",
                '[data-admin-content="rejected-products"]'
            ],

            "product-edit": [
                "#adminProductEdit",
                '[data-admin-content="product-edit"]'
            ],

            orders: [
                "#adminOrders",
                '[data-admin-content="orders"]'
            ],

            customers: [
                "#adminCustomers",
                '[data-admin-content="customers"]'
            ],

            reports: [
                "#adminReports",
                '[data-admin-content="reports"]'
            ],

            settings: [
                "#adminSettings",
                '[data-admin-content="settings"]'
            ]
        };

        const selectors = map[type] || [];

        for (const selector of selectors) {
            const element = document.querySelector(selector);

            if (element) {
                return element;
            }
        }

        return null;
    }


    /* =========================================================
       RENDER SELLERS
       ========================================================= */

    function renderSellers() {
        const sellers = getSellers();

        const pending = sellers.filter(
            s => String(s.status || "pending") === "pending"
        );

        const approved = sellers.filter(
            s => String(s.status) === "approved"
        );

        const blocked = sellers.filter(
            s =>
                String(s.status) === "blocked" ||
                String(s.status) === "held"
        );

        const allContainer = findContainer("all-sellers");

        if (allContainer) {
            allContainer.innerHTML = `
                <h2>All Sellers</h2>

                <div style="margin-bottom:15px;">
                    Total Sellers: <strong>${sellers.length}</strong>
                </div>

                ${
                    sellers.length
                    ? sellers.map(sellerCard).join("")
                    : "<p>No sellers found.</p>"
                }
            `;
        }

        const pendingContainer =
            findContainer("pending-seller-approval");

        if (pendingContainer) {
            pendingContainer.innerHTML = `
                <h2>Pending Seller Approval</h2>

                ${
                    pending.length
                    ? pending.map(sellerCard).join("")
                    : "<p>No pending seller requests.</p>"
                }
            `;
        }

        const blockedContainer =
            findContainer("blocked-held-sellers");

        if (blockedContainer) {
            blockedContainer.innerHTML = `
                <h2>Blocked / Held Sellers</h2>

                ${
                    blocked.length
                    ? blocked.map(sellerCard).join("")
                    : "<p>No blocked or held sellers.</p>"
                }
            `;
        }

        const sellerAccounts =
            findContainer("seller-accounts");

        if (sellerAccounts) {
            sellerAccounts.innerHTML = `
                <h2>Seller Accounts</h2>

                <div style="
                    display:flex;
                    gap:10px;
                    flex-wrap:wrap;
                    margin-bottom:18px;
                ">
                    <div>
                        <strong>${sellers.length}</strong>
                        <small>Total</small>
                    </div>

                    <div>
                        <strong>${pending.length}</strong>
                        <small>Pending</small>
                    </div>

                    <div>
                        <strong>${approved.length}</strong>
                        <small>Approved</small>
                    </div>

                    <div>
                        <strong>${blocked.length}</strong>
                        <small>Blocked</small>
                    </div>
                </div>

                ${
                    sellers.length
                    ? sellers.map(sellerCard).join("")
                    : "<p>No seller accounts found.</p>"
                }
            `;
        }
    }


    /* =========================================================
       RENDER PRODUCTS
       ========================================================= */

    function renderProducts() {
        const products = getProducts();

        const pending = products.filter(
            p => String(p.status || "pending") === "pending"
        );

        const approved = products.filter(
            p => String(p.status) === "approved"
        );

        const rejected = products.filter(
            p => String(p.status) === "rejected"
        );

        const allContainer = findContainer("all-products");

        if (allContainer) {
            allContainer.innerHTML = `
                <h2>All Products</h2>

                <div style="margin-bottom:15px;">
                    Total Products:
                    <strong>${products.length}</strong>
                </div>

                ${
                    products.length
                    ? products.map(productCard).join("")
                    : "<p>No products found.</p>"
                }
            `;
        }

        const pendingContainer =
            findContainer("pending-products");

        if (pendingContainer) {
            pendingContainer.innerHTML = `
                <h2>Pending Products</h2>

                ${
                    pending.length
                    ? pending.map(productCard).join("")
                    : "<p>No pending products.</p>"
                }
            `;
        }

        const approvedContainer =
            findContainer("approved-products");

        if (approvedContainer) {
            approvedContainer.innerHTML = `
                <h2>Approved Products</h2>

                ${
                    approved.length
                    ? approved.map(productCard).join("")
                    : "<p>No approved products.</p>"
                }
            `;
        }

        const rejectedContainer =
            findContainer("rejected-products");

        if (rejectedContainer) {
            rejectedContainer.innerHTML = `
                <h2>Rejected Products</h2>

                ${
                    rejected.length
                    ? rejected.map(productCard).join("")
                    : "<p>No rejected products.</p>"
                }
            `;
        }

        const editContainer =
            findContainer("product-edit");

        if (editContainer) {
            editContainer.innerHTML = `
                <h2>Product Edit</h2>

                <p style="color:#666;">
                    Admin kisi bhi product ko edit kar sakta hai.
                    Edit karne ke baad product dobara approval ke liye
                    <strong>Pending</strong> ho jayega.
                </p>

                ${
                    products.length
                    ? products.map(productCard).join("")
                    : "<p>No products found.</p>"
                }
            `;
        }
    }


    /* =========================================================
       DASHBOARD
       ========================================================= */

    function renderDashboard() {
        const container = findContainer("dashboard");
        if (!container) return;

        const sellers = getSellers();
        const products = getProducts();
        const orders = getData(KEYS.orders, []);
        const users = getData(KEYS.users, []);
        const transactions = getTransactions();

        const pendingSellers = sellers.filter(s => String(s.status || "pending") === "pending").length;
        const approvedSellers = sellers.filter(s => String(s.status || "") === "approved" || String(s.status || "") === "active").length;
        const blockedSellers = sellers.filter(s => ["blocked","held","suspended"].includes(String(s.status || "").toLowerCase())).length;
        const pendingProducts = products.filter(p => String(p.status || "pending") === "pending").length;
        const approvedProducts = products.filter(p => String(p.status) === "approved").length;
        const completedOrders = orders.filter(o => ["completed","delivered","success","paid"].includes(String(o.status || "").toLowerCase())).length;
        const revenue = orders.reduce((sum,o) => sum + Number(o.total || o.amount || o.grandTotal || 0), 0);
        const credits = transactions.filter(t => t.type === "credit").reduce((sum,t) => sum + Number(t.amount || 0), 0);
        const debits = transactions.filter(t => t.type === "debit").reduce((sum,t) => sum + Number(t.amount || 0), 0);

        container.innerHTML = `
          <div class="admin-dashboard-shell">
            <section class="admin-dashboard-hero">
              <div>
                <span class="seller-kicker">SHOPMAX99 CONTROL CENTER</span>
                <h1>Admin Dashboard</h1>
                <p>Platform overview, seller activity, products, orders and financial movement — all in one place.</p>
              </div>
              <div class="admin-dashboard-hero-icon"><i class="fa-solid fa-chart-line"></i></div>
            </section>

            <section class="admin-metric-grid admin-dashboard-metrics">
              <button class="admin-metric-card" data-admin-dashboard-nav="seller-accounts"><span><i class="fa-solid fa-store"></i></span><strong>${sellers.length}</strong><small>Total Sellers</small></button>
              <button class="admin-metric-card" data-admin-dashboard-nav="pending-seller-approval"><span><i class="fa-solid fa-user-clock"></i></span><strong>${pendingSellers}</strong><small>Pending Sellers</small></button>
              <button class="admin-metric-card" data-admin-dashboard-nav="all-products"><span><i class="fa-solid fa-box-open"></i></span><strong>${products.length}</strong><small>Total Products</small></button>
              <button class="admin-metric-card" data-admin-dashboard-nav="pending-products"><span><i class="fa-solid fa-hourglass-half"></i></span><strong>${pendingProducts}</strong><small>Pending Products</small></button>
              <button class="admin-metric-card" data-admin-dashboard-nav="approved-products"><span><i class="fa-solid fa-circle-check"></i></span><strong>${approvedProducts}</strong><small>Approved Products</small></button>
              <button class="admin-metric-card" data-admin-dashboard-nav="orders"><span><i class="fa-solid fa-cart-shopping"></i></span><strong>${orders.length}</strong><small>Total Orders</small></button>
              <button class="admin-metric-card" data-admin-dashboard-nav="customers"><span><i class="fa-solid fa-users"></i></span><strong>${users.length}</strong><small>Customers</small></button>
              <button class="admin-metric-card" data-admin-dashboard-nav="seller-payments"><span><i class="fa-solid fa-wallet"></i></span><strong>₹${revenue.toFixed(0)}</strong><small>Order Value</small></button>
            </section>

            <section class="admin-dashboard-maintenance-card" style="margin-top:20px;background:linear-gradient(135deg,#20102f,#35155a);color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:20px;box-shadow:0 14px 35px rgba(58,18,91,.18);">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:14px;min-width:0;">
                  <div style="width:48px;height:48px;border-radius:14px;background:rgba(255,255,255,.12);display:grid;place-items:center;font-size:21px;flex:0 0 auto;"><i class="fa-solid fa-screwdriver-wrench"></i></div>
                  <div>
                    <span class="seller-kicker" style="color:rgba(255,255,255,.72);">SITE CONTROL</span>
                    <h2 style="margin:4px 0 5px;font-size:20px;">Site Under Maintenance</h2>
                    <p id="adminDashboardMaintenanceDescription" style="margin:0;color:rgba(255,255,255,.78);font-size:13px;line-height:1.5;">Customer aur Seller access ko temporarily band karke site ko maintenance mode mein daalein.</p>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                  <span id="adminDashboardMaintenanceStatus" style="font-size:12px;font-weight:800;padding:8px 11px;border-radius:999px;background:rgba(255,255,255,.1);">Checking status...</span>
                  <button type="button" id="adminDashboardMaintenanceBtn" style="border:1px solid rgba(255,255,255,.24);background:#fff;color:#35155a;border-radius:12px;padding:11px 16px;font-weight:900;cursor:pointer;white-space:nowrap;"><i class="fa-solid fa-screwdriver-wrench"></i> Manage Maintenance</button>
                </div>
              </div>
            </section>

            <section class="admin-dashboard-lower">
              <article class="admin-insight-card">
                <div class="admin-insight-head"><div><span class="seller-kicker">SELLER HEALTH</span><h2>Seller Overview</h2></div><i class="fa-solid fa-users-gear"></i></div>
                <span class="admin-big-number">${approvedSellers}</span>
                <p>Active / approved seller accounts</p>
                <div class="admin-attention-list">
                  <button data-admin-dashboard-nav="pending-seller-approval"><span>Pending approval</span><b>${pendingSellers}</b></button>
                  <button data-admin-dashboard-nav="blocked-held-sellers"><span>Blocked / held</span><b>${blockedSellers}</b></button>
                  <button data-admin-dashboard-nav="seller-payments"><span>Completed orders</span><b>${completedOrders}</b></button>
                </div>
              </article>
              <article class="admin-insight-card">
                <div class="admin-insight-head"><div><span class="seller-kicker">FINANCIAL SNAPSHOT</span><h2>Platform Ledger</h2></div><i class="fa-solid fa-chart-column"></i></div>
                <div class="admin-finance-mini-grid">
                  <div><span>Credits</span><strong>₹${credits.toFixed(2)}</strong></div>
                  <div><span>Debits</span><strong>₹${debits.toFixed(2)}</strong></div>
                  <div><span>Orders</span><strong>${orders.length}</strong></div>
                  <div><span>Customers</span><strong>${users.length}</strong></div>
                </div>
                <button class="primary-btn admin-dashboard-wide-btn" data-admin-dashboard-nav="transactions"><i class="fa-solid fa-arrow-right"></i> Open Transactions</button>
              </article>
            </section>
          </div>
        `;

        const maintenanceBtn = container.querySelector('#adminDashboardMaintenanceBtn');
        const maintenanceStatus = container.querySelector('#adminDashboardMaintenanceStatus');
        const updateMaintenanceStatus = () => {
            const active = !!window.ShopMax99?.maintenance?.isActive?.();
            if (maintenanceStatus) {
                maintenanceStatus.innerHTML = active
                    ? '<i class="fa-solid fa-circle" style="color:#ffb4b4;"></i> MAINTENANCE ON'
                    : '<i class="fa-solid fa-circle" style="color:#9dffb0;"></i> SITE LIVE';
            }
            if (maintenanceBtn) {
                maintenanceBtn.innerHTML = active
                    ? '<i class="fa-solid fa-power-off"></i> Take Site Live'
                    : '<i class="fa-solid fa-screwdriver-wrench"></i> Manage Maintenance';
            }
        };
        if (maintenanceBtn) {
            maintenanceBtn.addEventListener('click', () => {
                if (window.ShopMax99?.maintenance?.openControl) {
                    window.ShopMax99.maintenance.openControl();
                    setTimeout(() => {
                        updateMaintenanceStatus();
                        if (typeof window.refreshMaintenanceControlUI === 'function') window.refreshMaintenanceControlUI();
                    }, 100);
                } else {
                    alert('Maintenance control is currently unavailable.');
                }
            });
        }
        updateMaintenanceStatus();

        container.querySelectorAll('[data-admin-dashboard-nav]').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.adminDashboardNav;
                if (typeof window.showAdminPage === "function") window.showAdminPage(page);
            });
        });
    }



    /* =========================================================
       ORDERS / CUSTOMERS / REPORTS — ADMIN INTELLIGENCE CENTER
       ========================================================= */

    function parseDate(value) {
        const d = value ? new Date(value) : new Date();
        return Number.isNaN(d.getTime()) ? new Date() : d;
    }

    function dateKey(value) {
        const d = parseDate(value);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    }

    function prettyDate(value) {
        if (!value) return "—";
        return parseDate(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    }

    function orderStatus(order) {
        return String(order?.status || order?.orderStatus || order?.deliveryStatus || "Placed").trim().toLowerCase();
    }

    function isTransitOrder(order) {
        if (!order || order.deliveryBlocked) return false;
        return ["placed", "pending", "confirmed", "packed", "shipped", "in transit", "out for delivery", "out_for_delivery", "processing", "payment pending"].includes(orderStatus(order));
    }

    function orderSellerCost(order) {
        if (Number.isFinite(Number(order?.sellerCost)) && Number(order.sellerCost) > 0) return Number(order.sellerCost);
        return (Array.isArray(order?.items) ? order.items : []).reduce((sum, item) => sum + Number(item?.sellerPrice || 0) * Math.max(1, Number(item?.quantity || 1)), 0);
    }

    function orderCourierCost(order) {
        const candidates = [order?.courierCost, order?.courierCharge, order?.shippingCost, order?.deliveryCost];
        for (const value of candidates) {
            const n = Number(value);
            if (Number.isFinite(n) && n >= 0) return n;
        }
        return 0;
    }

    function orderValue(order) {
        const n = Number(order?.orderValue ?? order?.total ?? order?.amount ?? order?.grandTotal ?? 0);
        return Number.isFinite(n) ? n : 0;
    }

    function orderProfit(order) {
        return orderValue(order) - orderSellerCost(order) - orderCourierCost(order);
    }

    function orderCustomerId(order) {
        return String(order?.customerId || order?.customer?.id || "").trim();
    }

    function orderCustomerEmail(order) {
        return String(order?.customerEmail || order?.customer?.email || "").trim().toLowerCase();
    }

    function orderCustomerMobile(order) {
        return String(order?.customerMobile || order?.mobile || order?.deliveryDetails?.phone || order?.customer?.mobile || "").replace(/\D/g, "");
    }

    function customerDirectory() {
        const usersRaw = getData(KEYS.users, []);
        const users = (Array.isArray(usersRaw) ? usersRaw : []).filter(u => !u.role || String(u.role).toLowerCase() === "customer");
        const current = (() => {
            try { return JSON.parse(localStorage.getItem("shopmax99_customer_account") || "null"); } catch { return null; }
        })();

        const directory = [...users];
        if (current?.id) {
            const i = directory.findIndex(u => String(u.id || u.customerId || "") === String(current.id));
            const record = { ...(i >= 0 ? directory[i] : {}), ...current, customerId: current.id, role: "customer" };
            if (i >= 0) directory[i] = record; else directory.unshift(record);
        }

        // Repair/normalize older records without changing their existing IDs.
        let changed = false;
        const normalized = directory.map((user, index) => {
            const copy = { ...user };
            if (!copy.id && copy.customerId) { copy.id = copy.customerId; changed = true; }
            if (!copy.id) { copy.id = `CUS-LEGACY-${String(index + 1).padStart(4, "0")}`; changed = true; }
            if (!copy.customerId) { copy.customerId = copy.id; changed = true; }
            if (!copy.role) { copy.role = "customer"; changed = true; }
            return copy;
        });
        if (changed || normalized.length !== users.length) saveData(KEYS.users, normalized);
        return normalized;
    }

    function customerMatches(user, query) {
        if (!query) return true;
        const q = query.toLowerCase().trim();
        return [
            user.id, user.customerId, user.name, user.email, user.mobile, user.phone,
            user.address, user.city, user.state, user.pincode
        ].some(value => String(value || "").toLowerCase().includes(q));
    }

    function customerOrderHistory(customer, orders) {
        const id = String(customer.id || customer.customerId || "");
        const email = String(customer.email || "").toLowerCase();
        const mobile = String(customer.mobile || customer.phone || "").replace(/\D/g, "");
        return orders.filter(order => {
            return (id && orderCustomerId(order) === id) ||
                (email && orderCustomerEmail(order) === email) ||
                (mobile && orderCustomerMobile(order) === mobile);
        });
    }

    function customerTransitOrders(customer, orders) {
        return customerOrderHistory(customer, orders).filter(isTransitOrder);
    }

    function renderOrders() {
        const container = findContainer("orders");
        if (!container) return;

        const orders = getData(KEYS.orders, []);
        const transit = orders.filter(isTransitOrder);
        const blocked = orders.filter(o => !!o.deliveryBlocked);
        const completed = orders.filter(o => ["delivered", "completed", "complete", "fulfilled", "success", "paid"].includes(orderStatus(o)));
        const totalValue = orders.reduce((sum, o) => sum + orderValue(o), 0);
        const totalProfit = orders.reduce((sum, o) => sum + orderProfit(o), 0);
        const states = {};
        transit.forEach(order => {
            const state = String(order?.deliveryDetails?.state || order?.destinationState || order?.state || "State not set").trim() || "State not set";
            states[state] = (states[state] || 0) + 1;
        });
        const stateRows = Object.entries(states).sort((a,b) => b[1]-a[1]);

        container.innerHTML = `
          <div class="admin-intel-shell">
            <div class="admin-intel-hero orders-hero">
              <div><span class="admin-eyebrow">LOGISTICS COMMAND</span><h1>Orders Control</h1><p>Transit monitoring, state-wise movement, order value and per-order profit — ek hi screen par.</p></div>
              <div class="admin-intel-hero-icon"><i class="fa-solid fa-truck-fast"></i></div>
            </div>

            <div class="admin-intel-stat-grid">
              <article><span>Total Orders</span><strong>${orders.length}</strong><small>All recorded orders</small></article>
              <article class="blue"><span>Currently Transit</span><strong>${transit.length}</strong><small>Active movement</small></article>
              <article class="amber"><span>Blocked Parcels</span><strong>${blocked.length}</strong><small>Admin hold active</small></article>
              <article class="green"><span>Delivered / Complete</span><strong>${completed.length}</strong><small>Completed movement</small></article>
              <article class="violet"><span>Order Value</span><strong>${money(totalValue)}</strong><small>Gross order value</small></article>
              <article class="pink"><span>Platform Profit</span><strong>${money(totalProfit)}</strong><small>Value − seller − courier</small></article>
            </div>

            <div class="admin-intel-panel">
              <div class="admin-panel-heading"><div><span class="admin-eyebrow">LIVE TRANSIT</span><h2>Currently in Transit — State Wise</h2></div><span class="admin-live-pill"><i class="fa-solid fa-circle"></i> LIVE DATA</span></div>
              ${stateRows.length ? `<div class="admin-state-grid">${stateRows.map(([state,count]) => `<div class="admin-state-card"><i class="fa-solid fa-location-dot"></i><div><strong>${escapeHTML(state)}</strong><span>${count} transit order${count===1?"":"s"}</span></div><b>${count}</b></div>`).join("")}</div>` : `<div class="admin-empty-panel"><i class="fa-solid fa-truck-ramp-box"></i><strong>No active transit orders</strong><span>New shipped / in-transit orders yahan automatically appear honge.</span></div>`}
            </div>

            <div class="admin-intel-panel">
              <div class="admin-panel-heading"><div><span class="admin-eyebrow">ORDER LEDGER</span><h2>Every Order</h2></div><input id="adminOrderSearch" class="admin-intel-search" placeholder="Search Order ID / Customer / Seller / State"></div>
              <div id="adminOrderRows" class="admin-order-list">
                ${renderAdminOrderRows(orders)}
              </div>
            </div>
          </div>`;

        const search = container.querySelector("#adminOrderSearch");
        search?.addEventListener("input", () => {
            const q = search.value.trim().toLowerCase();
            const filtered = orders.filter(order => [
                order.id, order.customerName, order.customerEmail, order.customerMobile,
                order.origin, order.destination, order.deliveryDetails?.state,
                ...(order.items || []).map(i => i.name), ...(order.items || []).map(i => i.sellerId),
                ...(order.items || []).map(i => i.sellerEmail), order.courierName
            ].some(v => String(v || "").toLowerCase().includes(q)));
            const rows = container.querySelector("#adminOrderRows");
            if (rows) rows.innerHTML = renderAdminOrderRows(filtered);
        });

        container.onclick = event => {
            const btn = event.target.closest("[data-order-block-toggle]");
            if (!btn) return;
            const id = btn.getAttribute("data-order-block-toggle");
            const list = getData(KEYS.orders, []);
            const order = list.find(o => String(o.id) === String(id));
            if (!order) return;
            order.deliveryBlocked = !order.deliveryBlocked;
            order.blockedAt = order.deliveryBlocked ? new Date().toISOString() : null;
            order.blockedBy = order.deliveryBlocked ? "admin" : null;
            saveData(KEYS.orders, list);
            notify(order.deliveryBlocked ? `Parcel ${id} blocked.` : `Parcel ${id} unblocked.`);
            renderOrders();
        };
    }

    function renderAdminOrderRows(orders) {
        if (!orders.length) return `<div class="admin-empty-panel"><i class="fa-solid fa-box-open"></i><strong>No matching orders</strong><span>Search query ke according koi order nahi mila.</span></div>`;
        return orders.map(order => {
            const value = orderValue(order);
            const sellerCost = orderSellerCost(order);
            const courierCost = orderCourierCost(order);
            const profit = value - sellerCost - courierCost;
            const status = orderStatus(order);
            const state = order?.deliveryDetails?.state || order?.destinationState || order?.state || "Not set";
            const destination = order?.destination || [order?.deliveryDetails?.address, order?.deliveryDetails?.city, state, order?.deliveryDetails?.pincode].filter(Boolean).join(", ") || "Not set";
            const origin = order?.origin || order?.warehouse || "Not set";
            const sellerNames = [...new Set((order.items || []).map(i => i.sellerName || i.shopName || i.sellerEmail || i.sellerId).filter(Boolean))];
            const sellerText = sellerNames.join(", ") || "Not recorded";
            const courier = order?.courierName || order?.courierPartner || "Not assigned";
            const transit = isTransitOrder(order);
            return `<article class="admin-order-card ${order.deliveryBlocked ? "blocked" : ""}">
              <div class="admin-order-head"><div><span class="admin-order-id">${escapeHTML(order.id || "-")}</span><h3>${escapeHTML(order.customerName || order.customerEmail || "Customer")}</h3><small>${prettyDate(order.date || order.createdAt)}</small></div><div class="admin-order-status ${order.deliveryBlocked ? "blocked" : transit ? "transit" : "complete"}">${order.deliveryBlocked ? "BLOCKED" : escapeHTML(String(order.status || "Placed"))}</div></div>
              <div class="admin-order-grid">
                <div><span>Customer</span><strong>${escapeHTML(order.customerName || "-")}</strong><small>${escapeHTML(order.customerMobile || order.deliveryDetails?.phone || "-")} · ${escapeHTML(order.customerEmail || "-")}</small></div>
                <div><span>Origin</span><strong>${escapeHTML(origin)}</strong><small>Dispatch point</small></div>
                <div><span>Destination</span><strong>${escapeHTML(destination)}</strong><small>State: ${escapeHTML(state)}</small></div>
                <div><span>Seller</span><strong>${escapeHTML(sellerText)}</strong><small>${(order.items || []).length} item(s)</small></div>
                <div><span>Courier</span><strong>${escapeHTML(courier)}</strong><small>Courier cost: ${money(courierCost)}</small></div>
                <div><span>Order Value</span><strong>${money(value)}</strong><small>Seller cost: ${money(sellerCost)}</small></div>
                <div class="profit"><span>Your Profit</span><strong>${money(profit)}</strong><small>Value − seller − courier</small></div>
                <div><span>Payment</span><strong>${escapeHTML(order.paymentMethod || "-")}</strong><small>${escapeHTML(order.paymentStatus || "-")}</small></div>
              </div>
              <div class="admin-order-actions"><span class="admin-order-route"><i class="fa-solid fa-route"></i> ${escapeHTML(origin)} → ${escapeHTML(destination)}</span>${transit || order.deliveryBlocked ? `<button type="button" class="${order.deliveryBlocked ? "secondary-btn" : "secondary-btn danger"}" data-order-block-toggle="${escapeHTML(order.id)}"><i class="fa-solid ${order.deliveryBlocked ? "fa-unlock" : "fa-hand"}"></i> ${order.deliveryBlocked ? "Unblock Parcel" : "Block Parcel"}</button>` : `<span class="admin-order-closed"><i class="fa-solid fa-circle-check"></i> Movement closed</span>`}</div>
            </article>`;
        }).join("");
    }

    function renderCustomers() {
        const container = findContainer("customers");
        if (!container) return;

        const users = customerDirectory();
        const orders = getData(KEYS.orders, []);
        const transitCount = orders.filter(isTransitOrder).length;
        const activeCustomers = users.filter(user => customerOrderHistory(user, orders).length > 0).length;

        container.innerHTML = `
          <div class="admin-intel-shell">
            <div class="admin-intel-hero customers-hero">
              <div><span class="admin-eyebrow">CUSTOMER 360</span><h1>Customers</h1><p>Har customer ka unique Customer ID, contact, address, complete order history aur live parcel control.</p></div>
              <div class="admin-intel-hero-icon"><i class="fa-solid fa-users-viewfinder"></i></div>
            </div>
            <div class="admin-intel-stat-grid">
              <article><span>Total Customer IDs</span><strong>${users.length}</strong><small>All registered customer records</small></article>
              <article class="blue"><span>Customers with Orders</span><strong>${activeCustomers}</strong><small>At least one order</small></article>
              <article class="amber"><span>Transit Parcels</span><strong>${transitCount}</strong><small>Across all customers</small></article>
              <article class="green"><span>Directory Status</span><strong>ACTIVE</strong><small>New verified accounts auto-added</small></article>
            </div>
            <div class="admin-intel-panel">
              <div class="admin-panel-heading"><div><span class="admin-eyebrow">CUSTOMER DIRECTORY</span><h2>Search Customer</h2></div><span class="admin-directory-count">${users.length} IDs</span></div>
              <div class="admin-customer-search"><i class="fa-solid fa-magnifying-glass"></i><input id="adminCustomerSearch" placeholder="Customer ID search karo — e.g. CUS_..." autocomplete="off"><button type="button" id="adminCustomerSearchClear" class="secondary-btn">Clear</button></div>
              <div id="adminCustomerResults" class="admin-customer-results">${renderCustomerCards(users, orders)}</div>
            </div>
          </div>`;

        const search = container.querySelector("#adminCustomerSearch");
        const results = container.querySelector("#adminCustomerResults");
        const update = () => {
            const filtered = users.filter(user => customerMatches(user, search?.value || ""));
            results.innerHTML = renderCustomerCards(filtered, orders);
        };
        search?.addEventListener("input", update);
        container.querySelector("#adminCustomerSearchClear")?.addEventListener("click", () => { search.value = ""; update(); search.focus(); });

        container.onclick = event => {
            const btn = event.target.closest("[data-customer-order-block]");
            if (!btn) return;
            const orderId = btn.getAttribute("data-customer-order-block");
            const list = getData(KEYS.orders, []);
            const order = list.find(o => String(o.id) === String(orderId));
            if (!order) return;
            order.deliveryBlocked = !order.deliveryBlocked;
            order.blockedAt = order.deliveryBlocked ? new Date().toISOString() : null;
            order.blockedBy = order.deliveryBlocked ? "admin" : null;
            saveData(KEYS.orders, list);
            notify(order.deliveryBlocked ? `Parcel ${orderId} blocked.` : `Parcel ${orderId} unblocked.`);
            const freshUsers = customerDirectory();
            results.innerHTML = renderCustomerCards(freshUsers.filter(user => customerMatches(user, search?.value || "")), getData(KEYS.orders, []));
        };
    }

    function renderCustomerCards(users, orders) {
        if (!users.length) return `<div class="admin-empty-panel"><i class="fa-solid fa-user-slash"></i><strong>No customer found</strong><span>Customer ID ya contact details se search karke dekhein.</span></div>`;
        return users.map(customer => {
            const history = customerOrderHistory(customer, orders);
            const transit = history.filter(isTransitOrder);
            const blocked = history.filter(o => !!o.deliveryBlocked);
            const address = [customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(", ") || "Address not added";
            return `<article class="admin-customer-card">
              <div class="admin-customer-head"><div class="admin-customer-avatar">${customer.profilePicture ? `<img src="${escapeHTML(customer.profilePicture)}" alt="">` : `<i class="fa-solid fa-user"></i>`}</div><div><span class="admin-customer-id">${escapeHTML(customer.id || customer.customerId)}</span><h3>${escapeHTML(customer.name || "Customer")}</h3><small>Joined ${prettyDate(customer.createdAt)}</small></div><div class="admin-customer-order-badges"><span>${history.length} Orders</span><span class="transit">${transit.length} Transit</span>${blocked.length ? `<span class="blocked">${blocked.length} Blocked</span>` : ""}</div></div>
              <div class="admin-customer-detail-grid">
                <div><span>Contact</span><strong>${escapeHTML(customer.mobile || customer.phone || "Not added")}</strong><small>${escapeHTML(customer.email || "Email not added")}</small></div>
                <div><span>Address</span><strong>${escapeHTML(address)}</strong><small>${escapeHTML(customer.gender || "")}${customer.dob ? ` · DOB ${escapeHTML(customer.dob)}` : ""}</small></div>
                <div><span>Customer ID</span><strong>${escapeHTML(customer.id || customer.customerId)}</strong><small>Unique account identifier</small></div>
                <div><span>Last Updated</span><strong>${prettyDate(customer.updatedAt || customer.createdAt)}</strong><small>Profile record</small></div>
              </div>
              <details class="admin-customer-history"><summary><i class="fa-solid fa-clock-rotate-left"></i> Full Orders History (${history.length})</summary>
                ${history.length ? history.map(order => {
                    const blockedNow = !!order.deliveryBlocked;
                    const transitNow = isTransitOrder(order) || blockedNow;
                    const destination = order.destination || [order.deliveryDetails?.address, order.deliveryDetails?.city, order.deliveryDetails?.state, order.deliveryDetails?.pincode].filter(Boolean).join(", ") || "Not set";
                    return `<div class="admin-customer-order-row"><div><strong>${escapeHTML(order.id || "-")}</strong><span>${prettyDate(order.date || order.createdAt)} · ${escapeHTML(order.status || "Placed")}</span></div><div><strong>${money(orderValue(order))}</strong><span>${escapeHTML(destination)}</span></div><div class="admin-customer-order-state ${blockedNow ? "blocked" : transitNow ? "transit" : "complete"}">${blockedNow ? "BLOCKED" : transitNow ? "IN TRANSIT" : "CLOSED"}</div>${transitNow ? `<button type="button" class="secondary-btn ${blockedNow ? "" : "danger"}" data-customer-order-block="${escapeHTML(order.id)}"><i class="fa-solid ${blockedNow ? "fa-unlock" : "fa-hand"}"></i> ${blockedNow ? "Unblock" : "Block Parcel"}</button>` : ""}</div>`;
                }).join("") : `<div class="admin-history-empty">No order history available for this customer.</div>`}
              </details>
            </article>`;
        }).join("");
    }

    function renderReports() {
        const container = findContainer("reports");
        if (!container) return;

        const sellers = getSellers();
        const products = getProducts();
        const orders = getData(KEYS.orders, []);
        const users = customerDirectory();
        const transactions = getData(KEYS.transactions, []);
        const revenue = orders.reduce((sum, order) => sum + orderValue(order), 0);
        const profit = orders.reduce((sum, order) => sum + orderProfit(order), 0);
        const transit = orders.filter(isTransitOrder).length;
        const delivered = orders.filter(o => ["delivered","completed","complete","fulfilled","success","paid"].includes(orderStatus(o))).length;
        const today = dateKey(new Date());
        const newCustomersToday = users.filter(u => dateKey(u.createdAt) === today).length;
        const newSellersToday = sellers.filter(s => dateKey(s.createdAt) === today).length;
        const ordersToday = orders.filter(o => dateKey(o.date || o.createdAt) === today).length;

        const days = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - i);
            const key = dateKey(d);
            days.push({ key, label: d.toLocaleDateString("en-IN", { day:"2-digit", month:"short" }), orders:0, customers:0, sellers:0 });
        }
        const dayMap = Object.fromEntries(days.map(d => [d.key, d]));
        orders.forEach(o => { const d=dayMap[dateKey(o.date||o.createdAt)]; if(d)d.orders++; });
        users.forEach(u => { const d=dayMap[dateKey(u.createdAt)]; if(d)d.customers++; });
        sellers.forEach(s => { const d=dayMap[dateKey(s.createdAt)]; if(d)d.sellers++; });
        const maxGraph = Math.max(1, ...days.flatMap(d => [d.orders,d.customers,d.sellers]));

        container.innerHTML = `
          <div class="admin-intel-shell">
            <div class="admin-intel-hero reports-hero"><div><span class="admin-eyebrow">BUSINESS ANALYTICS</span><h1>Reports</h1><p>Orders, customers, sellers, revenue aur platform profit ka visual command dashboard.</p></div><div class="admin-intel-hero-icon"><i class="fa-solid fa-chart-line"></i></div></div>
            <div class="admin-intel-stat-grid">
              <article><span>All-Time Orders</span><strong>${orders.length}</strong><small>Today: ${ordersToday}</small></article>
              <article class="blue"><span>Total Customers</span><strong>${users.length}</strong><small>New today: ${newCustomersToday}</small></article>
              <article class="amber"><span>Total Sellers</span><strong>${sellers.length}</strong><small>New today: ${newSellersToday}</small></article>
              <article class="green"><span>Transit</span><strong>${transit}</strong><small>Delivered: ${delivered}</small></article>
              <article class="violet"><span>Gross Order Value</span><strong>${money(revenue)}</strong><small>Across all orders</small></article>
              <article class="pink"><span>Estimated Platform Profit</span><strong>${money(profit)}</strong><small>Order value − seller − courier</small></article>
            </div>
            <div class="admin-report-grid">
              <section class="admin-intel-panel"><div class="admin-panel-heading"><div><span class="admin-eyebrow">14-DAY TREND</span><h2>Orders / Customers / Sellers</h2></div><span class="admin-directory-count">Daily</span></div><div class="admin-bar-chart">${days.map(d => `<div class="admin-bar-group" title="${d.label}: ${d.orders} orders, ${d.customers} customers, ${d.sellers} sellers"><div class="admin-bars"><i style="height:${Math.max(4,d.orders/maxGraph*100)}%" class="orders"></i><i style="height:${Math.max(4,d.customers/maxGraph*100)}%" class="customers"></i><i style="height:${Math.max(4,d.sellers/maxGraph*100)}%" class="sellers"></i></div><span>${escapeHTML(d.label)}</span></div>`).join("")}</div><div class="admin-chart-legend"><span><i class="orders"></i> Orders</span><span><i class="customers"></i> Customers</span><span><i class="sellers"></i> Sellers</span></div></section>
              <section class="admin-intel-panel"><div class="admin-panel-heading"><div><span class="admin-eyebrow">TODAY</span><h2>Daily Snapshot</h2></div></div><div class="admin-report-kpi-list"><div><span>New Orders</span><strong>${ordersToday}</strong></div><div><span>New Customer Accounts</span><strong>${newCustomersToday}</strong></div><div><span>New Seller Registrations</span><strong>${newSellersToday}</strong></div><div><span>Active Transit Parcels</span><strong>${transit}</strong></div><div><span>Transactions Recorded</span><strong>${transactions.length}</strong></div><div><span>Products in Catalogue</span><strong>${products.length}</strong></div></div></section>
            </div>
            <section class="admin-intel-panel"><div class="admin-panel-heading"><div><span class="admin-eyebrow">BUSINESS HEALTH</span><h2>Operational Breakdown</h2></div></div><div class="admin-report-health"><div><span>Delivered Rate</span><strong>${orders.length ? Math.round(delivered/orders.length*100) : 0}%</strong><small>${delivered} of ${orders.length} orders</small></div><div><span>Transit Share</span><strong>${orders.length ? Math.round(transit/orders.length*100) : 0}%</strong><small>${transit} currently moving</small></div><div><span>Average Order Value</span><strong>${money(orders.length ? revenue/orders.length : 0)}</strong><small>All recorded orders</small></div><div><span>Average Profit / Order</span><strong>${money(orders.length ? profit/orders.length : 0)}</strong><small>After seller + courier cost</small></div></div></section>
          </div>`;
    }

    /* =========================================================
       SETTINGS
       ========================================================= */

    function renderSettings() {
        const container = findContainer("settings");
        if (!container) return;

        const settings = getData(KEYS.settings, {});

        const defaults = {
            customerPrice: 99,
            maxSellerPrice: 70,
            deliveryFee: 0,
            lowStockAlertThreshold: 5,
            storeName: "ShopMax99",
            storeStatus: "open",
            supportEmail: "",
            supportPhone: "",
            codEnabled: true,
            upiEnabled: true,
            netBankingEnabled: true,
            cardEnabled: true
        };

        const cfg = { ...defaults, ...settings };
        const checked = value => value ? "checked" : "";

        container.innerHTML = `
            <h2>Settings</h2>
            <p style="color:#666;margin-top:-8px;margin-bottom:18px;">
                Store pricing, delivery, alerts, store information and payment options.
            </p>

            <form id="shopmax99AdminSettingsForm" style="max-width:760px;">

                <div style="background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:18px;margin-bottom:14px;">
                    <h3 style="margin:0 0 14px;">Pricing & Delivery</h3>

                    <label>Customer Price</label>
                    <input type="number" id="adminCustomerPrice" value="${escapeHTML(cfg.customerPrice)}" min="1" style="width:100%;padding:10px;margin:6px 0 14px;">

                    <label>Maximum Seller Price</label>
                    <input type="number" id="adminMaxSellerPrice" value="${escapeHTML(cfg.maxSellerPrice)}" min="1" max="70" style="width:100%;padding:10px;margin:6px 0 14px;">

                    <label>Delivery Fee</label>
                    <input type="number" id="adminDeliveryFee" value="${escapeHTML(cfg.deliveryFee)}" min="0" style="width:100%;padding:10px;margin:6px 0 14px;">

                    <label>Low Stock Alert Threshold</label>
                    <input type="number" id="adminLowStockThreshold" value="${escapeHTML(cfg.lowStockAlertThreshold)}" min="0" style="width:100%;padding:10px;margin:6px 0 0;">
                </div>

                <div style="background:linear-gradient(135deg,#20102f,#35155a);color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:20px;margin-bottom:14px;box-shadow:0 12px 30px rgba(58,18,91,.18);">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;">
                        <div>
                            <div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;opacity:.72;">Site Control</div>
                            <h3 style="margin:5px 0 7px;font-size:21px;">Site Under Maintenance</h3>
                            <p style="margin:0;opacity:.82;font-size:13px;line-height:1.55;">Customer aur Seller access temporarily band karke site ko maintenance mode mein daalein. Admin/Staff access available rahega.</p>
                        </div>
                        <button type="button" id="adminMaintenanceControlBtn" style="border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.1);color:#fff;border-radius:12px;padding:12px 16px;font-weight:800;cursor:pointer;white-space:nowrap;">
                            <i class="fa-solid fa-screwdriver-wrench"></i> Manage Maintenance
                        </button>
                    </div>
                    <div id="adminMaintenanceStatus" style="margin-top:14px;font-size:12px;font-weight:700;opacity:.9;"></div>
                </div>

                <div style="background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:18px;margin-bottom:14px;">
                    <h3 style="margin:0 0 14px;">Store Information</h3>

                    <label>Store Name</label>
                    <input type="text" id="adminStoreName" value="${escapeHTML(cfg.storeName)}" style="width:100%;padding:10px;margin:6px 0 14px;">

                    <label>Store Status</label>
                    <select id="adminStoreStatus" style="width:100%;padding:10px;margin:6px 0 14px;">
                        <option value="open" ${cfg.storeStatus === "open" ? "selected" : ""}>Open</option>
                        <option value="closed" ${cfg.storeStatus === "closed" ? "selected" : ""}>Closed</option>
                        <option value="maintenance" ${cfg.storeStatus === "maintenance" ? "selected" : ""}>Maintenance</option>
                    </select>

                    <label>Support Email</label>
                    <input type="email" id="adminSupportEmail" value="${escapeHTML(cfg.supportEmail)}" style="width:100%;padding:10px;margin:6px 0 14px;">

                    <label>Support Phone</label>
                    <input type="tel" id="adminSupportPhone" value="${escapeHTML(cfg.supportPhone)}" style="width:100%;padding:10px;margin:6px 0 0;">
                </div>

                <div style="background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:18px;margin-bottom:14px;">
                    <h3 style="margin:0 0 14px;">Payment Options</h3>

                    <label style="display:flex;align-items:center;gap:10px;margin:10px 0;cursor:pointer;">
                        <input type="checkbox" id="adminCODEnabled" ${checked(cfg.codEnabled)}>
                        <span>Cash on Delivery (COD)</span>
                    </label>

                    <label style="display:flex;align-items:center;gap:10px;margin:10px 0;cursor:pointer;">
                        <input type="checkbox" id="adminUPIEnabled" ${checked(cfg.upiEnabled)}>
                        <span>UPI</span>
                    </label>

                    <label style="display:flex;align-items:center;gap:10px;margin:10px 0;cursor:pointer;">
                        <input type="checkbox" id="adminNetBankingEnabled" ${checked(cfg.netBankingEnabled)}>
                        <span>Net Banking</span>
                    </label>

                    <label style="display:flex;align-items:center;gap:10px;margin:10px 0 0;cursor:pointer;">
                        <input type="checkbox" id="adminCardEnabled" ${checked(cfg.cardEnabled)}>
                        <span>Credit / Debit Card</span>
                    </label>
                </div>

                <button type="submit" style="padding:11px 18px;font-weight:700;">
                    Save Settings
                </button>
            </form>
        `;
        bindMaintenanceControl();
    }


    /* =========================================================
       TRANSACTIONS
       ========================================================= */

    function getTransactions() {
        return getData(KEYS.transactions, []);
    }

    function saveTransactions(items) {
        saveData(KEYS.transactions, items);
    }

    function transactionCategoryLabel(category) {
        const labels = {
            order: "Order",
            seller: "Seller",
            courier: "Courier Partner",
            customer: "Customer",
            platform: "Platform",
            payout: "Payout",
            charge: "Charge",
            other: "Other"
        };
        return labels[String(category || "other").toLowerCase()] || "Other";
    }

    function syncOrderTransactions() {
        const orders = getData(KEYS.orders, []);
        const sellers = getData(KEYS.sellers, []);
        const transactions = getTransactions();
        const existing = new Set(
            transactions.map(t => String(t.id || ""))
        );

        orders.forEach(order => {
            const orderId = String(order.id || "");
            if (!orderId) return;

            (order.items || []).forEach((item, index) => {
                const sellerEmail = String(item.sellerEmail || "").toLowerCase();
                if (!sellerEmail) return;

                const seller = sellers.find(
                    s => String(s.email || "").toLowerCase() === sellerEmail
                );
                const amount = Number(item.sellerPrice || 0) * Number(item.quantity || 1);
                const txId = `TX-ORDER-${orderId}-${index}-${sellerEmail}`;
                if (existing.has(txId)) return;

                transactions.push({
                    id: txId,
                    category: "order",
                    type: "credit",
                    amount,
                    partyId: seller?.id || sellerEmail,
                    partyName: seller?.shopName || seller?.name || sellerEmail,
                    sellerId: seller?.id || "",
                    sellerEmail,
                    reference: orderId,
                    description: `Seller earning from ${orderId} - ${item.name || "Product"}`,
                    status: "completed",
                    createdAt: order.date || new Date().toISOString()
                });
                existing.add(txId);
            });
        });

        saveTransactions(transactions);
        return transactions;
    }

    function renderTransactions() {
        const container = findAdminSection("transactions");
        if (!container) return;

        const transactions = syncOrderTransactions().sort(
            (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );

        const categories = ["all", "order", "seller", "courier", "customer", "platform", "payout", "charge", "other"];
        const rows = transactions.length ? transactions.map(tx => {
            const credit = String(tx.type).toLowerCase() === "credit";
            return `
                <tr>
                    <td>${escapeHTML(new Date(tx.createdAt || Date.now()).toLocaleString())}</td>
                    <td><strong>${escapeHTML(transactionCategoryLabel(tx.category))}</strong></td>
                    <td>${escapeHTML(tx.partyName || tx.sellerEmail || "-")}</td>
                    <td>${escapeHTML(tx.reference || tx.orderId || "-")}</td>
                    <td style="color:${credit ? "#138a3d" : "#c62828"};font-weight:700;">${credit ? "+" : "-"}${money(tx.amount)}</td>
                    <td>${escapeHTML(tx.description || "-")}</td>
                    <td>${escapeHTML(tx.status || "completed")}</td>
                </tr>`;
        }).join("") : `<tr><td colspan="7" style="text-align:center;padding:35px;color:#777;">No transactions yet.</td></tr>`;

        const credits = transactions.filter(t => t.type === "credit").reduce((s,t)=>s+Number(t.amount||0),0);
        const debits = transactions.filter(t => t.type === "debit").reduce((s,t)=>s+Number(t.amount||0),0);

        container.innerHTML = `
            <div class="admin-card" style="padding:20px;">
                <h2 style="margin-top:0;">Transactions</h2>
                <p style="color:#666;">All platform financial transactions, updated from the same transaction ledger.</p>
                <div style="display:flex;gap:12px;flex-wrap:wrap;margin:18px 0;">
                    <div style="padding:14px 18px;background:#eefaf2;border-radius:10px;"><small>Total Credit</small><strong style="display:block;color:#138a3d;font-size:20px;">${money(credits)}</strong></div>
                    <div style="padding:14px 18px;background:#fff0f0;border-radius:10px;"><small>Total Debit</small><strong style="display:block;color:#c62828;font-size:20px;">${money(debits)}</strong></div>
                    <div style="padding:14px 18px;background:#f5f3ff;border-radius:10px;"><small>Transactions</small><strong style="display:block;font-size:20px;">${transactions.length}</strong></div>
                </div>
                <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:15px;">
                    ${categories.map(c => `<button type="button" class="transaction-filter" data-tx-filter="${c}" style="padding:7px 11px;border:1px solid #ddd;border-radius:8px;background:${c==='all'?'#6d28d9':'#fff'};color:${c==='all'?'#fff':'#333'};cursor:pointer;">${c==='all'?'All':transactionCategoryLabel(c)}</button>`).join("")}
                </div>
                <div style="overflow:auto;">
                    <table style="width:100%;border-collapse:collapse;min-width:900px;">
                        <thead><tr><th style="text-align:left;padding:10px;border-bottom:1px solid #ddd;">Date</th><th style="text-align:left;padding:10px;border-bottom:1px solid #ddd;">Category</th><th style="text-align:left;padding:10px;border-bottom:1px solid #ddd;">Party</th><th style="text-align:left;padding:10px;border-bottom:1px solid #ddd;">Reference</th><th style="text-align:left;padding:10px;border-bottom:1px solid #ddd;">Amount</th><th style="text-align:left;padding:10px;border-bottom:1px solid #ddd;">Description</th><th style="text-align:left;padding:10px;border-bottom:1px solid #ddd;">Status</th></tr></thead>
                        <tbody id="adminTransactionRows">${rows}</tbody>
                    </table>
                </div>
            </div>`;

        container.querySelectorAll("[data-tx-filter]").forEach(btn => {
            btn.addEventListener("click", () => {
                const category = btn.dataset.txFilter;
                container.querySelectorAll("[data-tx-filter]").forEach(b => {
                    const active = b.dataset.txFilter === category;
                    b.style.background = active ? "#6d28d9" : "#fff";
                    b.style.color = active ? "#fff" : "#333";
                });
                container.querySelectorAll("#adminTransactionRows tr").forEach(row => {
                    if (!row.dataset.category) return;
                    row.style.display = category === "all" || row.dataset.category === category ? "" : "none";
                });
                // rows are regenerated below with category metadata
                const allRows = transactions.map(tx => {
                    const credit = String(tx.type).toLowerCase() === "credit";
                    return `<tr data-category="${escapeHTML(tx.category || "other")}"><td>${escapeHTML(new Date(tx.createdAt || Date.now()).toLocaleString())}</td><td><strong>${escapeHTML(transactionCategoryLabel(tx.category))}</strong></td><td>${escapeHTML(tx.partyName || tx.sellerEmail || "-")}</td><td>${escapeHTML(tx.reference || tx.orderId || "-")}</td><td style="color:${credit ? "#138a3d" : "#c62828"};font-weight:700;">${credit ? "+" : "-"}${money(tx.amount)}</td><td>${escapeHTML(tx.description || "-")}</td><td>${escapeHTML(tx.status || "completed")}</td></tr>`;
                }).join("");
                const body = container.querySelector("#adminTransactionRows");
                if (body) body.innerHTML = allRows || `<tr><td colspan="7">No transactions yet.</td></tr>`;
                container.querySelectorAll("#adminTransactionRows tr").forEach(row => {
                    row.style.display = category === "all" || row.dataset.category === category ? "" : "none";
                });
            });
        });
    }


    /* =========================================================
       SELLER PAYMENTS — completed-order due ledger
       ========================================================= */
    function sellerOrderStatusIsComplete(status) {
        return /^(completed|complete|delivered|fulfilled|order completed|delivered successfully)$/i.test(String(status || "").trim());
    }

    function sellerOrderLines(seller) {
        const email = String(seller.email || "").toLowerCase();
        const sellerId = String(seller.id || "");
        const rows = [];
        getData(KEYS.orders, []).forEach(order => {
            if (!sellerOrderStatusIsComplete(order.status || order.orderStatus || order.deliveryStatus)) return;
            (Array.isArray(order.items) ? order.items : []).forEach((item, index) => {
                const matches = (sellerId && String(item.sellerId || "") === sellerId) ||
                    (email && String(item.sellerEmail || "").toLowerCase() === email);
                if (!matches) return;
                const amount = Math.max(0, Number(item.sellerPrice ?? item.priceToSeller ?? item.sellerAmount ?? 0)) * Math.max(1, Number(item.quantity || 1));
                rows.push({ orderId: order.id || order.orderId || "-", date: order.date || order.createdAt || "", product: item.name || item.productName || "Product", quantity: Math.max(1, Number(item.quantity || 1)), amount, status: order.status || order.orderStatus || order.deliveryStatus || "Completed", lineKey: `${order.id || order.orderId || "order"}-${index}` });
            });
        });
        return rows;
    }

    function sellerPaymentSummary(seller) {
        const email = String(seller.email || "").toLowerCase();
        const id = String(seller.id || "");
        const orderRows = sellerOrderLines(seller);
        const earned = orderRows.reduce((sum, row) => sum + row.amount, 0);
        const ledger = getData(KEYS.transactions, []).filter(tx =>
            (String(tx.sellerId || "") === id || (email && String(tx.sellerEmail || "").toLowerCase() === email)) &&
            (tx.category === "seller_payout" || tx.category === "payout") && String(tx.type || "").toLowerCase() === "debit"
        );
        const paid = ledger.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
        return { orderRows, earned, paid, due: Math.max(0, earned - paid), ledger };
    }

    function renderSellerPayments() {
        const container = findAdminSection("seller-payments");
        if (!container) return;
        const sellers = getSellers();
        const summaries = sellers.map(seller => ({ seller, ...sellerPaymentSummary(seller) }));
        const totalDue = summaries.reduce((sum, item) => sum + item.due, 0);
        const totalPaid = summaries.reduce((sum, item) => sum + item.paid, 0);
        const totalEarned = summaries.reduce((sum, item) => sum + item.earned, 0);
        container.innerHTML = `<div class="admin-finance-page"><div class="admin-page-hero"><div><span class="admin-eyebrow">SELLER SETTLEMENTS</span><h1>Seller Payments</h1><p>Completed orders se due auto-calculate hota hai. Payment yahan manually record karein.</p></div><div class="admin-hero-icon"><i class="fa-solid fa-wallet"></i></div></div><div class="admin-finance-stats"><article><span>Total Seller Earnings</span><strong>${money(totalEarned)}</strong></article><article><span>Already Paid</span><strong>${money(totalPaid)}</strong></article><article class="due"><span>Total Due</span><strong>${money(totalDue)}</strong></article><article><span>Registered Sellers</span><strong>${sellers.length}</strong></article></div><div class="admin-finance-toolbar"><input id="sellerPaymentSearch" placeholder="Search seller name, shop, email or ID"><span>Due = completed order earnings − recorded payouts</span></div><div id="sellerPaymentDirectory" class="seller-payment-directory">${summaries.length ? summaries.map(({seller,earned,paid,due,orderRows}) => `<article class="seller-payment-card"><div class="seller-payment-avatar"><i class="fa-solid fa-store"></i></div><div class="seller-payment-main"><strong>${escapeHTML(seller.shopName || seller.fullName || seller.email || "Seller")}</strong><span>${escapeHTML(seller.email || "-")} · ID ${escapeHTML(seller.id || "-")}</span><div class="seller-payment-mini"><span>${orderRows.length} completed order item(s)</span><span>Earned ${money(earned)}</span><span>Paid ${money(paid)}</span></div></div><div class="seller-payment-due"><small>Amount Due</small><strong>${money(due)}</strong><button type="button" class="primary-btn small" data-seller-payment-open="${escapeHTML(seller.id)}">View & Pay</button></div></article>`).join("") : `<div class="support-empty">No registered sellers found.</div>`}</div></div>`;
        const search = container.querySelector("#sellerPaymentSearch");
        search?.addEventListener("input", () => {
            const q = search.value.trim().toLowerCase();
            container.querySelectorAll(".seller-payment-card").forEach(card => card.style.display = card.textContent.toLowerCase().includes(q) ? "" : "none");
        });
        container.querySelectorAll("[data-seller-payment-open]").forEach(button => button.addEventListener("click", () => openSellerPaymentModal(button.dataset.sellerPaymentOpen)));
    }

    function openSellerPaymentModal(sellerId) {
        const seller = getSellers().find(item => String(item.id) === String(sellerId));
        if (!seller) return;
        const summary = sellerPaymentSummary(seller);
        const modal = document.createElement("div");
        modal.className = "seller-payment-modal-overlay";
        modal.innerHTML = `<section class="seller-payment-modal"><header><div><span class="admin-eyebrow">SELLER SETTLEMENT</span><h2>${escapeHTML(seller.shopName || seller.fullName || seller.email || "Seller")}</h2><p>${escapeHTML(seller.email || "-")} · ${escapeHTML(seller.id || "-")}</p></div><button type="button" class="seller-payment-close" aria-label="Close">×</button></header><div class="seller-payment-modal-stats"><div><span>Completed-order earnings</span><strong>${money(summary.earned)}</strong></div><div><span>Already paid</span><strong>${money(summary.paid)}</strong></div><div><span>Due now</span><strong>${money(summary.due)}</strong></div></div><h3>Completed Orders (${summary.orderRows.length})</h3><div class="seller-payment-order-list">${summary.orderRows.length ? summary.orderRows.map(row => `<div><span><b>${escapeHTML(row.product)}</b><small>Order ${escapeHTML(row.orderId)} · Qty ${row.quantity} · ${escapeHTML(row.status)}</small></span><strong>${money(row.amount)}</strong></div>`).join("") : `<p class="support-empty">No completed orders found for this seller.</p>`}</div><form id="sellerSettlementForm"><label>Pay amount (₹)<input name="amount" type="number" min="1" max="${Math.floor(summary.due)}" step="1" value="${Math.floor(summary.due)}" ${summary.due < 1 ? "disabled" : "required"}></label><label>Payment reference<input name="reference" required placeholder="BANK-TRANSFER-001" ${summary.due < 1 ? "disabled" : ""}></label><label>Note (optional)<input name="note" placeholder="Settlement note" ${summary.due < 1 ? "disabled" : ""}></label><button class="primary-btn" type="submit" ${summary.due < 1 ? "disabled" : ""}>Confirm Seller Payment</button>${summary.due < 1 ? `<p class="seller-payment-paid-note">No outstanding due for this seller.</p>` : ""}</form></section>`;
        document.body.appendChild(modal);
        const close = () => modal.remove();
        modal.querySelector(".seller-payment-close")?.addEventListener("click", close);
        modal.addEventListener("click", event => { if (event.target === modal) close(); });
        modal.querySelector("#sellerSettlementForm")?.addEventListener("submit", event => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const amount = Number(data.get("amount"));
            const fresh = sellerPaymentSummary(seller);
            if (!Number.isFinite(amount) || amount <= 0 || amount > fresh.due) { notify(`Payment ₹1 se ₹${Math.floor(fresh.due)} ke beech honi chahiye.`); return; }
            const transactions = getData(KEYS.transactions, []);
            transactions.unshift({ id: makeId("SELLER-PAY"), category: "seller_payout", type: "debit", amount, sellerId: seller.id || "", sellerEmail: String(seller.email || "").toLowerCase(), partyId: seller.id || "", partyName: seller.shopName || seller.fullName || seller.email || "Seller", partyCategory: "Sellers", partyUsername: seller.email || seller.phone || "", reference: String(data.get("reference") || "").trim(), description: String(data.get("note") || "Seller settlement for completed orders"), status: "completed", createdAt: new Date().toISOString() });
            saveData(KEYS.transactions, transactions);
            notify(`Seller payment ${money(amount)} recorded. Seller Earnings ledger updated.`);
            close();
            renderSellerPayments();
        });
    }

    /* =========================================================
       RENDER SECTION
       ========================================================= */

    function renderAdminSection(section) {
        switch (normalizeSection(section)) {

            case "dashboard":
                renderDashboard();
                break;

            case "seller-accounts":
            case "pending-seller-approval":
            case "all-sellers":
            case "blocked-held-sellers":
                renderSellers();
                break;

            case "all-products":
            case "pending-products":
            case "approved-products":
            case "rejected-products":
            case "product-edit":
                renderProducts();
                break;

            case "orders":
                renderOrders();
                break;

            case "customers":
                renderCustomers();
                break;

            case "reports":
                renderReports();
                break;

            case "courier-partners":
                if (typeof window.renderCourierPartners === "function") window.renderCourierPartners();
                break;

            case "transactions":
                renderTransactions();
                break;

            case "seller-payments":
                renderSellerPayments();
                break;

            case "bank-account":
                if (typeof window.renderAdminBankAccount === "function") {
                    window.renderAdminBankAccount();
                }
                break;

            case "support-staff":
                if (typeof window.renderAdminSupportStaff === "function") {
                    window.renderAdminSupportStaff();
                }
                break;

            case "pay-to-staff":
                if (typeof window.renderAdminPayToStaff === "function") {
                    window.renderAdminPayToStaff();
                }
                break;

            case "support-requests":
                if (typeof window.renderAdminSupportRequests === "function") {
                    window.renderAdminSupportRequests();
                }
                break;

            case "support-audit":
                if (typeof window.renderAdminSupportAudit === "function") {
                    window.renderAdminSupportAudit();
                }
                break;

            case "settings":
                renderSettings();
                break;
        }
    }

    function renderAllAdminSections() {
        renderDashboard();
        renderSellers();
        renderProducts();
        renderOrders();
        renderCustomers();
        renderReports();
        if (typeof window.renderCourierPartners === "function") window.renderCourierPartners();
        renderTransactions();
        renderSellerPayments();
        renderSettings();
        if (typeof window.renderAdminBankAccount === "function") window.renderAdminBankAccount();
        if (typeof window.renderAdminSupportStaff === "function") window.renderAdminSupportStaff();
        if (typeof window.renderAdminSupportRequests === "function") window.renderAdminSupportRequests();
        if (typeof window.renderAdminSupportAudit === "function") window.renderAdminSupportAudit();
        if (typeof window.renderAdminPayToStaff === "function") window.renderAdminPayToStaff();
    }


    /* =========================================================
       ADMIN LOGOUT
       ========================================================= */

    function adminLogout() {
        localStorage.removeItem("shopmax99_admin_session");

        notify("Admin logout ho gaya.");

       if (typeof window.ShopMax99?.showRole === "function") {
    window.ShopMax99.showRole("customer");
}

        if (typeof window.showCustomerSection === "function") {
            window.showCustomerSection("home");
        }
    }

    window.adminLogout = adminLogout;
    window.initAdminCenter = initAdmin;
    window.showAdminPage = showAdminSection;


    /* =========================================================
       CLICK HANDLER
       ========================================================= */

    function handleAdminClick(event) {

        const button = event.target.closest(
            "[data-admin-action]"
        );

        if (!button) return;

        const action = button.dataset.adminAction;
        const id = button.dataset.id;

        /*
         * Navigation actions
         */
        if (sectionAliases[action]) {
            event.preventDefault();
            showAdminSection(action);
            return;
        }

        switch (action) {

            case "approve-seller":
                event.preventDefault();
                approveSeller(id);
                break;

            case "reject-seller":
                event.preventDefault();
                rejectSeller(id);
                break;

            case "block-seller":
                event.preventDefault();
                blockSeller(id);
                break;

            case "unblock-seller":
                event.preventDefault();
                unblockSeller(id);
                break;

            case "delete-seller":
                event.preventDefault();
                deleteSeller(id);
                break;

            case "approve-product":
                event.preventDefault();
                approveProduct(id);
                break;

            case "reject-product":
                event.preventDefault();
                rejectProduct(id);
                break;

            case "edit-product":
                event.preventDefault();
                editProduct(id);
                break;

            case "delete-product":
                event.preventDefault();
                deleteProduct(id);
                break;

            case "admin-logout":
                event.preventDefault();
                adminLogout();
                break;
        }
    }


    function refreshMaintenanceControlUI() {
        const status = document.getElementById("adminMaintenanceStatus");
        if (!status) return;
        const active = !!window.ShopMax99?.maintenance?.isActive?.();
        status.innerHTML = active
            ? '<i class="fa-solid fa-circle" style="color:#ffb4b4;"></i> Maintenance mode is <strong>ON</strong> — Customer/Seller access is disabled.'
            : '<i class="fa-solid fa-circle" style="color:#9dffb0;"></i> Site is <strong>LIVE</strong> — Customer/Seller access is enabled.';
    }

    function bindMaintenanceControl() {
        const button = document.getElementById("adminMaintenanceControlBtn");
        if (!button || button.dataset.bound === "1") return;
        button.dataset.bound = "1";
        button.addEventListener("click", function () {
            if (window.ShopMax99?.maintenance?.openControl) {
                window.ShopMax99.maintenance.openControl();
                setTimeout(refreshMaintenanceControlUI, 80);
            } else {
                alert("Maintenance control is currently unavailable.");
            }
        });
        refreshMaintenanceControlUI();
    }


    /* =========================================================
       FORM HANDLER
       ========================================================= */

    function handleFormSubmit(event) {

        if (event.target.id !== "shopmax99AdminSettingsForm") {
            return;
        }

        event.preventDefault();

        const customerPrice =
            Number(
                document.getElementById("adminCustomerPrice")?.value
            );

        const maxSellerPrice =
            Number(
                document.getElementById("adminMaxSellerPrice")?.value
            );

        if (!customerPrice || customerPrice < 1) {
            alert("Customer price valid hona chahiye.");
            return;
        }

        if (!maxSellerPrice || maxSellerPrice > 70) {
            alert("Maximum seller price ₹70 se zyada nahi ho sakta.");
            return;
        }

        const deliveryFee = Number(document.getElementById("adminDeliveryFee")?.value);
        const lowStockAlertThreshold = Number(document.getElementById("adminLowStockThreshold")?.value);
        const storeName = String(document.getElementById("adminStoreName")?.value || "ShopMax99").trim();
        const storeStatus = String(document.getElementById("adminStoreStatus")?.value || "open");
        const supportEmail = String(document.getElementById("adminSupportEmail")?.value || "").trim();
        const supportPhone = String(document.getElementById("adminSupportPhone")?.value || "").trim();

        if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
            alert("Delivery fee valid hona chahiye.");
            return;
        }

        if (!Number.isFinite(lowStockAlertThreshold) || lowStockAlertThreshold < 0) {
            alert("Low stock threshold valid hona chahiye.");
            return;
        }

        saveData(KEYS.settings, {
            customerPrice,
            maxSellerPrice,
            deliveryFee,
            lowStockAlertThreshold,
            storeName: storeName || "ShopMax99",
            storeStatus,
            supportEmail,
            supportPhone,
            codEnabled: !!document.getElementById("adminCODEnabled")?.checked,
            upiEnabled: !!document.getElementById("adminUPIEnabled")?.checked,
            netBankingEnabled: !!document.getElementById("adminNetBankingEnabled")?.checked,
            cardEnabled: !!document.getElementById("adminCardEnabled")?.checked
        });

        notify("Settings saved successfully.");
    }


    /* =========================================================
       GENERIC ADMIN NAVIGATION
       ========================================================= */

    function handleGenericAdminNavigation(event) {

        const element = event.target.closest(
            "[data-admin-section-link]"
        );

        if (!element) return;

        const section =
            element.dataset.adminSectionLink;

        if (!section) return;

        event.preventDefault();

        showAdminSection(section);
    }


    /* =========================================================
       INITIALIZE
       ========================================================= */

    function buildAdminWorkspace() {
        const pages = document.getElementById("adminPages");
        if (!pages || pages.dataset.built === "1") return;

        const names = [
            "dashboard", "seller-accounts", "pending-seller-approval", "all-sellers",
            "blocked-held-sellers", "all-products", "pending-products", "approved-products",
            "rejected-products", "product-edit", "orders", "customers", "reports",
            "transactions", "bank-account", "settings", "support-staff",
            "pay-to-staff", "support-requests", "support-audit", "seller-payments"
        ];

        pages.innerHTML = names.map(name =>
            `<section class="admin-section" data-admin-section="${name}" data-admin-content="${name}" style="display:none"></section>`
        ).join("");
        pages.dataset.built = "1";
    }

    function initAdmin() {

        if (window.__shopmax99AdminInitialized) {
            return;
        }

        window.__shopmax99AdminInitialized = true;
        buildAdminWorkspace();

        document.addEventListener(
            "click",
            handleAdminClick
        );

        document.addEventListener(
            "click",
            handleGenericAdminNavigation
        );

        document.addEventListener(
            "submit",
            handleFormSubmit
        );

       

        renderAllAdminSections();
    }


    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initAdmin
        );
    } else {
        initAdmin();
    }

})();