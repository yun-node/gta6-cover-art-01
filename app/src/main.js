// Wires the page: add photos, place them in panels, crop by drag and wheel,
// pick a layout and a colour grade, type the caption, export a PNG in one
// of three post sizes. A `?shot=` query sets up a fixed scene for a
// screenshot instead (./shots.js). Photos are read on this machine only.
import { drawCover, drawCoverTo, defaultState, panelRects, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const state = defaultState();
const library = []; // { img, url, name } — photos added this session
let picked = -1; // index into library, chosen in the tray
let selected = 0; // panel index being cropped
let sizeKey = 'square';

function redraw() {
  const size = SIZES[sizeKey];
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  drawCover(canvas, state);
  syncPanelControls();
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Panel rectangles in canvas pixels, matching cover.js's geometry. */
function panelPixels() {
  const w = canvas.width;
  const h = canvas.height;
  const margin = Math.round(w * 0.028);
  const bandH = Math.round(h * 0.24);
  const area = { x: margin, y: margin, w: w - margin * 2, h: h - margin * 2 - bandH };
  return panelRects(state.layout).map((r) => ({
    x: area.x + r.x * area.w,
    y: area.y + r.y * area.h,
    w: r.w * area.w,
    h: r.h * area.h,
  }));
}

/** Which panel (if any) holds canvas point (x, y). */
function panelAt(x, y) {
  return panelPixels().findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
}

function syncPanelControls() {
  const frame = state.frames[selected] ?? { zoom: 1, dx: 0, dy: 0 };
  document.getElementById('panelName').textContent = String(selected + 1);
  document.getElementById('zoom').value = frame.zoom;
  document.getElementById('panX').value = frame.dx;
  document.getElementById('panY').value = frame.dy;
}

function setSelected(i) {
  selected = i;
  syncPanelControls();
}

/** Rebuilds the photo tray thumbnails from the library. */
function renderTray() {
  const tray = document.getElementById('tray');
  tray.textContent = '';
  library.forEach((entry, i) => {
    const thumb = document.createElement('img');
    thumb.src = entry.url;
    thumb.alt = entry.name;
    if (i === picked) thumb.classList.add('picked');
    thumb.addEventListener('click', () => {
      picked = i;
      renderTray();
    });
    tray.appendChild(thumb);
  });
}

/** Adds image files to the library and places the first into empty panels. */
async function addFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(file);
    const img = await loadImage(url);
    library.push({ img, url, name: file.name });
    picked = library.length - 1;
  }
  renderTray();
  // First photo fills every empty panel, so one photo is already a cover.
  if (library.length === 1) {
    panelRects(state.layout).forEach((_, i) => { state.photos[i] = library[0].img; });
  }
  redraw();
}

document.getElementById('photos').addEventListener('change', (e) => addFiles([...e.target.files]));
document.getElementById('fillAll').addEventListener('click', () => {
  if (picked < 0) { status.textContent = 'Add a photo first.'; return; }
  panelRects(state.layout).forEach((_, i) => { state.photos[i] = library[picked].img; });
  redraw();
  status.textContent = 'One photo now fills every panel.';
});
document.getElementById('trySamples').addEventListener('click', async () => {
  await loadSamplesIntoLibrary();
  status.textContent = 'Samples loaded — click a photo, then a panel.';
});

async function loadSamplesIntoLibrary() {
  for (const name of ['pier', 'boulevard']) {
    if (library.some((e) => e.name === name)) continue;
    const img = await loadImage(`samples/${name}.jpg`);
    library.push({ img, url: `samples/${name}.jpg`, name });
  }
  picked = 0;
  renderTray();
  const [pier, boulevard] = [library.find((e) => e.name === 'pier'), library.find((e) => e.name === 'boulevard')];
  if (pier) state.photos[0] = pier.img;
  if (boulevard) { state.photos[1] = boulevard.img; state.photos[2] = boulevard.img; }
  if (pier) state.photos[3] = pier.img;
  redraw();
}

function wireSegment(id, onPick) {
  const group = document.getElementById(id);
  group.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      group.querySelectorAll('button').forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      onPick(btn.dataset);
    });
  });
}
wireSegment('layouts', (d) => { state.layout = d.layout; setSelected(0); redraw(); });
wireSegment('grades', (d) => { state.grade = d.grade; redraw(); });
wireSegment('sizes', (d) => { sizeKey = d.size; redraw(); });

document.getElementById('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
document.getElementById('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
document.getElementById('zoom').addEventListener('input', (e) => { state.frames[selected].zoom = Number(e.target.value); redraw(); });
document.getElementById('panX').addEventListener('input', (e) => { state.frames[selected].dx = Number(e.target.value); redraw(); });
document.getElementById('panY').addEventListener('input', (e) => { state.frames[selected].dy = Number(e.target.value); redraw(); });

// Click a panel to select it (and place the picked photo); drag to pan it.
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  const i = panelAt(x, y);
  if (i < 0) return;
  setSelected(i);
  if (picked >= 0 && library[picked]) state.photos[i] = library[picked].img;
  drag = { i, x, y };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  const panel = panelPixels()[drag.i];
  const frame = state.frames[drag.i];
  frame.dx = Math.max(-0.4, Math.min(0.4, frame.dx + (x - drag.x) / panel.w));
  frame.dy = Math.max(-0.4, Math.min(0.4, frame.dy + (y - drag.y) / panel.h));
  drag = { ...drag, x, y };
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const frame = state.frames[selected];
  frame.zoom = Math.max(1, Math.min(2.5, frame.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  redraw();
}, { passive: false });

document.getElementById('export').addEventListener('click', () => {
  const size = SIZES[sizeKey];
  const out = drawCoverTo(size.w, size.h, state);
  out.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${size.w}x${size.h}.png`;
    a.click();
    status.textContent = `Saved vice-cover-${size.w}x${size.h}.png`;
  }, 'image/png');
});

// Anton (bundled under app/fonts) is the poster's voice; redraw once it lands.
if (document.fonts?.load) {
  document.fonts.load('80px Anton').then(redraw).catch(() => {});
  document.fonts.ready.then(redraw).catch(() => {});
}

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    loadSample: loadImage,
    setState(next) { Object.assign(state, next); },
    setPhotos(photos) { state.photos = photos; },
    setFrames(frames) { state.frames = frames; },
    setSizeKey(key) { sizeKey = key; },
    setTitle(text) { state.title = text; document.getElementById('title').value = text; },
    setSubtitle(text) { state.subtitle = text; document.getElementById('subtitle').value = text; },
    addToLibrary(img, url, name) { library.push({ img, url, name }); picked = 0; renderTray(); },
    redraw,
  });
} else {
  redraw();
}
