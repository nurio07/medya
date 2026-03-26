(function(){
  const engine = window.MTWidgetEngine;
  if(!engine) return;

  engine.register({
    id: 'havaWidget',
    init(){
      const CACHE_KEY = 'hava_cache_v1';
      const COORD_KEY = 'hava_coords_v1';
      let timer = null;
      let destroyed = false;

      function byId(id){ return document.getElementById(id); }
      function setText(id, val){ const el = byId(id); if(el) el.textContent = (val == null ? '' : String(val)); }

      function iconAndDescFromCode(code){
        const c = Number(code);
        if([0].includes(c)) return ['☀️', 'Açık'];
        if([1].includes(c)) return ['🌤️', 'Az bulutlu'];
        if([2].includes(c)) return ['⛅️', 'Parçalı bulutlu'];
        if([3].includes(c)) return ['☁️', 'Bulutlu'];
        if([45,48].includes(c)) return ['🌫️', 'Sisli'];
        if([51,53,55,56,57].includes(c)) return ['🌦️', 'Çiseleme'];
        if([61,63,65,66,67].includes(c)) return ['🌧️', 'Yağmurlu'];
        if([71,73,75,77].includes(c)) return ['🌨️', 'Karlı'];
        if([80,81,82].includes(c)) return ['🌧️', 'Sağanak'];
        if([85,86].includes(c)) return ['🌨️', 'Kar sağanağı'];
        if([95].includes(c)) return ['⛈️', 'Gök gürültülü'];
        if([96,99].includes(c)) return ['⛈️', 'Dolu / Fırtına'];
        return ['⛅️', 'Hava'];
      }

      function fmtTemp(t){
        const n = Number(t);
        if(!isFinite(n)) return '-';
        return n.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + '°';
      }

      async function fetchWeather(lat, lon){
        const url = 'https://api.open-meteo.com/v1/forecast'
          + '?latitude=' + encodeURIComponent(lat)
          + '&longitude=' + encodeURIComponent(lon)
          + '&current=temperature_2m,weather_code,is_day'
          + '&daily=temperature_2m_max,temperature_2m_min'
          + '&forecast_days=1'
          + '&timezone=auto';
        const res = await fetch(url, { cache: 'no-store' });
        if(!res.ok) throw new Error('Hava API hata: ' + res.status);
        return await res.json();
      }

      async function fetchReverseGeocode(lat, lon){
        const url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2'
          + '&lat=' + encodeURIComponent(lat)
          + '&lon=' + encodeURIComponent(lon)
          + '&zoom=10&addressdetails=1';
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if(!res.ok) return null;
        return await res.json();
      }

      function readCoords(){
        try{
          const c = JSON.parse(localStorage.getItem(COORD_KEY) || 'null');
          if(c && isFinite(c.lat) && isFinite(c.lon)) return c;
        }catch(_){ }
        return null;
      }

      function writeCoords(lat, lon){
        localStorage.setItem(COORD_KEY, JSON.stringify({ lat, lon }));
      }

      async function refresh(){
        if(destroyed) return;
        try{
          setText('hava_line', '-');
          setText('hava_temp', 'Güncelleniyor…');
          setText('hava_desc', '');
          const coords = readCoords();
          if(!coords){
            setText('hava_temp', '-');
            setText('hava_desc', 'Konum gerekli');
            setText('hava_loc', 'Konum: İzin ver');
            return;
          }

          const data = await fetchWeather(coords.lat, coords.lon);
          const cur = data && data.current ? data.current : null;
          const temp = cur ? cur.temperature_2m : null;
          const code = cur ? cur.weather_code : null;
          const isDay = !!(cur && cur.is_day === 1);
          let [ico, desc] = iconAndDescFromCode(code);
          if(!isDay && ['☀️','🌤️','🌤','⛅️'].includes(ico)) ico = '🌙';

          const iconEl = byId('hava_icon');
          if(iconEl) iconEl.textContent = ico;
          setText('hava_temp', fmtTemp(temp));
          setText('hava_desc', desc || '');

          let place = null;
          try{
            const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
            if(cache && cache.place && (Date.now() - cache.t) < 6*60*60*1000) place = cache.place;
          }catch(_){ }

          if(!place){
            try{
              const geo = await fetchReverseGeocode(coords.lat, coords.lon);
              const a = geo && geo.address ? geo.address : {};
              place = (a.city || a.town || a.village || a.county || a.state || a.country || '').toString();
              if(!place) place = (geo && geo.display_name) ? String(geo.display_name).split(',').slice(0,2).join(',') : '';
              localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), place }));
            }catch(_){ }
          }

          const placeShort = (place || '').toString().trim();
          const shortName = (placeShort.split(',')[0] || '').trim() || (coords.lat.toFixed(3)+', '+coords.lon.toFixed(3));
          const daily = data && data.daily ? data.daily : null;
          const hi = daily && Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max[0] : null;
          const lo = daily && Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min[0] : null;
          setText('hava_line', shortName);
          if(Number.isFinite(Number(hi)) || Number.isFinite(Number(lo))){
            const hiTxt = Number.isFinite(Number(hi)) ? Math.round(Number(hi)) + '°' : '-';
            const loTxt = Number.isFinite(Number(lo)) ? Math.round(Number(lo)) + '°' : '-';
            setText('hava_loc', 'Y:' + hiTxt + ' D:' + loTxt);
          } else {
            setText('hava_loc', shortName);
          }
        }catch(err){
          console.log('Hava hatası:', err);
          setText('hava_temp', '-');
          setText('hava_desc', 'Alınamadı');
        }
      }

      function askLocation(){
        if(!navigator.geolocation){
          alert('Tarayıcın konum özelliğini desteklemiyor.');
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            writeCoords(pos.coords.latitude, pos.coords.longitude);
            refresh();
          },
          (err) => {
            console.log('Konum hatası:', err);
            alert('Konum izni verilmedi. Tarayıcı ayarlarından konum iznini açıp tekrar deneyebilirsin.');
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 10*60*1000 }
        );
      }



      const widgetEl = byId('havaWidget');
      const dragHandle = byId('havaHeader') || widgetEl;
      if (widgetEl && typeof window.makeDraggablePersistent === 'function' && !widgetEl.dataset.mtDragBound) {
        widgetEl.dataset.mtDragBound = '1';
        window.makeDraggablePersistent(widgetEl, { handle: dragHandle, key: 'pos_havaWidget' });
      }
      const btnLoc = byId('hava_loc_btn');
      const btnRef = byId('hava_refresh');
      if(btnLoc) btnLoc.addEventListener('click', askLocation);
      if(btnRef) btnRef.addEventListener('click', refresh);

      refresh();
      timer = window.setInterval(refresh, 5 * 60 * 1000);

      return function cleanup(){
        destroyed = true;
        if(btnLoc) btnLoc.removeEventListener('click', askLocation);
        if(btnRef) btnRef.removeEventListener('click', refresh);
        if(timer) window.clearInterval(timer);
      };
    }
  });
})();
