(function(){
  const registry = new Map();
  const state = new Map();

  function safeCall(fn, ctx){
    try { return fn && fn.call(ctx); } catch(err){ console.error('[MTWidgetEngine]', err); return null; }
  }

  function register(widget){
    if(!widget || !widget.id) throw new Error('Widget id gerekli');
    registry.set(widget.id, widget);
    if(document.readyState !== 'loading') init(widget.id);
  }

  function init(id){
    const widget = registry.get(id);
    if(!widget || state.has(id)) return;
    const cleanup = safeCall(widget.init, widget);
    state.set(id, { cleanup: typeof cleanup === 'function' ? cleanup : null });
  }

  function destroy(id){
    const active = state.get(id);
    if(active && typeof active.cleanup === 'function'){
      try { active.cleanup(); } catch(err){ console.error('[MTWidgetEngine cleanup]', err); }
    }
    state.delete(id);
  }

  function initAll(){
    registry.forEach((_, id) => init(id));
  }

  function list(){
    return Array.from(registry.keys());
  }

  window.MTWidgetEngine = { register, init, destroy, initAll, list };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll, { once:true });
  else initAll();
})();
