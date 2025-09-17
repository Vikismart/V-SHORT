/* app.js
 - Uses shrtco.de API: https://api.shrtco.de/v2/shorten?url={url}
 - Keeps local history in localStorage under key "shortly_history"
*/

(function(){
  'use strict';

  const SHORTEN_API = 'https://api.shrtco.de/v2/shorten?url=';
  const form = document.getElementById('shortenForm');
  const urlInput = document.getElementById('urlInput');
  const errorBox = document.getElementById('error');
  const successBox = document.getElementById('success');
  const historyEl = document.getElementById('history');
  const clearBtn = document.getElementById('clearHistory');
  const yearEl = document.getElementById('year');

  const STORAGE_KEY = 'shortly_history';

  // utils
  function isValidUrl(s){
    try {
      const u = new URL(s);
      return (u.protocol === 'http:' || u.protocol === 'https:');
    } catch (e) {
      return false;
    }
  }

  function showError(msg){
    errorBox.textContent = msg;
    errorBox.hidden = false;
    successBox.hidden = true;
  }
  function showSuccess(msg){
    successBox.textContent = msg;
    successBox.hidden = false;
    errorBox.hidden = true;
  }
  function clearMessages(){
    errorBox.hidden = true;
    successBox.hidden = true;
  }

  // history management
  function loadHistory(){
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }
  function saveHistory(list){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function renderHistory(){
    const list = loadHistory();
    historyEl.innerHTML = '';
    if (!list.length){
      historyEl.innerHTML = '<div class="small muted">No links yet. Shorten one above.</div>';
      return;
    }
    list.slice().reverse().forEach(item => {
      const el = document.createElement('div');
      el.className = 'history-item';
      el.innerHTML = `
        <div class="link-group">
          <div class="link-original" title="${escapeHtml(item.original)}">${truncate(item.original, 60)}</div>
          <div class="link-short">${escapeHtml(item.short)}</div>
        </div>
        <div class="controls">
          <button class="btn" data-action="open" title="Open">Open</button>
          <button class="btn" data-action="copy" title="Copy">Copy</button>
          <button class="btn btn-ghost" data-action="remove" title="Remove">Remove</button>
        </div>
      `;
      historyEl.appendChild(el);

      const openBtn = el.querySelector('[data-action="open"]');
      const copyBtn = el.querySelector('[data-action="copy"]');
      const removeBtn = el.querySelector('[data-action="remove"]');

      openBtn.addEventListener('click', () => window.open(item.short, '_blank'));
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(item.short);
          showSuccess('Link copied to clipboard');
          setTimeout(clearMessages, 1800);
        } catch (e) {
          showError('Unable to copy. Select and copy manually.');
        }
      });
      removeBtn.addEventListener('click', () => {
        const newList = loadHistory().filter(i => i.short !== item.short || i.original !== item.original);
        saveHistory(newList);
        renderHistory();
      });
    });
  }

  // helpers
  function truncate(s, n){
    if (s.length <= n) return s;
    return s.slice(0, n-40) + '…' + s.slice(-36);
  }
  function escapeHtml(unsafe){
    return unsafe.replace(/[&<"'>]/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
  }

  // submit handler
  form.addEventListener('submit', async function(e){
    e.preventDefault();
    clearMessages();
    const url = urlInput.value.trim();
    if (!url) { showError('Please enter a URL.'); return; }
    if (!isValidUrl(url)) { showError('Please enter a valid URL including http:// or https://'); return; }

    // disable UI while fetching
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Shortening...';

    try {
      const res = await fetch(SHORTEN_API + encodeURIComponent(url), { method:'GET' });
      if (!res.ok) throw new Error('Network response not OK');
      const data = await res.json();
      if (!data || !data.ok) {
        throw new Error(data && data.error ? data.error : 'Shortening failed');
      }

      const short = data.result.full_short_link;
      const entry = { original: url, short: short, created: Date.now() };

      // save to history (avoid duplicates)
      const hist = loadHistory();
      // remove old same original if exists
      const filtered = hist.filter(h => h.original !== entry.original);
      filtered.push(entry);
      saveHistory(filtered);
      renderHistory();

      showSuccess('Shortened: ' + short);
      urlInput.value = '';
      setTimeout(clearMessages, 2000);

    } catch (err) {
      console.error(err);
      showError('Unable to shorten link. ' + (err.message || 'Try again.'));
    } finally {
      btn.disabled = false;
      btn.textContent = 'Shorten It';
    }
  });

  // clear history
  clearBtn.addEventListener('click', function(){
    if (!confirm('Clear all saved shortened links?')) return;
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
    showSuccess('History cleared');
    setTimeout(clearMessages, 1500);
  });

  // initial render
  renderHistory();
  yearEl.textContent = new Date().getFullYear();

})();
