/**
 * Stage 9 — Gallery page JavaScript.
 *
 * Fetches records from PocketBase, renders a pixel-art card grid,
 * supports pagination, lightbox, and a thumbs-up/thumbs-down rating
 * system backed by the separate `pc_ratings` collection.
 *
 * Sort modes:
 *   newest       — server-side sort=-created (paginated normally)
 *   hottest      — client-side sort by net score (up − down), all records fetched
 *   undiscovered — client-side: unrated artwork sorted oldest-first
 */
import { POCKETBASE_URL, GALLERY_COLLECTION, RATINGS_COLLECTION } from './core/Config.js';

const PER_PAGE     = 48;
let   _currentPage = 1;
let   _totalPages  = 1;
let   _currentSort = 'newest'; // 'newest' | 'hottest' | 'undiscovered'
const _highlightId = new URLSearchParams(location.search).get('highlight');

// In-memory vote counts: { [artworkId]: { up: N, down: N } }
let _voteCounts = {};

// Full record cache used by hottest / undiscovered (client-side sort)
let _allRecords    = [];
let _sortedRecords = []; // derived from _allRecords after sort/filter

// ─── Anonymous voter identity ─────────────────────────────────────────────────

function _voterId() {
  let id = localStorage.getItem('pc_voter_id');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('pc_voter_id', id); }
  return id;
}

// { [artworkId]: 'up' | 'down' }
function _myVotes() {
  return JSON.parse(localStorage.getItem('pc_my_votes') || '{}');
}
function _saveMyVote(artworkId, type) {
  const v = _myVotes();
  v[artworkId] = type;
  localStorage.setItem('pc_my_votes', JSON.stringify(v));
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  _loadPage(1);

  // Sort toolbar
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.sort === _currentSort) return;
      _currentSort = btn.dataset.sort;
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Reset caches for client-side sorted modes
      _allRecords    = [];
      _sortedRecords = [];
      _voteCounts    = {};
      _loadPage(1);
    });
  });

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

// ─── Fetch helpers ────────────────────────────────────────────────────────────

/**
 * Fetch votes for a specific list of artwork IDs and merge into _voteCounts.
 * Used for the "newest" paged mode.
 */
async function _fetchVotesForIds(ids) {
  if (!ids.length) return;
  const filter = ids.map(id => `artwork_id="${id}"`).join('||');
  const url = `${POCKETBASE_URL}/api/collections/${RATINGS_COLLECTION}/records`
            + `?filter=${encodeURIComponent(filter)}&perPage=500`;
  try {
    const res  = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    for (const r of data.items) {
      if (!_voteCounts[r.artwork_id]) _voteCounts[r.artwork_id] = { up: 0, down: 0 };
      if (r.vote === 1)  _voteCounts[r.artwork_id].up++;
      if (r.vote === -1) _voteCounts[r.artwork_id].down++;
    }
  } catch (_) { /* non-fatal */ }
}

/**
 * Fetch ALL gallery records and ALL ratings into memory.
 * Used once when switching to hottest / undiscovered modes.
 */
async function _loadAllRecordsAndVotes() {
  // Fetch all gallery records (up to 500 across paginated requests)
  let allItems = [], page = 1;
  while (true) {
    const res  = await fetch(
      `${POCKETBASE_URL}/api/collections/${GALLERY_COLLECTION}/records?perPage=200&page=${page}`
    );
    if (!res.ok) break;
    const data = await res.json();
    allItems = allItems.concat(data.items);
    if (page >= (data.totalPages ?? 1)) break;
    page++;
  }

  // Fetch all ratings (up to 500)
  _voteCounts = {};
  try {
    const rRes  = await fetch(
      `${POCKETBASE_URL}/api/collections/${RATINGS_COLLECTION}/records?perPage=500`
    );
    if (rRes.ok) {
      const rData = await rRes.json();
      for (const r of rData.items) {
        if (!_voteCounts[r.artwork_id]) _voteCounts[r.artwork_id] = { up: 0, down: 0 };
        if (r.vote === 1)  _voteCounts[r.artwork_id].up++;
        if (r.vote === -1) _voteCounts[r.artwork_id].down++;
      }
    }
  } catch (_) { /* non-fatal */ }

  _allRecords = allItems;
}

/** Net score for an artwork (used for Hottest sort). */
function _netScore(id) {
  const c = _voteCounts[id];
  return c ? c.up - c.down : 0;
}

// ─── Load page ───────────────────────────────────────────────────────────────

async function _loadPage(page) {
  const grid    = document.getElementById('gallery-grid');
  const status  = document.getElementById('status');
  const moreBtn = document.getElementById('load-more');

  if (page === 1) {
    grid.innerHTML = '';
    status.textContent  = 'Loading…';
    status.style.display = 'block';
    moreBtn.style.display = 'none';
  } else {
    moreBtn.disabled    = true;
    moreBtn.textContent = 'Loading…';
  }

  try {
    if (_currentSort === 'newest') {
      await _loadNewest(page, grid, status, moreBtn);
    } else {
      await _loadClientSorted(page, grid, status, moreBtn);
    }
  } catch (err) {
    status.textContent   = `Failed to load gallery: ${err.message}`;
    status.style.display = 'block';
    if (page > 1) {
      moreBtn.disabled    = false;
      moreBtn.textContent = 'Retry';
    }
  }
}

async function _loadNewest(page, grid, status, moreBtn) {
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

  // Fetch vote counts for this page's records
  await _fetchVotesForIds(data.items.map(r => r.id));

  for (const record of data.items) {
    const card = _buildCard(record);
    grid.appendChild(card);
    if (_highlightId && record.id === _highlightId) _scheduleHighlight(card);
  }

  _updateLoadMore(moreBtn);
}

async function _loadClientSorted(page, grid, status, moreBtn) {
  // Fetch all data on first page load for this sort
  if (page === 1) {
    await _loadAllRecordsAndVotes();

    // Build sorted / filtered list
    if (_currentSort === 'hottest') {
      _sortedRecords = [..._allRecords].sort((a, b) => _netScore(b.id) - _netScore(a.id));
    } else {
      // undiscovered: no ratings at all, oldest first
      _sortedRecords = _allRecords
        .filter(r => {
          const c = _voteCounts[r.id];
          return !c || (c.up === 0 && c.down === 0);
        })
        .sort((a, b) => new Date(a.created) - new Date(b.created));
    }

    _totalPages = Math.max(1, Math.ceil(_sortedRecords.length / PER_PAGE));
  }

  _currentPage = page;

  const slice = _sortedRecords.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (slice.length === 0 && page === 1) {
    status.textContent = _currentSort === 'undiscovered'
      ? 'All artwork has been discovered — nothing left to rate!'
      : 'No artwork yet. Be the first to share!';
    return;
  }
  status.style.display = 'none';

  for (const record of slice) {
    const card = _buildCard(record);
    grid.appendChild(card);
    if (_highlightId && record.id === _highlightId) _scheduleHighlight(card);
  }

  _updateLoadMore(moreBtn);
}

function _updateLoadMore(moreBtn) {
  if (_currentPage < _totalPages) {
    moreBtn.style.display = 'inline-block';
    moreBtn.disabled      = false;
    moreBtn.textContent   = 'Load more';
  } else {
    moreBtn.style.display = 'none';
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
  img.src     = imgUrl;
  img.alt     = record.title || 'Pixel art';
  img.loading = 'lazy';

  img.addEventListener('load', () => _applyIntegerScale(img, imgWrap));
  if (record.width && record.height) {
    _applyIntegerScaleFromDims(img, imgWrap, record.width, record.height);
  }

  imgWrap.appendChild(img);

  if (record.format === 'gif' && record.frame_count > 1) {
    const badge = document.createElement('span');
    badge.className   = 'badge';
    badge.textContent = 'GIF';
    imgWrap.appendChild(badge);
  }

  card.appendChild(imgWrap);

  const info = document.createElement('div');
  info.className = 'card-info';

  const titleEl = document.createElement('div');
  titleEl.className   = 'card-title';
  titleEl.textContent = record.title || 'Untitled';
  info.appendChild(titleEl);

  const meta = document.createElement('div');
  meta.className = 'card-meta';
  const artist = record.artist ? `by ${record.artist}` : '';
  const dims   = record.width && record.height ? `${record.width}×${record.height}px` : '';
  meta.textContent = [artist, dims].filter(Boolean).join(' · ');
  info.appendChild(meta);

  card.appendChild(info);
  card.appendChild(_buildRatingRow(record.id));

  return card;
}

// ─── Rating pill ─────────────────────────────────────────────────────────────

function _buildRatingRow(artworkId) {
  const counts = _voteCounts[artworkId] || { up: 0, down: 0 };
  const myVote = _myVotes()[artworkId];

  const row = document.createElement('div');
  row.className = 'card-rating';
  // Prevent card click (lightbox) when interacting with rating buttons
  row.addEventListener('click', e => e.stopPropagation());

  const upBtn = document.createElement('button');
  upBtn.className   = 'rate-btn rate-up' + (myVote === 'up' ? ' voted' : '');
  upBtn.title       = 'Thumbs up';
  upBtn.innerHTML   = `${_thumbUpSVG()}<span class="rate-count">${counts.up}</span>`;

  const downBtn = document.createElement('button');
  downBtn.className = 'rate-btn rate-down' + (myVote === 'down' ? ' voted' : '');
  downBtn.title     = 'Thumbs down';
  downBtn.innerHTML = _thumbDownSVG();

  upBtn.addEventListener('click', () => _vote(artworkId, 'up', upBtn, downBtn));
  downBtn.addEventListener('click', () => _vote(artworkId, 'down', upBtn, downBtn));

  row.appendChild(upBtn);
  row.appendChild(downBtn);
  return row;
}

// ─── Vote handler ─────────────────────────────────────────────────────────────

async function _vote(artworkId, type, upBtn, downBtn) {
  // Guard: already voted for this artwork
  if (_myVotes()[artworkId]) return;

  // Optimistic update
  if (!_voteCounts[artworkId]) _voteCounts[artworkId] = { up: 0, down: 0 };
  _voteCounts[artworkId][type === 'up' ? 'up' : 'down']++;

  const countSpan = upBtn.querySelector('.rate-count');
  if (countSpan) countSpan.textContent = _voteCounts[artworkId].up;

  const activeBtn   = type === 'up' ? upBtn : downBtn;
  const inactiveBtn = type === 'up' ? downBtn : upBtn;
  activeBtn.classList.add('voted');

  try {
    const res = await fetch(
      `${POCKETBASE_URL}/api/collections/${RATINGS_COLLECTION}/records`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artwork_id: artworkId,
          voter_id:   _voterId(),
          vote:       type === 'up' ? 1 : -1
        })
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _saveMyVote(artworkId, type);
    // Disable both buttons now that vote is committed
    upBtn.disabled   = false; // keep enabled visually (just non-clickable via guard)
    inactiveBtn.style.opacity = '0.5';
    inactiveBtn.style.cursor  = 'default';
  } catch (_) {
    // Revert optimistic update
    _voteCounts[artworkId][type === 'up' ? 'up' : 'down']--;
    if (countSpan) countSpan.textContent = _voteCounts[artworkId].up;
    activeBtn.classList.remove('voted');
  }
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function _openLightbox(record, imgUrl) {
  const lb      = document.getElementById('lightbox');
  const lbImg   = document.getElementById('lb-img');
  const lbTitle = document.getElementById('lb-title');
  const lbMeta  = document.getElementById('lb-meta');
  const lbRating = document.getElementById('lb-rating');

  lbImg.src           = imgUrl;
  lbImg.alt           = record.title || 'Pixel art';
  lbTitle.textContent = record.title || 'Untitled';

  const parts = [];
  if (record.artist)                 parts.push(`by ${record.artist}`);
  if (record.width && record.height) parts.push(`${record.width}×${record.height}px`);
  if (record.frame_count > 1)        parts.push(`${record.frame_count} frames`);
  if (record.format)                 parts.push(record.format.toUpperCase());
  lbMeta.textContent = parts.join(' · ');

  // Rebuild rating pill for lightbox
  lbRating.innerHTML = '';
  lbRating.appendChild(_buildRatingRow(record.id));

  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function _closeLightbox() {
  const lb = document.getElementById('lightbox');
  lb.classList.remove('open');
  document.body.style.overflow = '';
  const lbImg = document.getElementById('lb-img');
  lbImg.src = '';
}

// ─── SVG icons ────────────────────────────────────────────────────────────────

function _thumbUpSVG() {
  return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
  </svg>`;
}

function _thumbDownSVG() {
  return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
    <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
  </svg>`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _scheduleHighlight(card) {
  requestAnimationFrame(() => {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('card--highlight');
    card.addEventListener('animationend', () => card.classList.remove('card--highlight'), { once: true });
  });
}

function _fileUrl(record) {
  const filename = Array.isArray(record.image) ? record.image[0] : record.image;
  return `${POCKETBASE_URL}/api/files/${record.collectionId}/${record.id}/${filename}`;
}

function _applyIntegerScale(img, wrap) {
  _applyIntegerScaleFromDims(img, wrap, img.naturalWidth, img.naturalHeight);
}

function _applyIntegerScaleFromDims(img, wrap, nw, nh) {
  if (!nw || !nh) return;
  const containerPx = wrap.clientWidth || 180;
  const maxDim      = Math.max(nw, nh);
  const scale       = Math.max(1, Math.floor(containerPx / maxDim));
  img.style.width   = (nw * scale) + 'px';
  img.style.height  = (nh * scale) + 'px';
}
