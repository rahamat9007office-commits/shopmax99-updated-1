(function(){
  "use strict";
  const STORAGE_KEY = "shopmax99_products";
  const CART_KEY = "shopmax99_cart";
  const WISHLIST_KEY = "shopmax99_wishlist";
  const categories = [
    ["all","All Products","Browse the complete ShopMax99 catalogue","fa-layer-group"],
    ["men","Men","Fashion, clothing and accessories","fa-shirt"],
    ["women","Women","Fashion, clothing and accessories","fa-person-dress"],
    ["kids","Kids","Clothing, toys and essentials for kids","fa-child"],
    ["home","Home & Living","Furniture, decor and home essentials","fa-couch"],
    ["beauty","Beauty","Beauty and personal care","fa-spa"],
    ["mobile","Mobile","Mobiles and mobile accessories","fa-mobile-screen-button"],
    ["fitness","Fitness","Workout and fitness products","fa-dumbbell"],
    ["electronics","Electronics","Everyday electronic products","fa-plug"],
    ["toys","Toys & Games","Toys, games and fun products","fa-gamepad"],
    ["groceries","Groceries","Daily-use grocery essentials","fa-basket-shopping"],
    ["sports","Sports & Outdoors","Sports and outdoor essentials","fa-futbol"]
  ];
  const names = Object.fromEntries(categories.map(x=>[x[0],x[1]]));
  let allProducts=[];
  let selected="all";
  let detailProductId=null;
  let detailImages=[];
  let detailImageIndex=0;
  const $=id=>document.getElementById(id);
  function esc(v){const d=document.createElement("div");d.textContent=String(v??"");return d.innerHTML;}
  function read(key,fallback=[]){try{const raw=localStorage.getItem(key);const data=JSON.parse(raw||"null");return data??fallback}catch(e){return fallback}}
  function write(key,value){localStorage.setItem(key,JSON.stringify(value));window.dispatchEvent(new Event("storage"));}
  function price(p){const n=Number(p.customerPrice??p.price);return Number.isFinite(n)?n:0}
  function categoryOf(p){return String(p.category||p.productCategory||"").toLowerCase()}
  function categoryLabel(p){return names[categoryOf(p)]||categoryOf(p)||"Other"}
  function fallbackImage(cat){const map={men:"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",women:"https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=900&q=80",kids:"https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=900&q=80",home:"https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80",beauty:"https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80",mobile:"https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=900&q=80",fitness:"https://images.unsplash.com/photo-1598289431512-b97b0917affc?auto=format&fit=crop&w=900&q=80",electronics:"https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=900&q=80",toys:"https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?auto=format&fit=crop&w=900&q=80",groceries:"https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80",sports:"https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=80"};return map[cat]||"https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=900&q=80"}
  function productImage(p){return p.image||((Array.isArray(p.images)&&p.images[0])||fallbackImage(categoryOf(p)))}
  function representative(cat){if(cat==="all") return "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1200&q=80";const p=allProducts.find(x=>categoryOf(x)===cat&&productImage(x));return p?productImage(p):fallbackImage(cat)}
  function getWishlist(){return read(WISHLIST_KEY,[])}
  function isWishlisted(id){return getWishlist().some(x=>String(x.id)===String(id))}
  function toggleWishlist(id){
    const list=getWishlist(); const i=list.findIndex(x=>String(x.id)===String(id));
    const product=allProducts.find(x=>String(x.id)===String(id)); if(!product)return;
    if(i>=0){list.splice(i,1);toast("Removed from wishlist.");}else{list.push({...product});toast("Added to wishlist.");}
    localStorage.setItem(WISHLIST_KEY,JSON.stringify(list)); render(); if(detailProductId===id) openProduct(id);
  }
  function addCart(product){
    const cart=read(CART_KEY,[]); const i=cart.findIndex(x=>String(x.id)===String(product.id));
    if(i>=0) cart[i].quantity=Number(cart[i].quantity||1)+1;
    else cart.push({id:product.id,name:product.name,price:price(product),image:productImage(product),category:categoryOf(product),quantity:1,sellerPrice:product.sellerPrice||0,sellerEmail:product.sellerEmail||""});
    localStorage.setItem(CART_KEY,JSON.stringify(cart));
    toast("Product added to cart.");
  }
  function buyNow(product){
    if(!product) return;
    const item={id:product.id,name:product.name,price:price(product),image:productImage(product),category:categoryOf(product),quantity:1,sellerPrice:product.sellerPrice||0,sellerEmail:product.sellerEmail||""};
    // Buy Now must replace the cart with only the selected product.
    localStorage.setItem(CART_KEY,JSON.stringify([item]));
    localStorage.setItem("shopmax99_buy_now","1");
    // Use a query flag as a second, reliable trigger after index.html loads.
    window.location.assign("./index.html?shopmax99_buy_now=1");
  }
  function toast(message){const old=document.querySelector(".pm-toast");if(old)old.remove();const t=document.createElement("div");t.className="pm-toast";t.textContent=message;document.body.appendChild(t);requestAnimationFrame(()=>t.classList.add("show"));setTimeout(()=>t.remove(),2200)}
  function renderCategories(){
    $("pmCategoryGrid").innerHTML=categories.map(([id,label,desc,icon])=>`<button type="button" class="pm-category-card ${selected===id?"active":""}" data-cat="${id}"><img src="${representative(id)}" alt="${esc(label)}"><span class="pm-category-info"><strong><i class="fa-solid ${icon}"></i> ${esc(label)}</strong><span>${esc(desc)}</span></span></button>`).join("");
    $("pmFilter").innerHTML=categories.map(x=>`<button type="button" class="pm-pill ${selected===x[0]?"active":""}" data-filter="${x[0]}">${esc(x[1])}</button>`).join("");
  }
  function productCard(p){
    const wished=isWishlisted(p.id), img=productImage(p), cp=price(p), sp=Number(p.sellerPrice);
    return `<article class="pm-product pm-full-product-card" data-product-id="${esc(p.id)}">
      <div class="pm-product-image"><img src="${img}" alt="${esc(p.name||"ShopMax99 Product")}" loading="lazy"><span class="pm-product-cat">${esc(categoryLabel(p))}</span>
        <button type="button" class="pm-wishlist ${wished?"active":""}" data-action="wishlist" data-product-id="${esc(p.id)}" aria-label="Wishlist"><i class="${wished?"fa-solid":"fa-regular"} fa-heart"></i></button>
      </div>
      <div class="pm-product-info"><h3>${esc(p.name||"ShopMax99 Product")}</h3><p>${esc(p.description||"Quality product available on ShopMax99.")}</p>
        <div class="pm-price-row"><div><span class="pm-price">₹${cp.toLocaleString("en-IN")}</span>${Number.isFinite(sp)&&sp>0?`<span class="pm-old-price">₹${sp.toLocaleString("en-IN")}</span>`:""}</div><div class="pm-rating"><i class="fa-solid fa-star"></i> ${esc(p.rating||"4.5")}</div></div>
        <div class="pm-product-actions"><button type="button" class="pm-add" data-action="add-cart" data-product-id="${esc(p.id)}"><i class="fa-solid fa-cart-plus"></i> Add to Cart</button><button type="button" class="pm-buy" data-action="buy-now" data-product-id="${esc(p.id)}"><i class="fa-solid fa-bolt"></i> Buy Now</button><button type="button" class="pm-view" data-action="view-product" data-product-id="${esc(p.id)}" aria-label="View product"><i class="fa-regular fa-eye"></i></button></div>
      </div></article>`;
  }
  function render(){
    const products=selected==="all"?allProducts:allProducts.filter(p=>categoryOf(p)===selected);
    const label=selected==="all"?"All Products":names[selected]||selected;
    $("pmProductsTitle").textContent=label; $("pmResult").textContent=`${products.length} product${products.length===1?"":"s"}`;
    $("pmSelected").innerHTML=`<i class="fa-solid fa-layer-group"></i> ${esc(label)}`;
    $("pmHeroTitle").textContent=selected==="all"?"Explore All Categories":`${label} Products`;
    $("pmHeroText").textContent=selected==="all"?"Browse the complete ShopMax99 product collection. Choose a category to see only the products from that category.":`Explore all currently listed products in the ${label} category.`;
    $("pmHeroBg").style.backgroundImage=`url("${representative(selected)}")`;
    $("pmProducts").innerHTML=products.map(productCard).join(""); $("pmEmpty").hidden=products.length>0; renderCategories();
  }
  function select(cat){selected=cat;render();window.scrollTo({top:document.querySelector(".pm-products")?.offsetTop-100||0,behavior:"smooth"})}
  function openProduct(id){
    const p=allProducts.find(x=>String(x.id)===String(id)); if(!p)return; detailProductId=p.id;
    detailImages=Array.from(new Set((Array.isArray(p.images)?p.images:[]).concat(p.image||[]).filter(Boolean))); if(!detailImages.length)detailImages=[productImage(p)]; detailImageIndex=0;
    renderDetail(p); $("pmDetailModal").hidden=false; document.body.classList.add("pm-modal-open");
  }
  function renderDetail(p){
    const same=allProducts.filter(x=>String(x.id)!==String(p.id)&&categoryOf(x)===categoryOf(p)).slice(0,8);
    const img=detailImages[detailImageIndex]||productImage(p), cp=price(p), sp=Number(p.sellerPrice);
    $("pmDetailContent").innerHTML=`<div class="pm-detail"><div class="pm-detail-gallery"><div class="pm-detail-stage"><img src="${img}" alt="${esc(p.name)}">${detailImages.length>1?`<button class="pm-gallery-btn left" data-gallery="prev"><i class="fa-solid fa-chevron-left"></i></button><button class="pm-gallery-btn right" data-gallery="next"><i class="fa-solid fa-chevron-right"></i></button><span class="pm-gallery-count">${detailImageIndex+1} / ${detailImages.length}</span>`:""}</div>${detailImages.length>1?`<div class="pm-thumbs">${detailImages.map((x,i)=>`<button class="pm-thumb ${i===detailImageIndex?"active":""}" data-thumb="${i}"><img src="${x}" alt=""></button>`).join("")}</div>`:""}</div>
      <div class="pm-detail-info"><span class="pm-detail-cat">${esc(categoryLabel(p))}</span><h2>${esc(p.name||"ShopMax99 Product")}</h2><div class="pm-detail-rating"><i class="fa-solid fa-star"></i> ${esc(p.rating||"No rating")}</div><div class="pm-detail-price">₹${cp.toLocaleString("en-IN")}${Number.isFinite(sp)&&sp>0?` <del>₹${sp.toLocaleString("en-IN")}</del>`:""}</div><p>${esc(p.description||"Product details will be updated soon.")}</p>
      <div class="pm-detail-meta"><span><b>Category</b>${esc(categoryLabel(p))}</span><span><b>Product ID</b>${esc(p.id)}</span>${p.stock!=null?`<span><b>Stock</b>${esc(p.stock)}</span>`:""}</div>
      <div class="pm-detail-actions"><button class="pm-detail-wish ${isWishlisted(p.id)?"active":""}" data-detail-action="wishlist"><i class="${isWishlisted(p.id)?"fa-solid":"fa-regular"} fa-heart"></i> Wishlist</button><button class="pm-detail-cart" data-detail-action="cart"><i class="fa-solid fa-cart-plus"></i> Add to Cart</button><button class="pm-detail-buy" data-detail-action="buy-now"><i class="fa-solid fa-bolt"></i> Buy Now</button></div></div></div>
      <section class="pm-related"><div class="pm-related-head"><div><span>FROM THE SAME CATEGORY</span><h3>More ${esc(categoryLabel(p))} Products</h3></div><small>${same.length} suggestion${same.length===1?"":"s"}</small></div><div class="pm-related-grid">${same.length?same.map(productCard).join(""):`<div class="pm-no-related">No more products are currently listed in this category.</div>`}</div></section>`;
  }
  function closeDetail(){$("pmDetailModal").hidden=true;document.body.classList.remove("pm-modal-open");detailProductId=null}
  document.addEventListener("click",e=>{
    const c=e.target.closest("[data-cat]");if(c){select(c.dataset.cat);return}
    const f=e.target.closest("[data-filter]");if(f){select(f.dataset.filter);return}
    const action=e.target.closest("[data-action]");if(action){const p=allProducts.find(x=>String(x.id)===String(action.dataset.productId));if(!p)return;if(action.dataset.action==="wishlist"){e.stopPropagation();toggleWishlist(p.id);return}if(action.dataset.action==="add-cart"){e.stopPropagation();addCart(p);return}if(action.dataset.action==="buy-now"){e.stopPropagation();buyNow(p);return}if(action.dataset.action==="view-product"){e.stopPropagation();openProduct(p.id);return}}
    const card=e.target.closest(".pm-full-product-card");if(card){openProduct(card.dataset.productId);return}
    const da=e.target.closest("[data-detail-action]");if(da&&detailProductId){const p=allProducts.find(x=>String(x.id)===String(detailProductId));if(!p)return;if(da.dataset.detailAction==="wishlist")toggleWishlist(p.id);if(da.dataset.detailAction==="cart")addCart(p);return}
    const g=e.target.closest("[data-gallery]");if(g&&detailProductId){detailImageIndex += g.dataset.gallery==="next"?1:-1;detailImageIndex=(detailImageIndex+detailImages.length)%detailImages.length;const p=allProducts.find(x=>String(x.id)===String(detailProductId));renderDetail(p);return}
    const th=e.target.closest("[data-thumb]");if(th&&detailProductId){detailImageIndex=Number(th.dataset.thumb)||0;const p=allProducts.find(x=>String(x.id)===String(detailProductId));renderDetail(p);return}
    if(e.target.closest("#pmDetailClose")||e.target.id==="pmDetailModal")closeDetail();
  });
  $("pmBack").addEventListener("click",()=>{if(window.opener&&!window.opener.closed)window.close();else window.location.href="index.html"});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("pmDetailModal").hidden)closeDetail()});
  allProducts=read(STORAGE_KEY,[]);render();
  window.addEventListener("storage",()=>{allProducts=read(STORAGE_KEY,[]);render();if(detailProductId){const p=allProducts.find(x=>String(x.id)===String(detailProductId));if(p)renderDetail(p)}});
})();
