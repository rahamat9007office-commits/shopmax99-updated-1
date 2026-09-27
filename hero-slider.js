/* =========================================================
   SHOPMAX99 HERO IMAGE SLIDER
   One image at a time; automatic loop always moves forward.
========================================================= */
(function(){
  "use strict";
  function initHeroSlider(){
    const slider=document.getElementById("shopMax99HeroSlider");
    const track=document.getElementById("shopMax99HeroSlides");
    if(!slider||!track) return;
    const originals=[...track.querySelectorAll(".hero-slide")];
    if(!originals.length) return;
    track.querySelectorAll(".hero-slide-clone").forEach(el=>el.remove());
    const total=originals.length;
    let current=0;
    let timer=null;
    const clone=total>1?originals[0].cloneNode(true):null;
    if(clone){ clone.classList.remove("active"); clone.classList.add("hero-slide-clone"); clone.setAttribute("aria-hidden","true"); track.appendChild(clone); }
    const dots=document.getElementById("heroSliderDots");
    const prev=document.getElementById("heroSliderPrev");
    const next=document.getElementById("heroSliderNext");
    function position(index,animate){ track.style.transition=animate?"transform .65s ease-in-out":"none"; track.style.transform=`translateX(-${index*100}%)`; }
    function updateDots(index){ if(!dots)return; [...dots.children].forEach((d,i)=>{d.classList.toggle("active",i===index);d.setAttribute("aria-current",i===index?"true":"false");}); }
    function updateActive(index){ originals.forEach((slide,i)=>slide.classList.toggle("active",i===index%total)); updateDots(index%total); }
    function nextSlide(){ if(total<2)return; current+=1; position(current,true); updateActive(current); }
    function prevSlide(){ if(total<2)return; current=current<=0?total-1:current-1; position(current,true); updateActive(current); }
    function stop(){ if(timer){clearInterval(timer);timer=null;} }
    function start(){ stop(); if(total>1) timer=setInterval(nextSlide,3000); }
    if(dots){ dots.innerHTML=""; originals.forEach((_,i)=>{const d=document.createElement("button");d.type="button";d.className="hero-slider-dot";d.setAttribute("aria-label",`Go to banner ${i+1}`);d.addEventListener("click",()=>{current=i;position(current,true);updateActive(current);start();});dots.appendChild(d);}); }
    if(next) next.addEventListener("click",()=>{nextSlide();start();});
    if(prev) prev.addEventListener("click",()=>{prevSlide();start();});
    track.addEventListener("transitionend",e=>{ if(e.propertyName!=="transform"||!clone||current!==total)return; current=0; position(0,false); void track.offsetWidth; updateActive(0); });
    slider.addEventListener("mouseenter",stop); slider.addEventListener("mouseleave",start);
    slider.addEventListener("touchstart",stop,{passive:true}); slider.addEventListener("touchend",start,{passive:true});
    position(0,false); updateActive(0); start();
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",initHeroSlider,{once:true}); else initHeroSlider();
})();
