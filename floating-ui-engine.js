(function(){
  const ROOT_ID = 'mtFloatingRoot';

  function ensureRoot(){
    let root = document.getElementById(ROOT_ID);
    if(root) return root;
    root = document.createElement('div');
    root.id = ROOT_ID;
    // html içine koy: scroll akışından ve layout itmelerinden tamamen ayrı olsun
    (document.documentElement || document.body).appendChild(root);
    return root;
  }

  function clamp(v, min, max){
    return Math.min(Math.max(v, min), max);
  }

  function parsePos(raw){
    if(!raw) return null;
    try{
      const p = JSON.parse(raw);
      const x = Number.isFinite(p.x) ? p.x : (Number.isFinite(p.left) ? p.left : parseFloat(p.left));
      const y = Number.isFinite(p.y) ? p.y : (Number.isFinite(p.top) ? p.top : parseFloat(p.top));
      if(Number.isFinite(x) && Number.isFinite(y)) return { x, y };
    }catch(_){ }
    return null;
  }

  function savePos(key, pos){
    if(!key || !pos) return;
    try{
      localStorage.setItem(key, JSON.stringify({ x: Math.round(pos.x), y: Math.round(pos.y) }));
    }catch(_){ }
  }

  function readPos(key, fallback){
    const parsed = parsePos(key ? localStorage.getItem(key) : null);
    return parsed || fallback || null;
  }

  function rectSize(el){
    const r = el.getBoundingClientRect();
    return { w: Math.max(1, Math.round(r.width)), h: Math.max(1, Math.round(r.height)) };
  }

  function clampPos(el, pos, margin){
    const { w, h } = rectSize(el);
    const m = Number.isFinite(margin) ? margin : 8;
    return {
      x: clamp(pos.x, m, Math.max(m, window.innerWidth - w - m)),
      y: clamp(pos.y, m, Math.max(m, window.innerHeight - h - m))
    };
  }

  function applyPos(el, pos){
    if(!el || !pos) return;
    el.style.left = Math.round(pos.x) + 'px';
    el.style.top = Math.round(pos.y) + 'px';
    el.dataset.fx = String(Math.round(pos.x));
    el.dataset.fy = String(Math.round(pos.y));
  }

  function register(options){
    if(!options || !options.id || !options.element) return null;
    const root = ensureRoot();
    const el = options.element;
    const handle = options.handle || el;
    const storageKey = options.storageKey || ('mt_float_' + options.id);
    const margin = Number.isFinite(options.margin) ? options.margin : 8;
    const defaultPos = options.defaultPosition || { x: 16, y: 16 };

    if(el.parentElement !== root) root.appendChild(el);
    el.classList.add('mt-floating-item');
    el.dataset.floatId = options.id;
    el.style.position = 'absolute';
    el.style.right = 'auto';
    el.style.bottom = 'auto';

    let current = readPos(storageKey, defaultPos);
    requestAnimationFrame(() => {
      current = clampPos(el, current, margin);
      applyPos(el, current);
      savePos(storageKey, current);
    });

    let dragging = false;
    let moved = false;
    let startX = 0, startY = 0, baseX = 0, baseY = 0;

    function onMove(e){
      if(!dragging) return;
      const next = clampPos(el, {
        x: baseX + (e.clientX - startX),
        y: baseY + (e.clientY - startY)
      }, margin);
      moved = moved || Math.abs(e.clientX - startX) > 3 || Math.abs(e.clientY - startY) > 3;
      current = next;
      applyPos(el, current);
    }

    function stopDrag(){
      if(!dragging) return;
      dragging = false;
      el.classList.remove('dragging');
      document.removeEventListener('pointermove', onMove, true);
      document.removeEventListener('pointerup', stopDrag, true);
      document.removeEventListener('pointercancel', stopDrag, true);
      current = clampPos(el, current, margin);
      applyPos(el, current);
      savePos(storageKey, current);
      setTimeout(() => { moved = false; }, 0);
    }

    handle.addEventListener('pointerdown', (e) => {
      if(e.button !== 0) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      baseX = Number(el.dataset.fx || current.x || defaultPos.x);
      baseY = Number(el.dataset.fy || current.y || defaultPos.y);
      el.classList.add('dragging');
      if(handle.setPointerCapture){ try{ handle.setPointerCapture(e.pointerId); }catch(_){ } }
      document.addEventListener('pointermove', onMove, true);
      document.addEventListener('pointerup', stopDrag, true);
      document.addEventListener('pointercancel', stopDrag, true);
      e.preventDefault();
    }, true);

    handle.addEventListener('click', (e) => {
      if(!moved) return;
      e.preventDefault();
      e.stopPropagation();
    }, true);

    function onResize(){
      current = clampPos(el, current || defaultPos, margin);
      applyPos(el, current);
      savePos(storageKey, current);
    }
    window.addEventListener('resize', onResize, { passive:true });

    return {
      id: options.id,
      element: el,
      handle,
      getPosition(){ return { x: Number(el.dataset.fx), y: Number(el.dataset.fy) }; },
      setPosition(pos){ current = clampPos(el, pos, margin); applyPos(el, current); savePos(storageKey, current); },
      reset(){ current = clampPos(el, defaultPos, margin); applyPos(el, current); savePos(storageKey, current); }
    };
  }

  window.MTFloatingUI = { ensureRoot, register, clamp, savePos, readPos };
})();
