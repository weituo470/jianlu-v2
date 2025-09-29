// Dev Inspector (ASCII-safe)
(function(){
  'use strict';
  var inspectorEnabled = false;
  var overlay = null;
  var currentHighlight = null;

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
    info.style.maxWidth = '340px';
    info.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';

    var tagName = el.tagName.toLowerCase();
    var elId = el.id ? ('#' + el.id) : '';
    var elCls = el.className ? ('.' + String(el.className).split(' ').join('.')) : '';
    var devPath = el.getAttribute('data-dev-path');

    var html = '<div style="margin-bottom:4px;"><strong>' + tagName + '</strong>' + elId + elCls + '</div>';
    if (devPath) {
      html += '<div style="color:#4fc3f7; margin-bottom:4px; word-break:break-all;">FILE ' + devPath + '</div>';
      html += '<div style="color:#81c784; font-size:11px;">TIP click to open file</div>';
    } else {
      html += '<div style="color:#ff9800; font-size:11px;">WARN no dev-path</div>';
    }
    info.innerHTML = html;

    var top = rect.top + scrollY + rect.height + 5;
    var left = rect.left + scrollX;
    // keep inside viewport after appended (approx)
    info.style.top = top + 'px';
    info.style.left = left + 'px';
    document.body.appendChild(info);
    var b = info.getBoundingClientRect();
    if (left + b.width > window.innerWidth) info.style.left = (window.innerWidth - b.width - 10) + 'px';
    if (top + b.height > window.innerHeight) info.style.top = (rect.top + scrollY - b.height - 5) + 'px';
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
    setTimeout(function(){ n.style.opacity = '0'; n.style.transform = 'translateY(-20px)'; setTimeout(function(){ if(n.parentNode) n.parentNode.removeChild(n); }, 300); }, 3000);
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
    if (inspectorEnabled) {
      document.body.style.cursor = 'crosshair';
      console.log('[Dev Inspector] Enabled - press Escape or hotkey to close');
      showNotification('inspector enabled', 'info');
    } else {
      document.body.style.cursor = '';
      hideHighlight();
      console.log('[Dev Inspector] Disabled');
      showNotification('inspector disabled', 'info');
    }
  }

  document.addEventListener('keydown', function(e){
    var c = e.code || '';
    var k = e.key || '';
    if (e.altKey && e.shiftKey && (c==='KeyC' || k==='C' || k==='c')) { e.preventDefault(); toggleInspector(); }
    if (e.altKey && e.shiftKey && (c==='KeyX' || k==='X' || k==='x')) { e.preventDefault(); toggleInspector(); }
    if (e.ctrlKey && e.shiftKey && (c==='KeyK' || k==='K' || k==='k')) { e.preventDefault(); toggleInspector(); }
    if (k === 'Escape' && inspectorEnabled) { e.preventDefault(); toggleInspector(); }
  }, {passive:true, capture:true});

  document.addEventListener('mouseover', function(e){
    if (!inspectorEnabled) return;
    var t = e.target.closest('[data-dev-path]');
    if (t) highlightElement(t); else hideHighlight();
  });

  document.addEventListener('click', function(e){
    if (!inspectorEnabled) return;
    var t = e.target.closest('[data-dev-path]');
    if (t) {
      e.preventDefault(); e.stopPropagation();
      var fp = t.getAttribute('data-dev-path'); if (fp) openInVSCode(fp);
    }
  }, true);

  document.addEventListener('click', function(e){
    if (!inspectorEnabled) return;
    var t = e.target.closest('[data-dev-path]');
    if (!t) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  document.addEventListener('visibilitychange', function(){ if (document.hidden && inspectorEnabled) hideHighlight(); });
  window.addEventListener('resize', function(){ if (inspectorEnabled && currentHighlight) highlightElement(currentHighlight); });

  window.DevInspector = { toggle: toggleInspector, isEnabled: function(){ return inspectorEnabled; } };
  window.__INSPECTOR_LOADED__ = true;
  console.log('[Dev Inspector] loaded');
})();
