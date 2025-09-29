// Dev Inspector (ASCII-safe) with URL + Component ID
(function(){
  'use strict';
  var inspectorEnabled = false;
  var overlay = null;
  var currentHighlight = null;
  var pressTimer = null;

  var ID_ATTRS = ['id','data-component-id','data-comp-id','data-id','data-testid','data-key','data-view-id'];
  function findComponentRoot(el){
    var cur = el; var seen = 0;
    while (cur && cur.nodeType === 1 && seen < 12){
      for (var i=0;i<ID_ATTRS.length;i++){ var a = ID_ATTRS[i]; var v = cur.getAttribute && cur.getAttribute(a); if (v){ return {root: cur, attr: a, value: v}; } }
      cur = cur.parentElement; seen++;
    }
    return {root: null, attr: '', value: ''};
  }

  function createOverlay(){
    overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.border = '2px dashed #007bff';
    overlay.style.backgroundColor = 'rgba(0,123,255,0.2)';
    overlay.style.zIndex = '99999';
    overlay.style.pointerEvents = 'none';
    overlay.style.display = 'none';
    overlay.style.transition = 'all 0.1s ease';
    document.body.appendChild(overlay);
  }

  function getCssPath(el){
    try {
      if (!el || !el.tagName) return '';
      if (el.id) return el.tagName.toLowerCase() + '#' + el.id;
      var path = [];
      var cur = el;
      while (cur && cur.nodeType === 1 && path.length < 7) {
        var sel = cur.tagName.toLowerCase();
        var cls = String(cur.className || '').trim();
        if (cls) sel += '.' + cls.split(/\s+/).slice(0,2).join('.');
        var nth = 1, sib = cur;
        while ((sib = sib.previousElementSibling)) { if (sib.tagName === cur.tagName) nth++; }
        sel += ':nth-of-type(' + nth + ')';
        path.unshift(sel);
        cur = cur.parentElement;
      }
      return path.join(' > ');
    } catch(e) { return ''; }
  }

  function highlightElement(el){
    if (!el || !overlay) return;
    var r = el.getBoundingClientRect();
    var scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    var scrollY = window.pageYOffset || document.documentElement.scrollTop;
    overlay.style.width = r.width + 'px';
    overlay.style.height = r.height + 'px';
    overlay.style.top = (r.top + scrollY) + 'px';
    overlay.style.left = (r.left + scrollX) + 'px';
    overlay.style.display = 'block';
    currentHighlight = el;
    showElementInfo(el, r, scrollX, scrollY);
  }

  function showElementInfo(el, rect, scrollX, scrollY){
    var old = document.getElementById('dev-inspector-info');
    if (old) old.remove();
    var info = document.createElement('div');
    info.id = 'dev-inspector-info';
    info.style.position = 'fixed';
    info.style.backgroundColor = '#1a1a1a';
    info.style.color = '#fff';
    info.style.padding = '8px 12px';
    info.style.borderRadius = '4px';
    info.style.fontSize = '12px';
    info.style.fontFamily = 'Monaco, Consolas, monospace';
    info.style.zIndex = '100000';
    info.style.maxWidth = '420px';
    info.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';

    var tagName = el && el.tagName ? el.tagName.toLowerCase() : 'node';
    var elId = el && el.id ? ('#' + el.id) : '';
    var elCls = el && el.className ? ('.' + String(el.className).split(' ').join('.')) : '';
    var devPath = (el && el.getAttribute && el.getAttribute('data-dev-path')) || guessFile(el);
    var comp = findComponentRoot(el);
    var pageUrl = String(location.origin + location.pathname + location.search + location.hash);

    var html = '';
    html += '<div style="margin-bottom:4px;"><strong>' + tagName + '</strong>' + elId + elCls + '</div>';
    html += '<div style="color:#a3d3ff; margin-bottom:4px; word-break:break-all;">URL ' + pageUrl + '</div>';
    html += '<div style="color:#81c784; margin-bottom:4px;">ID ' + (comp.value||'(none)') + (comp.attr?(' ['+comp.attr+']'):'') + '</div>';
    if (devPath) html += '<div style="color:#4fc3f7; margin-bottom:4px; word-break:break-all;">FILE ' + devPath + '</div>';
    html += '<div style="color:#81c784; font-size:11px;">TIP hold mouse (0.5s) to copy FILE/ID</div>';
    info.innerHTML = html;

    var top = rect.top + scrollY + rect.height + 5;
    var left = rect.left + scrollX;
    document.body.appendChild(info);
    var b = info.getBoundingClientRect();
    if (left + b.width > window.innerWidth) left = window.innerWidth - b.width - 10;
    if (top + b.height > window.innerHeight) top = rect.top + scrollY - b.height - 5;
    info.style.top = top + 'px';
    info.style.left = left + 'px';
  }

  function hideHighlight(){
    if (overlay) overlay.style.display = 'none';
    var info = document.getElementById('dev-inspector-info');
    if (info) info.remove();
    currentHighlight = null;
  }

  function showNotification(message, type){
    type = type || 'info';
    var n = document.createElement('div');
    n.style.position = 'fixed';
    n.style.top = '20px';
    n.style.right = '20px';
    n.style.backgroundColor = type === 'info' ? '#007bff' : (type==='success'?'#28a745':'#e74c3c');
    n.style.color = 'white';
    n.style.padding = '12px 20px';
    n.style.borderRadius = '4px';
    n.style.fontSize = '14px';
    n.style.zIndex = '100001';
    n.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    n.style.opacity = '0';
    n.style.transform = 'translateY(-20px)';
    n.style.transition = 'all 0.3s ease';
    n.textContent = message;
    document.body.appendChild(n);
    setTimeout(function(){ n.style.opacity = '1'; n.style.transform = 'translateY(0)'; }, 10);
    setTimeout(function(){ n.style.opacity = '0'; n.style.transform = 'translateY(-20px)'; setTimeout(function(){ if(n.parentNode) n.parentNode.removeChild(n); }, 300); }, 1800);
  }

  function copyText(str){
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(str);
      } else {
        var ta = document.createElement('textarea'); ta.value = String(str||'');
        ta.style.position='fixed'; ta.style.left='-2000px'; document.body.appendChild(ta);
        ta.focus(); ta.select(); try { document.execCommand('copy'); } catch(_) {}
        document.body.removeChild(ta);
      }
      showNotification('copied: ' + (String(str).slice(0,80)), 'success');
    } catch(e) { showNotification('copy failed', 'error'); }
  }

  function openInVSCode(filePath){
    if (!filePath) { showNotification('empty file path', 'error'); return; }
    try {
      var a = document.createElement('a'); a.href = 'vscode://file/' + String(filePath).replace(/\\\\/g,'/'); a.style.display='none';
      document.body.appendChild(a); a.click(); setTimeout(function(){ if(a&&a.parentNode) a.parentNode.removeChild(a);}, 1000);
      showNotification('open in VS Code: ' + filePath, 'success');
      return;
    } catch (e) { console.warn('[Dev Inspector] vscode:// failed', e); }
    fetch('/__open-in-editor?file=' + encodeURIComponent(filePath)).then(function(r){
      if (r.ok) showNotification('open in VS Code: ' + filePath, 'success'); else showNotification('open failed', 'error');
    }).catch(function(){ showNotification('request failed', 'error'); });
  }

  function toggleInspector(){
    inspectorEnabled = !inspectorEnabled;
    if (!overlay) createOverlay();
    if (inspectorEnabled) { document.body.style.cursor = 'crosshair'; console.log('[Dev Inspector] Enabled - press Escape or hotkey to close'); showNotification('inspector enabled', 'info');} else {
      document.body.style.cursor = '';
      hideHighlight();
      console.log('[Dev Inspector] Disabled');
      showNotification('inspector disabled', 'info');
    }
  }

  // Keyboard hotkeys (not passive)
  document.addEventListener('keydown', function(e){
    var c = e.code || '';
    var k = e.key || '';
    var combo = (e.altKey && e.shiftKey && (c==='KeyC' || k==='C' || k==='c')) ||                (e.altKey && e.shiftKey && (c==='KeyX' || k==='X' || k==='x')) ||                (e.ctrlKey && e.shiftKey && (c==='KeyK' || k==='K' || k==='k')) ||                (k==='Escape' && inspectorEnabled) || (inspectorEnabled && (c==='KeyM' || k==='m' || k==='M'));
    if (combo) { try { e.preventDefault(); e.stopPropagation(); } catch(_) {} if(inspectorEnabled && (c==='KeyM' || k==='m' || k==='M')){ if(currentHighlight) promptMap(currentHighlight); } else { toggleInspector(); } }
  }, {capture:true});

  // Highlight on hover (any element; prefer data-dev-path if present)
  document.addEventListener('mouseover', function(e){
    if (!inspectorEnabled) return;
    var t = e.target.closest ? (e.target.closest('[data-dev-path]') || e.target) : e.target;
    highlightElement(t);
  }, true);

  // Long-press to copy URL + ID (+ FILE/PATH)
  function startPressTimer(target){
    clearPressTimer();
    pressTimer = setTimeout(function(){
      var el = (target && target.closest) ? (target.closest('[data-dev-path]') || target) : target;
      var dev = (el && el.getAttribute && el.getAttribute('data-dev-path'));
      var comp = findComponentRoot(el);
      var url = String(location.origin + location.pathname + location.search + location.hash);
      var out = 'URL ' + url + '\n' + 'ID ' + (comp.value||'(none)');
      out += '\n' + (dev ? ('FILE ' + dev) : ('PATH ' + getCssPath(el)));
      copyText(out);
    }, 500);
  }
  function clearPressTimer(){ if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } }
  document.addEventListener('mousedown', function(e){ if (inspectorEnabled) startPressTimer(e.target); }, true);
  document.addEventListener('mouseup', function(){ clearPressTimer(); }, true);
  document.addEventListener('mouseleave', function(){ clearPressTimer(); }, true);

  // Click to open in editor if data-dev-path exists
  document.addEventListener('click', function(e){
    if (!inspectorEnabled) return;
    var t = e.target.closest ? e.target.closest('[data-dev-path]') : null;
    if (t) { try { e.preventDefault(); e.stopPropagation(); } catch(_) {} var fp = t.getAttribute('data-dev-path'); if (fp) openInVSCode(fp); }
  }, true);

  // Keep overlay valid
  document.addEventListener('visibilitychange', function(){ if (document.hidden && inspectorEnabled) hideHighlight(); });
  window.addEventListener('resize', function(){ if (inspectorEnabled && currentHighlight) highlightElement(currentHighlight); });

  window.DevInspector = { toggle: toggleInspector, isEnabled: function(){ return inspectorEnabled; } };
  window.__INSPECTOR_LOADED__ = true;
  console.log('[Dev Inspector] loaded');
})();




