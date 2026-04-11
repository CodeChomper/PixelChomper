/**
 * Stage 8 — Gallery page JavaScript.
 *
 * Fetches records from PocketBase, renders a pixel-art card grid,
 * supports pagination, and shows a full-screen lightbox on click.
 */
import { POCKETBASE_URL, GALLERY_COLLECTION } from './core/Config.js';

const PER_PAGE    = 48;
let   _currentPage = 1;
let   _totalPages  = 1;
const _highlightId = new URLSearchParams(location.search).get('highlight');

// ─── Bootstrap ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  _loadPage(1);

  document.getElementById('load-more').addEventListener('click', () => {
    if (_currentPage < _totalPages) _loadPage(_currentPage + 1);
  });

  document.getElementById('lightbox').addEventListener('click', e => {
    if (e.target === document.getElementById('lightbox') ||
        e.target.id === 'lb-close') {
      _closeLightbox();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') _closeLightbox();
  });
});

// ─── Fetch & render ───────────────────────────────────────────────────────────

async function _loadPage(page) {
  const grid   = document.getElementById('gallery-grid');
  const status = document.getElementById('status');
  const moreBtn = document.getElementById('load-more');

  if (page === 1) {
    grid.innerHTML = '';
    status.textContent = 'Loading…';
    status.style.display = 'block';
    moreBtn.style.display = 'none';
  } else {
    moreBtn.disabled = true;
    moreBtn.textContent = 'Loading…';
  }

  try {
    const url = `${POCKETBASE_URL}/api/collections/${GALLERY_COLLECTION}/records`
              + `?sort=-created&perPage=${PER_PAGE}&page=${page}`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    _totalPages  = data.totalPages ?? 1;
    _currentPage = page;

    if (data.items.length === 0 && page === 1) {
      status.textContent = 'No artwork yet. Be the first to share!';
      return;
    }
    status.style.display = 'none';

    for (const record of data.items) {
      const card = _buildCard(record);
      grid.appendChild(card);
      if (_highlightId && record.id === _highlightId) {
        _scheduleHighlight(card);
      }
    }

    if (_currentPage < _totalPages) {
      moreBtn.style.display = 'inline-block';
      moreBtn.disabled      = false;
      moreBtn.textContent   = 'Load more';
    } else {
      moreBtn.style.display = 'none';
    }
  } catch (err) {
    status.textContent = `Failed to load gallery: ${err.message}`;
    status.style.display = 'block';
    if (page > 1) {
      moreBtn.disabled    = false;
      moreBtn.textContent = 'Retry';
    }
  }
}

// ─── Card builder ─────────────────────────────────────────────────────────────

function _buildCard(record) {
  const imgUrl = _fileUrl(record);

  const card = document.createElement('div');
  card.className = 'card';
  card.addEventListener('click', () => _openLightbox(record, imgUrl));

  const imgWrap = document.createElement('div');
  imgWrap.className = 'card-img-wrap';

  const img = document.createElement('img');
  img.src   = imgUrl;
  img.alt   = record.title || 'Pixel art';
  img.loading = 'lazy';

  // Integer-scale small sprites so every pixel is clearly visible in the card.
  // Wait until the image has loaded (or use stored width/height from the record).
  img.addEventListener('load', () => _applyIntegerScale(img, imgWrap));

  // Use PocketBase metadata for an early hint before the image arrives.
  if (record.width && record.height) {
    _applyIntegerScaleFromDims(img, imgWrap, record.width, record.height);
  }

  imgWrap.appendChild(img);

  if (record.format === 'gif' && record.frame_count > 1) {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = 'GIF';
    imgWrap.appendChild(badge);
  }

  card.appendChild(imgWrap);

  const info = document.createElement('div');
  info.className = 'card-info';

  const titleEl = document.createElement('div');
  titleEl.className = 'card-title';
  titleEl.textContent = record.title || 'Untitled';
  info.appendChild(titleEl);

  const meta = document.createElement('div');
  meta.className = 'card-meta';
  const artist = record.artist ? `by ${record.artist}` : '';
  const dims   = record.width && record.height ? `${record.width}×${record.height}px` : '';
  meta.textContent = [artist, dims].filter(Boolean).join(' · ');
  info.appendChild(meta);

  card.appendChild(info);
  return card;
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function _openLightbox(record, imgUrl) {
  const lb      = document.getElementById('lightbox');
  const lbImg   = document.getElementById('lb-img');
  const lbTitle = document.getElementById('lb-title');
  const lbMeta  = document.getElementById('lb-meta');

  lbImg.src   = imgUrl;
  lbImg.alt   = record.title || 'Pixel art';
  lbTitle.textContent = record.title || 'Untitled';

  const parts = [];
  if (record.artist)                          parts.push(`by ${record.artist}`);
  if (record.width && record.height)          parts.push(`${record.width}×${record.height}px`);
  if (record.frame_count > 1)                 parts.push(`${record.frame_count} frames`);
  if (record.format)                          parts.push(record.format.toUpperCase());
  lbMeta.textContent = parts.join(' · ');

  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function _closeLightbox() {
  const lb = document.getElementById('lightbox');
  lb.classList.remove('open');
  document.body.style.overflow = '';
  // Stop GIF animation by clearing src briefly
  const lbImg = document.getElementById('lb-img');
  lbImg.src = '';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Scroll a newly-shared card into view and pulse it so the user can find it.
 * Uses a short delay so the layout has settled before scrollIntoView fires.
 */
function _scheduleHighlight(card) {
  requestAnimationFrame(() => {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('card--highlight');
    // Remove the class after the animation finishes so it only plays once
    card.addEventListener('animationend', () => card.classList.remove('card--highlight'), { once: true });
  });
}

function _fileUrl(record) {
  const filename = Array.isArray(record.image) ? record.image[0] : record.image;
  return `${POCKETBASE_URL}/api/files/${record.collectionId}/${record.id}/${filename}`;
}

/**
 * Compute the largest integer scale factor so that `spriteW × scale` fits
 * inside `containerPx`, then apply it to the image element.
 * A minimum scale of 1 is always kept (never shrink).
 */
function _applyIntegerScale(img, wrap) {
  _applyIntegerScaleFromDims(img, wrap, img.naturalWidth, img.naturalHeight);
}

function _applyIntegerScaleFromDims(img, wrap, nw, nh) {
  if (!nw || !nh) return;
  // Use the wrap's rendered size; fall back to a sensible default.
  const containerPx = wrap.clientWidth || 180;
  const maxDim      = Math.max(nw, nh);
  const scale       = Math.max(1, Math.floor(containerPx / maxDim));
  img.style.width   = (nw * scale) + 'px';
  img.style.height  = (nh * scale) + 'px';
}
