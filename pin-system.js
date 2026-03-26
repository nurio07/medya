(function(){
  function mark(target){
    if(!target) return;
    if(typeof target === "string"){
      document.querySelectorAll(target).forEach(el=> el.classList.add("pin-system","pin-enabled"));
      return;
    }
    target.classList?.add("pin-system","pin-enabled");
  }

  window.MTPinSystem = {
    enable(target){ mark(target); if(typeof window.__pinEnableTarget === "function" && typeof target === "string" && target.startsWith("#")) window.__pinEnableTarget(target); },
    register(target){ mark(target); if(typeof window.__pinEnableTarget === "function" && typeof target === "string" && target.startsWith("#")) window.__pinEnableTarget(target); }
  };

  function boot(){
    document.querySelectorAll(".pin-system,.pin-enabled").forEach(mark);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, {once:true});
  else boot();
})();
