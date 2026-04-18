const LS_KEY = 'pixelchomper:storage-notice-dismissed';

export class CookieNotice {
  static init() {
    try {
      if (localStorage.getItem(LS_KEY)) return;
    } catch { return; }

    const bar = document.createElement('div');
    bar.id = 'cookie-notice';
    bar.innerHTML = `
      <span>We use browser storage (localStorage) to save your work and remember your votes. No cookies, tracking, or ads.</span>
      <button id="cookie-notice-btn">Got it</button>
    `;
    document.body.appendChild(bar);

    document.getElementById('cookie-notice-btn').addEventListener('click', () => {
      bar.classList.add('cookie-notice--hidden');
      bar.addEventListener('transitionend', () => bar.remove(), { once: true });
      try { localStorage.setItem(LS_KEY, '1'); } catch { /* ignore */ }
    });
  }
}
