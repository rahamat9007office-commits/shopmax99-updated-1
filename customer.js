/* =========================================================
   SHOPMAX99 - CUSTOMER.JS
   Products / Categories / Wishlist / Cart / Orders
========================================================= */

(function () {
    "use strict";

    const STORAGE = window.ShopMax99.storage.keys;

    const $ = selector =>
        document.querySelector(selector);

    const $$ = selector =>
        [...document.querySelectorAll(selector)];


    /* =====================================================
       DEMO PRODUCTS
    ====================================================== */

    const DEFAULT_PRODUCTS = [

        {
            id: "P001",
            name: "Premium Casual T-Shirt",
            category: "men",
            price: 99,
            sellerPrice: 65,
            rating: 4.5,
            image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=700&q=80",
            description: "Comfortable casual t-shirt for everyday wear."
        },

        {
            id: "P002",
            name: "Women's Stylish Top",
            category: "women",
            price: 99,
            sellerPrice: 68,
            rating: 4.4,
            image: "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=700&q=80",
            description: "Modern stylish top designed for everyday comfort."
        },

        {
            id: "P003",
            name: "Kids Casual Hoodie",
            category: "kids",
            price: 99,
            sellerPrice: 62,
            rating: 4.6,
            image: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=700&q=80",
            description: "Soft and comfortable hoodie for kids."
        },

        {
            id: "P004",
            name: "Decorative Table Lamp",
            category: "home",
            price: 99,
            sellerPrice: 70,
            rating: 4.3,
            image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=700&q=80",
            description: "Elegant decorative lamp for your living space."
        },

        {
            id: "P005",
            name: "Beauty Care Set",
            category: "beauty",
            price: 99,
            sellerPrice: 66,
            rating: 4.5,
            image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=700&q=80",
            description: "Everyday beauty and personal care essentials."
        },

        {
            id: "P006",
            name: "Wireless Mobile Earbuds",
            category: "mobile",
            price: 99,
            sellerPrice: 69,
            rating: 4.2,
            image: "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=700&q=80",
            description: "Compact wireless earbuds for everyday listening."
        },

        {
            id: "P007",
            name: "Resistance Workout Bands",
            category: "fitness",
            price: 99,
            sellerPrice: 55,
            rating: 4.7,
            image: "https://images.unsplash.com/photo-1598289431512-b97b0917affc?auto=format&fit=crop&w=700&q=80",
            description: "Resistance bands for home workouts and training."
        },

        {
            id: "P008",
            name: "Classic Men's Wallet",
            category: "men",
            price: 99,
            sellerPrice: 58,
            rating: 4.3,
            image: "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=700&q=80",
            description: "Compact and stylish everyday wallet."
        }

    ];

    const PRICE_CATEGORIES = [99,199,299,399,499,599,699,799,899,999];
    const PRICE_CATEGORY_LABELS = Object.fromEntries(PRICE_CATEGORIES.map(price => [`price_${price}`, `₹${price}`]));
    PRICE_CATEGORY_LABELS.price_above_1000 = "Above ₹1000";

    const PRODUCT_CATEGORIES = ["men","women","kids","home","beauty","mobile","fitness"];
    const PRICE_SAMPLE_IMAGES = [
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=700&q=80",
        "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=700&q=80",
        "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=700&q=80",
        "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=700&q=80",
        "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=700&q=80",
        "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=700&q=80",
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=80"
    ];
    const PRICING_SAMPLE_PRODUCTS = PRICE_CATEGORIES.flatMap((price,index)=>[
        { id:`PRICE-${price}-A`, name:`ShopMax99 Value Pick ${price} A`, category:PRODUCT_CATEGORIES[(index*2)%PRODUCT_CATEGORIES.length], productCategory:PRODUCT_CATEGORIES[(index*2)%PRODUCT_CATEGORIES.length], pricingCategoryId:`price_${price}`, pricingCategory:`₹${price}`, price, customerPrice:price, sellerPrice:Math.max(1,price-Math.max(29,price*.12)), rating:4.5, image:PRICE_SAMPLE_IMAGES[index%PRICE_SAMPLE_IMAGES.length], description:`Featured product in the ₹${price} ShopMax99 category.` },
        { id:`PRICE-${price}-B`, name:`ShopMax99 Value Pick ${price} B`, category:PRODUCT_CATEGORIES[(index*2+1)%PRODUCT_CATEGORIES.length], productCategory:PRODUCT_CATEGORIES[(index*2+1)%PRODUCT_CATEGORIES.length], pricingCategoryId:`price_${price}`, pricingCategory:`₹${price}`, price, customerPrice:price, sellerPrice:Math.max(1,price-Math.max(29,price*.12)), rating:4.4, image:PRICE_SAMPLE_IMAGES[(index+3)%PRICE_SAMPLE_IMAGES.length], description:`Popular choice from the ₹${price} ShopMax99 category.` }
    ]);
    PRICING_SAMPLE_PRODUCTS.push(
        { id:"PRICE-1000-A", name:"ShopMax99 Premium Above 1000", category:"mobile", productCategory:"mobile", pricingCategoryId:"price_above_1000", pricingCategory:"Above ₹1000", price:1299, customerPrice:1299, sellerPrice:1100, rating:4.7, image:"https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=80", description:"Premium product above the ₹1000 category threshold." },
        { id:"PRICE-1000-B", name:"ShopMax99 Premium Above 1000 B", category:"fitness", productCategory:"fitness", pricingCategoryId:"price_above_1000", pricingCategory:"Above ₹1000", price:1599, customerPrice:1599, sellerPrice:1400, rating:4.6, image:"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=80", description:"Premium selection from the Above ₹1000 category." }
    );
    DEFAULT_PRODUCTS.push(...PRICING_SAMPLE_PRODUCTS);
    DEFAULT_PRODUCTS.push(
        { id:"P009", name:"Men's Casual Shirt", category:"men", productCategory:"men", price:199, customerPrice:199, sellerPrice:160, rating:4.5, image:"https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=700&q=80", description:"Smart casual shirt for everyday wear." },
        { id:"P010", name:"Women's Everyday Handbag", category:"women", productCategory:"women", price:299, customerPrice:299, sellerPrice:250, rating:4.6, image:"https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=700&q=80", description:"Practical handbag with a clean everyday design." },
        { id:"P011", name:"Kids School Backpack", category:"kids", productCategory:"kids", price:199, customerPrice:199, sellerPrice:160, rating:4.5, image:"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=80", description:"Lightweight backpack for school and daily use." },
        { id:"P012", name:"Home Storage Basket", category:"home", productCategory:"home", price:399, customerPrice:399, sellerPrice:320, rating:4.4, image:"https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=700&q=80", description:"Neat storage solution for home organization." },
        { id:"P013", name:"Fitness Water Bottle", category:"fitness", productCategory:"fitness", price:299, customerPrice:299, sellerPrice:250, rating:4.6, image:"https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=700&q=80", description:"Reusable bottle for workouts and everyday hydration." }
    );


    /* =====================================================
       INITIAL PRODUCT DATA
    ====================================================== */

    function initializeProducts() {

        const existing =
            window.ShopMax99.storage.get(
                STORAGE.products,
                null
            );

        if (!existing || !Array.isArray(existing)) {
            window.ShopMax99.storage.set(STORAGE.products, DEFAULT_PRODUCTS);
            return DEFAULT_PRODUCTS;
        }

        let changed = false;
        const migrated = existing.map((item, index) => {
            const selling = Number(item.customerPrice ?? item.price);
            if (!Number.isFinite(selling) || selling <= 0) return item;
            const pricingCategory = window.ShopMax99.pricing?.getCategory?.(selling) || { id: selling <= 99 ? "price_99" : "price_above_1000", label: selling <= 99 ? "₹99" : "Above ₹1000" };
            const legacyPriceCategory = /^price_\d+$/.test(String(item.category || "")) || String(item.category || "") === "price_above_1000";
            if (legacyPriceCategory && !item.productCategory) {
                const productCategory = PRODUCT_CATEGORIES[index % PRODUCT_CATEGORIES.length];
                changed = true;
                return { ...item, category: productCategory, productCategory, pricingCategoryId: pricingCategory.id, pricingCategory: pricingCategory.label, customerPrice: selling, price: selling };
            }
            if (item.pricingCategoryId !== pricingCategory.id || item.pricingCategory !== pricingCategory.label || item.customerPrice !== selling || item.price !== selling) {
                changed = true;
                return { ...item, pricingCategoryId: pricingCategory.id, pricingCategory: pricingCategory.label, customerPrice: selling, price: selling, productCategory: item.productCategory || item.category };
            }
            return item;
        });
        const missing = PRICING_SAMPLE_PRODUCTS.filter(sample => !migrated.some(item => String(item.id) === String(sample.id)));
        const merged = missing.length ? [...migrated, ...missing] : migrated;
        if (changed || missing.length) window.ShopMax99.storage.set(STORAGE.products, merged);
        return merged;
    }


    /* =====================================================
       GET PRODUCTS
    ====================================================== */

    function getProducts() {

        const products = window.ShopMax99.storage.get(
            STORAGE.products,
            DEFAULT_PRODUCTS
        );

        return Array.isArray(products)
            ? products.filter(product => {
                const status = String(product.status || "approved").toLowerCase();
                return !product.sellerEmail || status === "approved";
            })
            : DEFAULT_PRODUCTS;
    }


    /* =====================================================
       CATEGORY NAME
    ====================================================== */

    function categoryName(category) {

        const names = {
            all: "All Categories",
            men: "Men", women: "Women", kids: "Kids", home: "Home & Living", beauty: "Beauty", mobile: "Mobile", fitness: "Fitness", more: "More", electronics: "Electronics", toys: "Toys & Games", groceries: "Groceries", sports: "Sports",
            ...PRICE_CATEGORY_LABELS
        };
        return names[category] || category;
    }



    function customerPrice(product) {
        const direct = Number(product?.customerPrice);
        if (Number.isFinite(direct) && direct > 0) return direct;
        const settings = window.ShopMax99.storage.get("shopmax99_settings", {});
        const configured = Number(settings?.customerPrice);
        return Number.isFinite(configured) && configured > 0 ? configured : 99;
    }

    /* =====================================================
       PRODUCT CARD
    ====================================================== */

    function productCard(product) {

        const wishlist =
            window.ShopMax99.wishlist.get();

        const isWishlisted =
            wishlist.some(
                item =>
                    String(item.id) ===
                    String(product.id)
            );

        const image = product.image
            ? `
                <img
                    src="${product.image}"
                    alt="${window.ShopMax99.escapeHTML(product.name)}"
                    loading="lazy"
                >
            `
            : `
                <div class="product-placeholder">
                    <i class="fa-solid fa-box"></i>
                </div>
            `;

        return `
            <article
                class="product-card"
                data-product-id="${product.id}"
            >

                <div class="product-image-wrap">

                    ${image}

                    <span class="product-category-tag">
                        ${window.ShopMax99.escapeHTML(
                            categoryName(product.category)
                        )}
                    </span>

                    <button
                        type="button"
                        class="product-wishlist-btn ${
                            isWishlisted ? "active" : ""
                        }"
                        data-action="wishlist"
                        data-product-id="${product.id}"
                        aria-label="Add to wishlist"
                    >
                        <i class="${
                            isWishlisted
                                ? "fa-solid"
                                : "fa-regular"
                        } fa-heart"></i>
                    </button>

                </div>


                <div class="product-info">

                    <h3>
                        ${window.ShopMax99.escapeHTML(product.name)}
                    </h3>

                    <div class="customer-product-id">Product ID: ${window.ShopMax99.escapeHTML(product.id || "-")}</div>

                    <p class="product-description">
                        ${window.ShopMax99.escapeHTML(
                            product.description || ""
                        )}
                    </p>


                    <div class="product-price-row">

                        <div>
                            <span class="product-price">
                                ₹${customerPrice(product)}
                            </span>

                            ${
                                product.sellerPrice
                                    ? `
                                        <span class="product-old-price">
                                            ₹${product.sellerPrice}
                                        </span>
                                    `
                                    : ""
                            }
                        </div>

                        <div class="product-rating">
                            <i class="fa-solid fa-star"></i>
                            <span>
                                ${product.rating || "4.5"}
                            </span>
                        </div>

                    </div>


                    <div class="product-actions">

                        <button
                            type="button"
                            class="product-add-btn"
                            data-action="add-cart"
                            data-product-id="${product.id}"
                        >
                            <i class="fa-solid fa-cart-plus"></i>
                            Add to Cart
                        </button>

                        <button
                            type="button"
                            class="product-buy-btn"
                            data-action="buy-now"
                            data-product-id="${product.id}"
                        >
                            Buy Now
                        </button>

                    </div>

                </div>

            </article>
        `;
    }


    /* =====================================================
       RENDER PRODUCTS
    ====================================================== */

    function renderProducts(products = getProducts()) {

        const grid = $("#productGrid");

        const emptyState = $("#productEmptyState");

        const resultText = $("#productResultText");

        if (!grid) return;

        if (!products.length) {

            grid.innerHTML = "";

            if (emptyState) {
                emptyState.hidden = false;
            }

            if (resultText) {
                resultText.textContent =
                    "No products found";
            }

            return;
        }

        if (emptyState) {
            emptyState.hidden = true;
        }

        const onHome = window.ShopMax99.currentCustomerPage === "home";
        const showHomeLimit = onHome && currentCategory === "all" && !currentSearch;
        const visibleProducts = showHomeLimit ? products.slice(0, 35) : products;
        grid.innerHTML = visibleProducts.map(productCard).join("");
        if (showHomeLimit) {
            const viewMore = document.createElement("button");
            viewMore.type = "button";
            viewMore.className = "view-more-product-card";
            viewMore.setAttribute("aria-label", "View all ShopMax99 products by category");
            viewMore.innerHTML = `<span class="view-more-icon"><i class="fa-solid fa-arrow-right"></i></span><strong>View More</strong><small>Open full product catalogue category wise</small>`;
            viewMore.addEventListener("click", function () {
                const url = "products.html";
                const opened = window.open(url, "_blank", "noopener");
                if (!opened) window.location.href = url;
            });
            grid.appendChild(viewMore);
        }
        if (resultText) {
            resultText.textContent = showHomeLimit
                ? `Showing ${visibleProducts.length} products`
                : `Showing ${products.length} product${products.length === 1 ? "" : "s"}`;
        }
    }


    const PRODUCT_CATEGORY_OPTIONS = [
        ["all","All Categories"],["men","Men"],["women","Women"],["kids","Kids"],["home","Home & Living"],["beauty","Beauty"],["mobile","Mobile"],["fitness","Fitness"],["electronics","Electronics"],["toys","Toys & Games"],["groceries","Groceries"],["sports","Sports"]
    ];

    function renderCategoryBrowser(category = "all") {
        const grid = $("#categoryProductGrid");
        const title = $("#categoryProductsTitle");
        const result = $("#categoryProductResultText");
        const empty = $("#categoryProductEmptyState");
        const pills = $("#categoryFilterPills");
        if (!grid) return;
        if (pills && !pills.children.length) {
            pills.innerHTML = PRODUCT_CATEGORY_OPTIONS.map(([id,label]) => `<button type="button" class="category-filter-pill ${id===category?"active":""}" data-category-browser="${id}">${label}</button>`).join("");
        } else if (pills) {
            [...pills.children].forEach(btn=>btn.classList.toggle("active",btn.dataset.categoryBrowser===category));
        }
        let products = getProducts();
        if (category !== "all") products = products.filter(p => String(p.category||"").toLowerCase()===category);
        grid.innerHTML = products.map(productCard).join("");
        if (empty) empty.hidden = products.length > 0;
        if (title) title.textContent = categoryName(category);
        if (result) result.textContent = `${products.length} product${products.length===1?"":"s"} found`;
    }

    function openCategoryBrowser(category = "all") {
        if (typeof window.ShopMax99?.showCustomerPage === "function") window.ShopMax99.showCustomerPage("categories");
        renderCategoryBrowser(category);
    }
    window.renderShopMax99CategoryBrowser = renderCategoryBrowser;
    window.openShopMax99CategoryBrowser = openCategoryBrowser;

    /* =====================================================
       FILTER
    ====================================================== */

    let currentCategory = "all";
    let currentSearch = "";


    function filterProducts(category = "all") {

        currentCategory = category;

        const products = getProducts();

        let filtered = products;

        if (
            category &&
            category !== "all" &&
            category !== "more"
        ) {
            filtered = filtered.filter(
                product =>
                    product.category === category
            );
        }

        if (currentSearch) {

            const query =
                currentSearch.toLowerCase();

            filtered = filtered.filter(product => {

                return (
                    product.name
                        .toLowerCase()
                        .includes(query) ||

                    product.category
                        .toLowerCase()
                        .includes(query) ||

                    (product.description || "")
                        .toLowerCase()
                        .includes(query)
                );
            });
        }

        renderProducts(filtered);
    }

    window.filterProducts = filterProducts;


    /* =====================================================
       SEARCH
    ====================================================== */

    function updateSearchSuggestions(query) {
        const input = $("#productSearch");
        if (!input) return;
        let box = document.getElementById("sm99SearchSuggestions");
        if (!box) { box = document.createElement("div"); box.id = "sm99SearchSuggestions"; box.className = "sm99-search-suggestions"; input.closest(".search-wrapper")?.appendChild(box); }
        const q = String(query || "").trim().toLowerCase();
        if (!q) { box.hidden = true; box.innerHTML = ""; return; }
        const matches = getProducts().filter(product => [product.name, product.category, product.description].some(v => String(v || "").toLowerCase().includes(q))).slice(0, 7);
        box.innerHTML = matches.length ? matches.map(product => `<button type="button" class="sm99-search-suggestion" data-action="search-product" data-product-id="${product.id}"><span class="sm99-search-suggestion-image">${product.image ? `<img src="${product.image}" alt="">` : '<i class="fa-solid fa-box"></i>'}</span><span><strong>${window.ShopMax99.escapeHTML(product.name)}</strong><small>${window.ShopMax99.escapeHTML(categoryName(product.category))}</small></span><b>₹${customerPrice(product)}</b></button>`).join("") : '<div class="sm99-search-empty">No matching products found</div>';
        box.hidden = false;
    }

    function searchProducts(query) {

        currentSearch =
            String(query || "").trim();

        filterProducts(currentCategory);

        if (currentSearch) {
            window.ShopMax99.showToast(
                `Searching for "${currentSearch}"`
            );
        }
    }

    window.searchProducts = searchProducts;


    /* =====================================================
       WISHLIST
    ====================================================== */

    function toggleWishlist(productId) {

        const products = getProducts();

        const product =
            products.find(
                item =>
                    String(item.id) ===
                    String(productId)
            );

        if (!product) return;

        let wishlist =
            window.ShopMax99.wishlist.get();

        const index =
            wishlist.findIndex(
                item =>
                    String(item.id) ===
                    String(productId)
            );

        if (index >= 0) {

            wishlist.splice(index, 1);

            window.ShopMax99.wishlist.save(
                wishlist
            );

            window.ShopMax99.showToast(
                "Removed from wishlist.",
                "warning"
            );

        } else {

            wishlist.push({
                ...product
            });

            window.ShopMax99.wishlist.save(
                wishlist
            );

            window.ShopMax99.showToast(
                "Added to wishlist."
            );
        }

        renderProducts(
            getFilteredProducts()
        );

        renderWishlist();
    }


    /* =====================================================
       FILTERED PRODUCTS
    ====================================================== */

    function getFilteredProducts() {

        let products = getProducts();

        if (
            currentCategory &&
            currentCategory !== "all" &&
            currentCategory !== "more"
        ) {
            products =
                products.filter(
                    product =>
                        product.category ===
                        currentCategory
                );
        }

        if (currentSearch) {

            const query =
                currentSearch.toLowerCase();

            products =
                products.filter(product =>
                    product.name
                        .toLowerCase()
                        .includes(query) ||

                    product.category
                        .toLowerCase()
                        .includes(query) ||

                    (product.description || "")
                        .toLowerCase()
                        .includes(query)
                );
        }

        return products;
    }


    /* =====================================================
       RENDER WISHLIST
    ====================================================== */

    function renderWishlist() {

        const grid = $("#wishlistGrid");

        const empty = $("#wishlistEmptyState");

        if (!grid) return;

        const wishlist =
            window.ShopMax99.wishlist.get();

        if (!wishlist.length) {

            grid.innerHTML = "";

            if (empty) {
                empty.hidden = false;
            }

            return;
        }

        if (empty) {
            empty.hidden = true;
        }

        grid.innerHTML =
            wishlist.map(productCard).join("");
    }

    window.renderWishlist = renderWishlist;


    /* =====================================================
       CART RENDER
    ====================================================== */

    function renderCart() {

        const container = $("#cartItems");
        const empty = $("#cartEmptyState");
        const summaryItems = $("#summaryItems");
        const summarySubtotal = $("#summarySubtotal");
        const summaryTotal = $("#summaryTotal");

        if (!container) return;

        const cart =
            window.ShopMax99.cart.get();

        if (!cart.length) {

            container.innerHTML = "";

            if (empty) {
                empty.hidden = false;
            }

            if (summaryItems) {
                summaryItems.textContent = "0";
            }

            if (summarySubtotal) {
                summarySubtotal.textContent = "₹0";
            }

            if (summaryTotal) {
                summaryTotal.textContent = "₹0";
            }
            const cartSuggestionsHost = document.getElementById("cartSuggestions");
            if (cartSuggestionsHost) cartSuggestionsHost.innerHTML = renderProductSuggestions(getProducts().slice(0, 8), "You May Also Like");

            return;
        }

        if (empty) {
            empty.hidden = true;
        }

        let totalItems = 0;
        let subtotal = 0;

        container.innerHTML =
            cart.map(item => {

                const quantity =
                    Number(item.quantity || 1);

                const price =
                    Number(item.price || customerPrice(item));

                totalItems += quantity;

                subtotal +=
                    price * quantity;

                return `
                    <div
                        class="cart-item"
                        data-cart-id="${item.id}"
                    >

                        <div class="cart-item-image">

                            ${
                                item.image
                                    ? `
                                        <img
                                            src="${item.image}"
                                            alt="${window.ShopMax99.escapeHTML(item.name)}"
                                        >
                                    `
                                    : `
                                        <i class="fa-solid fa-box"></i>
                                    `
                            }

                        </div>


                        <div class="cart-item-info">

                            <h3>
                                ${window.ShopMax99.escapeHTML(item.name)}
                            </h3>

                            <p>
                                ${window.ShopMax99.escapeHTML(
                                    categoryName(item.category)
                                )}
                            </p>

                            <div class="cart-item-price">
                                ₹${price}
                            </div>

                        </div>


                        <div class="cart-quantity">

                            <button
                                type="button"
                                class="qty-btn"
                                data-cart-action="minus"
                                data-product-id="${item.id}"
                            >
                                <i class="fa-solid fa-minus"></i>
                            </button>

                            <span class="qty-value">
                                ${quantity}
                            </span>

                            <button
                                type="button"
                                class="qty-btn"
                                data-cart-action="plus"
                                data-product-id="${item.id}"
                            >
                                <i class="fa-solid fa-plus"></i>
                            </button>

                        </div>


                        <button
                            type="button"
                            class="cart-remove-btn"
                            data-cart-action="remove"
                            data-product-id="${item.id}"
                            aria-label="Remove"
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>

                    </div>
                `;
            }).join("");

        const cartSuggestionsHost = document.getElementById("cartSuggestions");
        if (cartSuggestionsHost) {
            const cartIds = new Set(cart.map(item => String(item.id)));
            cartSuggestionsHost.innerHTML = renderProductSuggestions(getProducts().filter(p => !cartIds.has(String(p.id))).slice(0, 8), "You May Also Like");
        }

        if (summaryItems) {
            summaryItems.textContent =
                totalItems;
        }

        if (summarySubtotal) {
            summarySubtotal.textContent =
                `₹${subtotal}`;
        }

        if (summaryTotal) {
            summaryTotal.textContent =
                `₹${subtotal}`;
        }
    }

    window.renderCart = renderCart;


    /* =====================================================
       ORDERS
    ====================================================== */

    function renderOrders() {

        const container =
            $("#customerOrdersList");

        const empty =
            $("#ordersEmptyState");

        if (!container) return;

        const orders =
            window.ShopMax99.storage.get(
                STORAGE.orders,
                []
            );

        if (!orders.length) {

            container.innerHTML = "";

            if (empty) {
                empty.hidden = false;
            }

            return;
        }

        if (empty) {
            empty.hidden = true;
        }

        container.innerHTML =
            orders.map(order => {

                const date =
                    new Date(order.date)
                        .toLocaleDateString(
                            "en-IN",
                            {
                                day: "2-digit",
                                month: "short",
                                year: "numeric"
                            }
                        );

                const itemCount =
                    order.items.reduce(
                        (sum, item) =>
                            sum +
                            Number(item.quantity || 1),
                        0
                    );

                return `
                    <div class="order-card">

                        <div class="order-header">

                            <div>
                                <div class="order-id">
                                    ${order.id}
                                </div>

                                <div class="order-date">
                                    ${date}
                                    ·
                                    ${itemCount} item${
                                        itemCount === 1
                                            ? ""
                                            : "s"
                                    }
                                </div>
                            </div>

                            <span class="order-status status-success">
                                ${window.ShopMax99.escapeHTML(
                                    order.status
                                )}
                            </span>

                        </div>

                        <div style="
                            margin-top:14px;
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                            gap:15px;
                        ">

                            <span style="
                                color:#77707f;
                                font-size:10px;
                            ">
                                Order Total
                            </span>

                            <strong style="
                                color:#6d28d9;
                                font-size:16px;
                            ">
                                ₹${order.total}
                            </strong>

                        </div>

                    </div>
                `;
            }).join("");
    }

    window.renderOrders = renderOrders;


    /* =====================================================
       PRODUCT MODAL
    ====================================================== */

    function getProductReviews(productId) {
        try {
            const all = JSON.parse(localStorage.getItem("shopmax99_reviews") || "[]");
            return Array.isArray(all)
                ? all.filter(r => String(r.productId) === String(productId))
                : [];
        } catch (error) {
            return [];
        }
    }

    function hasPurchasedProduct(productId) {
        try {
            const key = window.ShopMax99.storage?.keys?.orders;
            const orders = key
                ? window.ShopMax99.storage.get(key, [])
                : [];
            return Array.isArray(orders) && orders.some(order =>
                Array.isArray(order.items) && order.items.some(item =>
                    String(item.id) === String(productId)
                )
            );
        } catch (error) {
            return false;
        }
    }

    function saveProductReview(review) {
        try {
            const all = JSON.parse(localStorage.getItem("shopmax99_reviews") || "[]");
            const reviews = Array.isArray(all) ? all : [];
            reviews.unshift(review);
            localStorage.setItem("shopmax99_reviews", JSON.stringify(reviews));
            return true;
        } catch (error) {
            return false;
        }
    }

    function renderReviewStars(rating, interactive = false) {
        const value = Math.max(0, Math.min(5, Number(rating) || 0));
        return [1, 2, 3, 4, 5].map(star => {
            const active = star <= value;
            if (interactive) {
                return `
                    <button type="button" class="review-star-btn ${active ? "active" : ""}" data-review-rating="${star}" aria-label="${star} star${star > 1 ? "s" : ""}">
                        <i class="fa-${active ? "solid" : "regular"} fa-star"></i>
                    </button>`;
            }
            return `<i class="fa-${active ? "solid" : "regular"} fa-star"></i>`;
        }).join("");
    }

    function currentReviewUser() {
        // Primary customer login/session.
        try {
            const session = JSON.parse(localStorage.getItem("shopmax99_customer_session") || "null");
            if (session && session.loggedIn && session.customerId) {
                return {
                    id: session.customerId,
                    customerId: session.customerId,
                    name: session.name || "Customer",
                    mobile: session.mobile || ""
                };
            }
        } catch (error) {
            console.error("Customer review session read error:", error);
        }

        // Compatibility with the older customer email-login flow.
        // Never treat seller/admin sessions as customer review sessions.
        try {
            const user = window.ShopMax99.user?.get?.() || null;
            if (user && user.role !== "seller" && user.role !== "admin") {
                return {
                    id: user.id || user.customerId || user.email,
                    customerId: user.id || user.customerId || user.email,
                    name: user.name || user.email?.split("@")[0] || "Customer",
                    email: user.email || "",
                    mobile: user.mobile || ""
                };
            }
        } catch (error) {
            console.error("Legacy customer session read error:", error);
        }

        return null;
    }

    function renderProductReviews(product) {
        const reviews = getProductReviews(product.id);
        const total = reviews.length;
        const average = total
            ? reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0) / total
            : 0;

        const reviewCards = reviews.length
            ? reviews.map(review => `
                <article class="sm99-review-card">
                    <div class="sm99-review-card-head">
                        <div class="sm99-review-user">
                            <div class="sm99-review-avatar">
                                <i class="fa-solid fa-user"></i>
                            </div>
                            <div>
                                <strong>${window.ShopMax99.escapeHTML(review.name || "Customer")}</strong>
                                ${review.verifiedPurchase !== false
                                    ? `<span class="sm99-verified"><i class="fa-solid fa-circle-check"></i> Verified Purchase</span>`
                                    : `<span class="sm99-review-customer-badge"><i class="fa-solid fa-user"></i> Customer Review</span>`}
                            </div>
                        </div>
                        <time>${review.createdAt ? new Date(review.createdAt).toLocaleDateString("en-IN") : ""}</time>
                    </div>
                    <div class="sm99-review-stars-static" aria-label="${Number(review.rating) || 0} out of 5 stars">
                        ${renderReviewStars(review.rating)}
                    </div>
                    <p>${window.ShopMax99.escapeHTML(review.text || "")}</p>
                    ${review.image ? `<img class="sm99-review-photo" src="${review.image}" alt="Customer review photo">` : ""}
                </article>
            `).join("")
            : `
                <div class="sm99-no-reviews-card">
                    <div class="sm99-no-reviews-icon"><i class="fa-regular fa-comment-dots"></i></div>
                    <strong>No reviews yet</strong>
                    <span>Be the first customer to review this product.</span>
                </div>
            `;

        const purchased = hasPurchasedProduct(product.id);
        const canReview = Boolean(currentReviewUser());

        return `
            <section class="sm99-reviews-section">
                <div class="sm99-reviews-header">
                    <div>
                        <span class="sm99-section-kicker">CUSTOMER FEEDBACK</span>
                        <h3>Ratings & Reviews</h3>
                    </div>
                    <div class="sm99-rating-summary">
                        <strong>${total ? average.toFixed(1) : "0.0"}</strong>
                        <div class="sm99-review-stars-static">${renderReviewStars(total ? average : 0)}</div>
                        <span>${total} review${total === 1 ? "" : "s"}</span>
                    </div>
                </div>

                ${canReview ? `
                    <form class="sm99-review-form" data-product-id="${product.id}">
                        <div class="sm99-review-form-title">
                            <div>
                                <strong>Write a review</strong>
                                <span>Share your experience with other customers.</span>
                            </div>
                            ${purchased
                                ? `<span class="sm99-review-purchase-note"><i class="fa-solid fa-circle-check"></i> Verified purchase</span>`
                                : `<span class="sm99-review-purchase-note sm99-review-unverified-note"><i class="fa-solid fa-user"></i> Customer review</span>`}
                        </div>

                        <div class="sm99-rating-picker">
                            <span>Your rating</span>
                            <div class="sm99-review-stars-picker">
                                ${renderReviewStars(0, true)}
                            </div>
                            <input type="hidden" name="rating" value="0">
                        </div>

                        <textarea name="reviewText" maxlength="800" required placeholder="What did you like or dislike about this product?"></textarea>

                        <div class="sm99-review-form-bottom">
                            <label class="sm99-photo-upload">
                                <i class="fa-regular fa-image"></i>
                                <span>Add product photo</span>
                                <input type="file" name="reviewImage" accept="image/jpeg,image/png,image/webp">
                            </label>
                            <button type="submit" class="sm99-review-submit">
                                Submit Review <i class="fa-solid fa-arrow-right"></i>
                            </button>
                        </div>
                        <small class="sm99-review-help">${purchased
                            ? "Your review is marked as Verified Purchase because this product appears in a completed order."
                            : "You can review this product while signed in. Because you have not purchased it yet, your review will not carry a Verified Purchase badge."}</small>
                    </form>
                ` : `
                    <div class="sm99-review-locked">
                        <div class="sm99-review-locked-icon"><i class="fa-solid fa-lock"></i></div>
                        <div>
                            <strong>${!canReview ? "Sign in to review this product" : "Review available after purchase"}</strong>
                            <span>${!canReview ? "Please sign in with your customer account first." : "Buy this product first. After your order is recorded, you can submit your rating, review and product photo here."}</span>
                        </div>
                    </div>
                `}

                <div class="sm99-review-list">
                    ${reviewCards}
                </div>
            </section>
        `;
    }

    function getRelatedProducts(product) {
        const products = getProducts();
        const category = String(product?.category || "").toLowerCase();
        const currentId = String(product?.id || "");
        const same = products.filter(item => String(item.id) !== currentId && String(item.category || "").toLowerCase() === category);
        const other = products.filter(item => String(item.id) !== currentId && !same.some(x => String(x.id) === String(item.id)));
        return same.concat(other).slice(0, 8);
    }

    function renderProductSuggestions(products, title) {
        if (!products.length) return "";
        return `<section class="sm99-product-suggestions"><div class="sm99-suggestions-head"><div><span class="section-kicker">SHOPMAX99</span><h3>${title || "You May Also Like"}</h3></div><span>More products for you</span></div><div class="sm99-suggestion-grid">${products.slice(0, 8).map(productCard).join("")}</div></section>`;
    }

    function openProduct(productId) {
        const product = getProducts().find(
            item => String(item.id) === String(productId)
        );
        if (!product) return;

        const content = $("#productModalContent");
        if (!content) return;

        const currentUser = currentReviewUser();
        const reviewsHtml = renderProductReviews(product);
        const productImages = Array.from(new Set(
            (Array.isArray(product.images) ? product.images : [])
                .concat(product.image ? [product.image] : [])
                .filter(Boolean)
        )).slice(0, 4);
        const galleryImages = productImages.length ? productImages : [""];

        content.innerHTML = `
            <div class="product-detail">
                <div class="product-detail-image sm99-product-gallery" data-gallery-index="0">
                    <div class="sm99-gallery-stage">
                        ${galleryImages[0]
                            ? `<img class="sm99-gallery-main-image" src="${galleryImages[0]}" alt="${window.ShopMax99.escapeHTML(product.name)}">`
                            : `<i class="fa-solid fa-box" aria-hidden="true"></i>`}
                        ${galleryImages.length > 1 ? `
                            <button type="button" class="sm99-gallery-btn sm99-gallery-prev" data-gallery-action="prev" aria-label="Previous image"><i class="fa-solid fa-chevron-left"></i></button>
                            <button type="button" class="sm99-gallery-btn sm99-gallery-next" data-gallery-action="next" aria-label="Next image"><i class="fa-solid fa-chevron-right"></i></button>
                            <span class="sm99-gallery-counter">1 / ${galleryImages.length}</span>
                        ` : ""}
                    </div>
                    ${galleryImages.length > 1 ? `
                        <div class="sm99-gallery-thumbs">
                            ${galleryImages.map((img, i) => `<button type="button" class="sm99-gallery-thumb ${i === 0 ? "active" : ""}" data-gallery-thumb="${i}" aria-label="View image ${i + 1}"><img src="${img}" alt=""></button>`).join("")}
                        </div>
                    ` : ""}
                </div>

                <div class="product-detail-info">
                    <div class="product-detail-category">
                        ${window.ShopMax99.escapeHTML(categoryName(product.category))}
                    </div>
                    <h2>${window.ShopMax99.escapeHTML(product.name)}</h2>
                    <div class="product-detail-rating-row">
                        <span class="product-detail-rating-stars">${renderReviewStars(product.rating || 0)}</span>
                        <span>${product.rating || "No rating"}</span>
                    </div>
                    <div class="product-detail-price">₹${customerPrice(product)}</div>
                    <p class="product-detail-description">
                        ${window.ShopMax99.escapeHTML(product.description || "Product details will be updated soon.")}
                    </p>

                    <div class="product-detail-actions">
                        <button type="button" class="product-detail-wishlist" data-action="modal-wishlist" data-product-id="${product.id}">
                            <i class="fa-regular fa-heart"></i> Wishlist
                        </button>
                        <button type="button" class="primary-btn product-detail-cart" data-action="modal-add-cart" data-product-id="${product.id}">
                            <i class="fa-solid fa-cart-plus"></i> Add to Cart
                        </button>
                        <button type="button" class="primary-btn product-detail-buy" data-action="modal-buy-now" data-product-id="${product.id}">
                            <i class="fa-solid fa-bolt"></i> Buy Now
                        </button>
                    </div>
                </div>
            </div>
            ${reviewsHtml}
            ${renderProductSuggestions(getRelatedProducts(product), "Related Products")}
        `;

        window.ShopMax99.openModal("productModal");
        bindProductReviewEvents(product);
    }

    function bindProductReviewEvents(product) {
        const content = $("#productModalContent");
        if (!content) return;

        content.querySelector('[data-action="modal-wishlist"]')?.addEventListener("click", () => {
            toggleWishlist(product.id);
            const icon = content.querySelector('[data-action="modal-wishlist"] i');
            const wished = window.ShopMax99.wishlist.get().some(item => String(item.id) === String(product.id));
            if (icon) icon.className = wished ? "fa-solid fa-heart" : "fa-regular fa-heart";
        });

        // Product image gallery: Previous / Next + thumbnail navigation.
        const gallery = content.querySelector(".sm99-product-gallery");
        if (gallery) {
            const images = Array.from(new Set(
                (Array.isArray(product.images) ? product.images : [])
                    .concat(product.image ? [product.image] : [])
                    .filter(Boolean)
            )).slice(0, 4);
            let galleryIndex = 0;
            const updateGallery = () => {
                if (!images.length) return;
                galleryIndex = (galleryIndex + images.length) % images.length;
                const main = gallery.querySelector(".sm99-gallery-main-image");
                if (main) main.src = images[galleryIndex];
                const counter = gallery.querySelector(".sm99-gallery-counter");
                if (counter) counter.textContent = `${galleryIndex + 1} / ${images.length}`;
                gallery.querySelectorAll("[data-gallery-thumb]").forEach(btn => {
                    btn.classList.toggle("active", Number(btn.dataset.galleryThumb) === galleryIndex);
                });
            };
            gallery.querySelector('[data-gallery-action="prev"]')?.addEventListener("click", () => { galleryIndex--; updateGallery(); });
            gallery.querySelector('[data-gallery-action="next"]')?.addEventListener("click", () => { galleryIndex++; updateGallery(); });
            gallery.querySelectorAll("[data-gallery-thumb]").forEach(btn => {
                btn.addEventListener("click", () => { galleryIndex = Number(btn.dataset.galleryThumb) || 0; updateGallery(); });
            });
        }

        const form = content.querySelector(".sm99-review-form");
        if (!form) return;

        let selectedRating = 0;
        form.querySelectorAll("[data-review-rating]").forEach(button => {
            button.addEventListener("click", () => {
                selectedRating = Number(button.dataset.reviewRating) || 0;
                const hidden = form.querySelector('input[name="rating"]');
                if (hidden) hidden.value = String(selectedRating);
                form.querySelectorAll("[data-review-rating]").forEach(starButton => {
                    const active = Number(starButton.dataset.reviewRating) <= selectedRating;
                    starButton.classList.toggle("active", active);
                    const icon = starButton.querySelector("i");
                    if (icon) icon.className = `fa-${active ? "solid" : "regular"} fa-star`;
                });
            });
        });

        form.addEventListener("submit", event => {
            event.preventDefault();
            const text = form.reviewText.value.trim();
            const file = form.reviewImage.files?.[0];
            const user = currentReviewUser();

            if (!selectedRating) {
                window.ShopMax99.showToast?.("Please select a star rating.", "error");
                return;
            }
            if (!text) {
                window.ShopMax99.showToast?.("Please write a review.", "error");
                return;
            }
            if (!user) {
                window.ShopMax99.showToast?.("Please sign in before writing a review.", "error");
                return;
            }
            if (file && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                window.ShopMax99.showToast?.("Only JPG, PNG or WebP images are allowed.", "error");
                return;
            }

            const save = image => {
                const ok = saveProductReview({
                    id: `REV-${Date.now()}`,
                    productId: product.id,
                    name: user.name || user.email?.split("@")[0] || "Customer",
                    rating: selectedRating,
                    text,
                    image: image || "",
                    verifiedPurchase: hasPurchasedProduct(product.id),
                    createdAt: new Date().toISOString()
                });
                if (!ok) {
                    window.ShopMax99.showToast?.("Could not save the review.", "error");
                    return;
                }
                window.ShopMax99.showToast?.("Review submitted successfully.", "success");
                openProduct(product.id);
            };

            if (!file) {
                save("");
                return;
            }

            const reader = new FileReader();
            reader.onload = () => save(reader.result);
            reader.readAsDataURL(file);
        });
    }


    /* =====================================================
       CUSTOMER CLICK EVENTS
    ====================================================== */

    function bindCustomerEvents() {
        const searchInput = $("#productSearch");
        if (searchInput && !searchInput.dataset.liveSearchBound) {
            searchInput.dataset.liveSearchBound = "1";
            searchInput.addEventListener("input", () => updateSearchSuggestions(searchInput.value));
            searchInput.addEventListener("focus", () => { if (searchInput.value.trim()) updateSearchSuggestions(searchInput.value); });
        }
        document.addEventListener("click", event => {
            if (!event.target.closest(".search-wrapper")) {
                const box = document.getElementById("sm99SearchSuggestions");
                if (box) box.hidden = true;
            }
        });

        document.addEventListener(
            "click",
            function (event) {

                const actionButton =
                    event.target.closest(
                        "[data-action]"
                    );

                if (actionButton) {

                    const action =
                        actionButton.dataset.action;

                    const productId =
                        actionButton.dataset.productId;

                    if (action === "wishlist") {

                        toggleWishlist(productId);

                        return;
                    }

                    if (action === "add-cart") {

                        event.preventDefault();
                        event.stopPropagation();
                        const savedScrollY = window.scrollY;

                        const product =
                            getProducts().find(
                                item =>
                                    String(item.id) ===
                                    String(productId)
                            );

                        if (product) {

                            window.ShopMax99.cart.add(
                                product
                            );
                            requestAnimationFrame(() => {
                                window.scrollTo(0, savedScrollY);
                            });
                        }

                        return;
                    }

                    if (action === "buy-now") {
                        event.preventDefault();
                        event.stopPropagation();
                        const product = getProducts().find(item => String(item.id) === String(productId));
                        if (product) {
                            window.ShopMax99.cart.save([{ id: product.id, name: product.name, price: customerPrice(product), image: product.image || "", category: product.category || "", quantity: 1, sellerPrice: product.sellerPrice || 0, sellerEmail: product.sellerEmail || "" }]);
                            window.ShopMax99.updateCartCount?.();

                            // Close the current product/suggestion overlay
                            // before opening checkout.
                            document.querySelectorAll(".modal-overlay").forEach(modal => {
                                modal.hidden = true;
                                modal.style.display = "";
                            });
                            document.body.style.overflow = "";

                            window.ShopMax99.checkout?.();
                        }
                        return;
                    }

                    if (action === "search-product") {
                        event.preventDefault();
                        const box = document.getElementById("sm99SearchSuggestions");
                        if (box) box.hidden = true;
                        openProduct(productId);
                        return;
                    }

                    if (action === "view-product") {
                        openProduct(productId);
                        return;
                    }

                    if (action === "modal-buy-now") {
                        event.preventDefault();
                        event.stopPropagation();
                        const product = getProducts().find(item => String(item.id) === String(productId));
                        if (product) {
                            window.ShopMax99.cart.save([{
                                id: product.id, name: product.name, price: customerPrice(product),
                                image: product.image || "", category: product.category || "", quantity: 1,
                                sellerPrice: product.sellerPrice || 0, sellerEmail: product.sellerEmail || ""
                            }]);
                            window.ShopMax99.updateCartCount?.();
                            window.ShopMax99.closeModal("productModal");
                            requestAnimationFrame(() => window.ShopMax99.checkout?.());
                        }
                        return;
                    }

                    if (action === "modal-add-cart") {

                        event.preventDefault();
                        event.stopPropagation();
                        const product =
                            getProducts().find(
                                item =>
                                    String(item.id) ===
                                    String(productId)
                            );

                        if (product) {

                            window.ShopMax99.cart.add(
                                product
                            );

                            window.ShopMax99.closeModal(
                                "productModal"
                            );
                        }

                        return;
                    }
                }


                const card = event.target.closest(".product-card[data-product-id]");
                if (card && !event.target.closest("button, a, input, textarea, select, label")) {
                    openProduct(card.dataset.productId);
                    return;
                }

                const cartAction =
                    event.target.closest(
                        "[data-cart-action]"
                    );

                if (cartAction) {

                    const action =
                        cartAction.dataset.cartAction;

                    const productId =
                        cartAction.dataset.productId;

                    if (action === "plus") {

                        window.ShopMax99.cart.changeQuantity(
                            productId,
                            1
                        );
                    }

                    if (action === "minus") {

                        window.ShopMax99.cart.changeQuantity(
                            productId,
                            -1
                        );
                    }

                    if (action === "remove") {

                        window.ShopMax99.cart.remove(
                            productId
                        );
                    }

                    return;
                }

            }
        );
    }


    /* =====================================================
       INITIALIZE CUSTOMER
    ====================================================== */

    function renderPricingCategoryUI() {
        const productCategories = [
            ["men","Men","Fashion & More","fa-shirt"],["women","Women","Fashion & More","fa-person-dress"],["kids","Kids","Fun & Fashion","fa-child"],["home","Home & Living","Home & Living","fa-couch"],["beauty","Beauty","Beauty Products","fa-spa"],["mobile","Mobile","Mobile & Accessories","fa-mobile-screen-button"],["fitness","Fitness","Health & Fitness","fa-dumbbell"],["electronics","Electronics","Gadgets & More","fa-laptop"],["toys","Toys & Games","Fun for everyone","fa-puzzle-piece"],["groceries","Groceries","Daily essentials","fa-basket-shopping"],["sports","Sports","Sports & Outdoors","fa-futbol"]
        ];
        const bar=$("#categoryBar");
        if(bar) bar.innerHTML=`<button type="button" class="category-link active" data-category="all"><i class="fa-solid fa-layer-group"></i> All Categories</button>`+productCategories.map(([id,label])=>`<button type="button" class="category-link" data-category="${id}">${label}</button>`).join("");
        const home=$("#homeCategoryCards");
        if(home) home.innerHTML=productCategories.slice(0,8).map(([id,label,sub,icon])=>`<button type="button" class="category-card" data-category="${id}"><div class="category-card-icon"><i class="fa-solid ${icon}"></i></div><strong>${label}</strong><span>${sub}</span></button>`).join("");
        const all=document.querySelector(".all-category-grid");
        if(all) all.innerHTML=productCategories.map(([id,label,sub,icon])=>`<button type="button" class="large-category-card" data-category="${id}"><i class="fa-solid ${icon}"></i><strong>${label}</strong><span>${sub}</span></button>`).join("");
        renderCategoryBrowser("all");
    }

    function initCustomer() {

        initializeProducts();
        renderPricingCategoryUI();

        bindCustomerEvents();

        renderProducts();

        renderWishlist();

        renderCart();

        renderOrders();
    }

    window.initCustomer = initCustomer;

})();