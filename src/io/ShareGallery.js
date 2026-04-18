/**
 * Stage 8 — Share to Gallery.
 *
 * Uploads the current sprite to a PocketBase `pc_gallery` collection.
 * Single-frame sprites are uploaded as PNG; multi-frame as animated GIF.
 */
import { POCKETBASE_URL, GALLERY_COLLECTION } from '../core/Config.js';
import { ExportGIF } from './ExportGIF.js';

export class ShareGallery {
  /**
   * Show the share dialog, collect metadata, and upload.
   * @param {import('../model/Sprite.js').Sprite} sprite
   */
  static async upload(sprite) {
    if (!sprite) return;

    const result = await _showShareDialog(sprite);
    if (!result) return;

    const { title, artist, blob, format } = result;

    try {
      const form = new FormData();
      form.append('title',       title);
      form.append('artist',      artist || '');
      form.append('width',       String(sprite.width));
      form.append('height',      String(sprite.height));
      form.append('frame_count', String(sprite.frames.length));
      form.append('format',      format);
      form.append('image',       blob, `sprite.${format}`);

      const url = `${POCKETBASE_URL}/api/collections/${GALLERY_COLLECTION}/records`;
      const res = await fetch(url, { method: 'POST', body: form });

      if (!res.ok) {
        if (res.status === 429) throw new Error('Rate limit reached. Please wait 5 minutes and try again.');
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }

      const record = await res.json();
      _showResult(true, 'Shared successfully! Your artwork is now in the gallery.', record.id);
    } catch (err) {
      _showResult(false, `Upload failed: ${err.message}`);
    }
  }
}

// ─── Dialog ──────────────────────────────────────────────────────────────────

function _showShareDialog(sprite) {
  return new Promise(resolve => {
    const isAnimated = sprite.frames.length > 1;
    const format     = isAnimated ? 'gif' : 'png';

    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    dialog.style.minWidth = '320px';

    // Title bar
    const titleEl = document.createElement('div');
    titleEl.className = 'dialog-title';
    titleEl.textContent = 'Share to Gallery';
    dialog.appendChild(titleEl);

    // Body
    const body = document.createElement('div');
    body.className = 'dialog-body';

    // Format info
    const info = document.createElement('div');
    info.style.cssText = 'font-size:11px;color:var(--text-muted,#888);margin-bottom:8px;';
    info.textContent = `Will upload as ${format.toUpperCase()} — ${sprite.width}×${sprite.height}px, ${sprite.frames.length} frame${sprite.frames.length > 1 ? 's' : ''}.`;
    body.appendChild(info);

    // Title field
    const titleRow = document.createElement('div');
    titleRow.className = 'dialog-row';
    const titleLabel = document.createElement('label');
    titleLabel.textContent = 'Title *';
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.placeholder = 'My Pixel Art';
    titleInput.style.width = '100%';
    titleRow.appendChild(titleLabel);
    titleRow.appendChild(titleInput);
    body.appendChild(titleRow);

    // Artist field
    const artistRow = document.createElement('div');
    artistRow.className = 'dialog-row';
    const artistLabel = document.createElement('label');
    artistLabel.textContent = 'Artist';
    const artistInput = document.createElement('input');
    artistInput.type = 'text';
    artistInput.placeholder = 'Anonymous';
    artistInput.style.width = '100%';
    artistRow.appendChild(artistLabel);
    artistRow.appendChild(artistInput);
    body.appendChild(artistRow);

    dialog.appendChild(body);

    // Buttons
    const buttons = document.createElement('div');
    buttons.className = 'dialog-buttons';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => { overlay.remove(); resolve(null); };
    buttons.appendChild(cancelBtn);

    const shareBtn = document.createElement('button');
    shareBtn.className = 'btn btn-primary';
    shareBtn.textContent = 'Share';
    shareBtn.onclick = async () => {
      const title = titleInput.value.trim();
      if (!title) { titleInput.focus(); titleInput.style.outline = '2px solid var(--accent,#e06c75)'; return; }

      shareBtn.disabled = true;
      shareBtn.textContent = 'Generating…';

      try {
        let blob;
        if (isAnimated) {
          blob = ExportGIF.toBlob(sprite);
        } else {
          blob = await _canvasToBlob(sprite.getComposited(0));
        }
        overlay.remove();
        resolve({ title, artist: artistInput.value.trim(), blob, format });
      } catch (err) {
        shareBtn.disabled = false;
        shareBtn.textContent = 'Share';
        alert(`Failed to generate image: ${err.message}`);
      }
    };
    buttons.appendChild(shareBtn);
    dialog.appendChild(buttons);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    titleInput.focus();
    dialog.addEventListener('keydown', e => {
      if (e.key === 'Enter') shareBtn.click();
      if (e.key === 'Escape') cancelBtn.click();
    });
  });
}

// ─── Result notification ──────────────────────────────────────────────────────

function _showResult(success, message, recordId = null) {
  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'dialog';
  dialog.style.minWidth = '280px';

  const titleEl = document.createElement('div');
  titleEl.className = 'dialog-title';
  titleEl.textContent = success ? 'Shared!' : 'Error';
  dialog.appendChild(titleEl);

  const body = document.createElement('div');
  body.className = 'dialog-body';
  const msg = document.createElement('p');
  msg.style.cssText = 'margin:0;line-height:1.5;';
  msg.textContent = message;
  body.appendChild(msg);

  if (success) {
    const link = document.createElement('a');
    link.href = recordId ? `gallery.html?highlight=${recordId}` : 'gallery.html';
    link.style.cssText = 'display:block;margin-top:10px;color:var(--accent,#61afef);font-size:12px;';
    link.textContent = 'View in Gallery →';
    body.appendChild(link);
  }
  dialog.appendChild(body);

  const buttons = document.createElement('div');
  buttons.className = 'dialog-buttons';
  const okBtn = document.createElement('button');
  okBtn.className = 'btn btn-primary';
  okBtn.textContent = 'OK';
  okBtn.onclick = () => overlay.remove();
  buttons.appendChild(okBtn);
  dialog.appendChild(buttons);

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  okBtn.focus();
  dialog.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === 'Escape') okBtn.click(); });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('toBlob returned null'));
    }, 'image/png');
  });
}
