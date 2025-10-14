(function(){
  if (typeof window !== 'undefined') {
    window.__DEV_INSPECTOR__ = true;
  }

  var loaded = !!window.__INSPECTOR_LOADED__;
  var bootstrapping = false;

  function ensure(){
    if (loaded || window.__INSPECTOR_LOADED__) return Promise.resolve(true);
    if (bootstrapping) {
      return new Promise(function(resolve){
        var timer = setInterval(function(){
          if (window.__INSPECTOR_LOADED__) {
            clearInterval(timer);
            loaded = true;
            resolve(true);
          }
        }, 50);
      });
    }
    bootstrapping = true;
    return new Promise(function(resolve, reject){
      var script = document.createElement('script');
      script.src = '/inspector.js';
      script.onload = function(){
        loaded = true;
        window.__INSPECTOR_LOADED__ = true;
        bootstrapping = false;
        resolve(true);
      };
      script.onerror = function(err){
        bootstrapping = false;
        reject(err);
      };
      document.head.appendChild(script);
    });
  }

  function toggle(){
    if (window.DevInspector && typeof window.DevInspector.toggle === 'function') {
      window.DevInspector.toggle();
    }
  }

  function handleToggle(){
    ensure().then(toggle).catch(function(err){
      console.error('[Inspector] load failed', err);
    });
  }

  document.addEventListener('keydown', function(e){
    var code = e.code || '';
    var key = e.key || '';
    if (e.altKey && e.shiftKey && (code === 'KeyC' || key === 'C' || key === 'c')) {
      try { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); } catch(_) {}
      handleToggle();
    }
  }, { capture: true });

  try {
    var params = new URLSearchParams(location.search);
    var flag = localStorage.getItem('inspector') === '1';
    if (params.get('inspector') === '1') {
      localStorage.setItem('inspector', '1');
      handleToggle();
    } else if (params.get('inspector') === '0') {
      localStorage.removeItem('inspector');
    } else if (flag) {
      handleToggle();
    }
  } catch(_) {}
})();
