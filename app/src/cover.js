// Draws a GTA-style multi-panel cover: 2-4 photo panels in a white-guttered
// poster grid, a Vice City sunset or neon colour grade over each panel, and a
// big Anton caption in a title band along the foot. Pure canvas, no network.
//
// `state` is { layout, grade, title, subtitle, photos, frames } where
// photos[i] is an image or null and frames[i] is { zoom, dx, dy } — zoom is a
// multiplier on the cover-fit scale, dx/dy are pan offsets as fractions of
// the panel size. `drawCover(canvas, state)` draws at the canvas's own size;
// `drawCoverTo(w, h, state)` returns a fresh canvas at any export size.

export const LAYOUTS = ['duo', 'trio', 'quad'];
export const GRADES = ['sunset', 'neon', 'midnight', 'gold'];
export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 × 1350' },
  wide: { w: 1920, h: 1080, label: '1920 × 1080' },
};

/** A fresh default state: trio layout, sunset grade, empty panels. */
export function defaultState() {
  return {
    layout: 'trio',
    grade: 'sunset',
    title: 'Sunset Heist',
    subtitle: 'VICE NIGHTS',
    photos: [null, null, null, null],
    frames: [
      { zoom: 1, dx: 0, dy: 0 },
      { zoom: 1, dx: 0, dy: 0 },
      { zoom: 1, dx: 0, dy: 0 },
      { zoom: 1, dx: 0, dy: 0 },
    ],
  };
}

/** Panel rectangles for a layout, as fractions of the poster area. */
export function panelRects(layout) {
  if (layout === 'duo') {
    return [
      { x: 0, y: 0, w: 0.4925, h: 1 },
      { x: 0.5075, y: 0, w: 0.4925, h: 1 },
    ];
  }
  if (layout === 'quad') {
    return [
      { x: 0, y: 0, w: 0.4925, h: 0.4925 },
      { x: 0.5075, y: 0, w: 0.4925, h: 0.4925 },
      { x: 0, y: 0.5075, w: 0.4925, h: 0.4925 },
      { x: 0.5075, y: 0.5075, w: 0.4925, h: 0.4925 },
    ];
  }
  // trio: one wide hero panel on top, two below it.
  return [
    { x: 0, y: 0, w: 1, h: 0.6 },
    { x: 0, y: 0.615, w: 0.4925, h: 0.385 },
    { x: 0.5075, y: 0.615, w: 0.4925, h: 0.385 },
  ];
}

const GRADE_STOPS = {
  sunset: ['rgba(255, 176, 66, 0.22)', 'rgba(255, 94, 98, 0.30)', 'rgba(190, 30, 130, 0.42)'],
  neon: ['rgba(255, 0, 170, 0.30)', 'rgba(120, 0, 255, 0.22)', 'rgba(0, 229, 255, 0.30)'],
  midnight: ['rgba(40, 60, 180, 0.28)', 'rgba(90, 20, 160, 0.30)', 'rgba(10, 8, 40, 0.45)'],
  gold: ['rgba(255, 214, 90, 0.28)', 'rgba(255, 140, 40, 0.26)', 'rgba(140, 40, 10, 0.38)'],
};

/** Draws one photo cover-fit into a panel rect, with its zoom/pan frame. */
function drawPanelPhoto(ctx, photo, rect, frame) {
  const iw = photo.naturalWidth || photo.width;
  const ih = photo.naturalHeight || photo.height;
  const scale = Math.max(rect.w / iw, rect.h / ih) * (frame?.zoom ?? 1);
  const pw = iw * scale;
  const ph = ih * scale;
  const cx = rect.x + rect.w / 2 + (frame?.dx ?? 0) * rect.w;
  const cy = rect.y + rect.h / 2 + (frame?.dy ?? 0) * rect.h;
  ctx.drawImage(photo, cx - pw / 2, cy - ph / 2, pw, ph);
}

/** Paints the colour grade and a vignette over one panel. */
function gradePanel(ctx, rect, grade) {
  const stops = GRADE_STOPS[grade] ?? GRADE_STOPS.sunset;
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w * 0.35, rect.y + rect.h);
  g.addColorStop(0, stops[0]);
  g.addColorStop(0.55, stops[1]);
  g.addColorStop(1, stops[2]);
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const v = ctx.createRadialGradient(
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.min(rect.w, rect.h) * 0.35,
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.max(rect.w, rect.h) * 0.75,
  );
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(10,0,20,0.38)');
  ctx.fillStyle = v;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

/** Fits `text` to `maxWidth` by shrinking the Anton size; returns the size. */
function fitFont(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${size}px Anton, 'Arial Black', sans-serif`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px Anton, 'Arial Black', sans-serif`;
  }
  return size;
}

/** The title band: sunset strip, gradient sun, big gradient caption. */
function drawTitleBand(ctx, w, h, state, band) {
  const { x, y, w: bw, h: bh } = band;
  // Deep poster-purple band with a hot sunset strip along its top edge.
  const bg = ctx.createLinearGradient(0, y, 0, y + bh);
  bg.addColorStop(0, '#1c0b2e');
  bg.addColorStop(1, '#0d0518');
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, bw, bh);
  const strip = ctx.createLinearGradient(x, 0, x + bw, 0);
  strip.addColorStop(0, '#ff2e88');
  strip.addColorStop(0.5, '#ff7a18');
  strip.addColorStop(1, '#ffd319');
  ctx.fillStyle = strip;
  ctx.fillRect(x, y, bw, Math.max(3, h * 0.006));
  // Gradient sun disc, tucked into the right end of the band, clear of the
  // caption: the title's max width reserves the sun's full width.
  const sunR = bh * 0.6;
  const sunX = x + bw - sunR * 0.8;
  const sunY = y + bh * 0.52;
  const sun = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
  sun.addColorStop(0, '#ffe259');
  sun.addColorStop(0.55, '#ff7a18');
  sun.addColorStop(1, '#ff2e88');
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  // Slats cut across the sun, synthwave style.
  ctx.fillStyle = '#1c0b2e';
  for (let i = 0; i < 3; i += 1) {
    const sy = sunY + sunR * (0.05 + i * 0.28);
    ctx.fillRect(sunX - sunR, sy, sunR * 2, sunR * 0.09);
  }

  const pad = bw * 0.045;
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  // Subtitle eyebrow, letterspaced, in neon pink.
  if (subtitle) {
    const sSize = Math.max(12, bh * 0.13);
    ctx.font = `bold ${sSize}px 'Arial Narrow', sans-serif`;
    ctx.fillStyle = '#ff5db1';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const spaced = subtitle.split('').join('  ');
    ctx.fillText(spaced, x + pad, y + bh * 0.24);
  }
  // Main caption: Anton, filled with a sunset gradient, black outline.
  if (title) {
    const maxW = bw - pad * 2 - sunR * 1.9;
    const size = fitFont(ctx, title, maxW, bh * 0.52);
    const grad = ctx.createLinearGradient(x, y + bh * 0.3, x, y + bh * 0.95);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.55, '#ffe259');
    grad.addColorStop(1, '#ff7a18');
    ctx.font = `${size}px Anton, 'Arial Black', sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, size * 0.07);
    ctx.strokeStyle = 'rgba(10, 2, 20, 0.9)';
    ctx.strokeText(title, x + pad, y + bh * 0.88);
    ctx.fillStyle = grad;
    ctx.fillText(title, x + pad, y + bh * 0.88);
  }
}

/** Draws the whole cover onto `ctx` at pixel size w x h. */
export function drawCoverOn(ctx, w, h, state) {
  // Poster paper: near-black purple, thin white frame.
  ctx.fillStyle = '#0d0518';
  ctx.fillRect(0, 0, w, h);
  const margin = Math.round(w * 0.028);
  const bandH = Math.round(h * 0.24);
  const area = { x: margin, y: margin, w: w - margin * 2, h: h - margin * 2 - bandH };
  const rects = panelRects(state.layout);
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.w, area.h);
  ctx.clip();
  rects.forEach((r, i) => {
    const rect = {
      x: area.x + r.x * area.w,
      y: area.y + r.y * area.h,
      w: r.w * area.w,
      h: r.h * area.h,
    };
    const photo = state.photos[i];
    if (photo) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.w, rect.h);
      ctx.clip();
      drawPanelPhoto(ctx, photo, rect, state.frames[i]);
      gradePanel(ctx, rect, state.grade);
      ctx.restore();
    } else {
      // Empty panel: deep gradient placeholder with a dashed frame.
      const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      g.addColorStop(0, '#3b1a5e');
      g.addColorStop(1, '#160a2a');
      ctx.fillStyle = g;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.setLineDash([10, 8]);
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x + 8, rect.y + 8, rect.w - 16, rect.h - 16);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = `bold ${Math.max(14, rect.h * 0.06)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`PANEL ${i + 1} — ADD A PHOTO`, rect.x + rect.w / 2, rect.y + rect.h / 2);
    }
    // White gutter frame around each panel.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, w * 0.003);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });
  ctx.restore();
  drawTitleBand(ctx, w, h, state, {
    x: margin,
    y: margin + area.h,
    w: w - margin * 2,
    h: bandH,
  });
  // Outer white frame.
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(3, w * 0.005);
  ctx.strokeRect(margin / 2, margin / 2, w - margin, h - margin);
}

/** Draws `state` onto the canvas at the canvas's own pixel size. */
export function drawCover(canvas, state) {
  drawCoverOn(canvas.getContext('2d'), canvas.width, canvas.height, state);
}

/** Renders `state` to a fresh canvas at an export size; returns the canvas. */
export function drawCoverTo(w, h, state) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawCoverOn(canvas.getContext('2d'), w, h, state);
  return canvas;
}
