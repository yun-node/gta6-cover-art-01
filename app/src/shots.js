// Fixed scenes for screenshots: ?shot=cover shows the cover alone at full
// bleed; ?shot=editor shows the whole editor with a photo loaded.
// Query: photo / photo2 (sample names), caption, subtitle, layout, grade,
// size (square | portrait | wide). window.__shotReady is set once painted.
export async function runShot(shot, query, api) {
  const get = (k, d) => query.get(k) ?? d;
  if (shot === 'cover' || shot === 'cover-wide' || shot === 'cover-portrait') {
    document.body.classList.add('shot-cover');
  }
  const pier = await api.loadSample(`samples/${get('photo', 'pier')}.jpg`);
  const boulevard = await api.loadSample(`samples/${get('photo2', 'boulevard')}.jpg`);
  const layout = get('layout', 'trio');
  const photos = layout === 'duo'
    ? [pier, boulevard, null, null]
    : layout === 'quad'
      ? [pier, boulevard, boulevard, pier]
      : [pier, boulevard, pier, null];
  api.setState({ layout, grade: get('grade', 'sunset') });
  api.setPhotos(photos);
  api.setFrames([
    { zoom: 1, dx: 0, dy: 0.12 },
    { zoom: 1.15, dx: 0, dy: 0.08 },
    { zoom: 1.05, dx: 0.05, dy: 0.1 },
    { zoom: 1, dx: 0, dy: 0 },
  ]);
  api.setTitle(get('caption', 'Sunset Heist'));
  api.setSubtitle(get('subtitle', 'VICE NIGHTS'));
  if (shot === 'cover-wide') api.setSizeKey('wide');
  if (shot === 'cover-portrait') api.setSizeKey('portrait');
  if (shot === 'editor') {
    // The editor shot also fills the photo tray, so it shows photos loaded.
    api.addToLibrary(pier, `samples/${get('photo', 'pier')}.jpg`, get('photo', 'pier'));
    api.addToLibrary(boulevard, `samples/${get('photo2', 'boulevard')}.jpg`, get('photo2', 'boulevard'));
  }
  // Wait for the bundled Anton font so the caption renders in its real face.
  try { await document.fonts.load('80px Anton'); await document.fonts.ready; } catch { /* fall back to system bold */ }
  api.redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
