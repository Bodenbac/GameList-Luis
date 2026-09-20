// PNG to SVG Converter
// Uses canvas-based color quantization + contour tracing to generate SVG paths

const pngToSvg = (() => {
  let currentFile = null;
  let currentSvgString = null;
  let currentFileName = 'output';

  // --- Setup ---
  function init() {
    const zone = document.getElementById('pngToSvgUploadZone');
    const input = document.getElementById('pngToSvgFileInput');

    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) loadFile(file);
    });
    input.addEventListener('change', () => {
      if (input.files[0]) loadFile(input.files[0]);
    });
  }

  function loadFile(file) {
    if (!file.type.startsWith('image/')) return;
    currentFile = file;
    currentFileName = file.name.replace(/\.[^.]+$/, '');

    const reader = new FileReader();
    reader.onload = e => {
      const img = document.getElementById('pngToSvgPreviewImg');
      img.src = e.target.result;
      img.style.display = 'block';
      utils.showElement('pngToSvgControls');
      utils.hideElement('pngToSvgResult');
      setStatus('');
    };
    reader.readAsDataURL(file);
  }

  // --- Labels ---
  function updateLabel(id, val) {
    document.getElementById(id).textContent = val;
  }

  // --- Conversion ---
  async function convert() {
    if (!currentFile) return;

    setStatus('⏳ Bild wird geladen...');
    currentSvgString = null;

    const numColors = parseInt(document.getElementById('colorCountSlider').value);
    const blur = parseInt(document.getElementById('blurSlider').value);
    const tolerance = parseFloat(document.getElementById('toleranceSlider').value);
    const transparentBg = document.getElementById('transparentBg').checked;

    try {
      const imageData = await loadImageData(currentFile, blur);
      setStatus('🎨 Farben werden quantisiert...');
      await sleep(10);

      const quantized = quantizeColors(imageData, numColors, transparentBg);
      setStatus('✏️ Pfade werden gezeichnet...');
      await sleep(10);

      const svgStr = buildSvg(quantized, imageData.width, imageData.height, tolerance);
      currentSvgString = svgStr;

      // Show output preview
      const outBox = document.getElementById('pngToSvgOutputPreview');
      outBox.innerHTML = svgStr;
      const svgEl = outBox.querySelector('svg');
      if (svgEl) {
        svgEl.style.maxWidth = '100%';
        svgEl.style.maxHeight = '300px';
      }

      utils.showElement('pngToSvgResult');
      setStatus('✅ Konvertierung abgeschlossen!');
    } catch (err) {
      setStatus('❌ Fehler: ' + err.message);
    }
  }

  function loadImageData(file, blur) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 800;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > MAX || h > MAX) {
          const scale = Math.min(MAX / w, MAX / h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        if (blur > 0) {
          ctx.filter = `blur(${blur}px)`;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(ctx.getImageData(0, 0, w, h));
      };
      img.onerror = () => reject(new Error('Bild konnte nicht geladen werden'));
      img.src = url;
    });
  }

  // --- Color quantization (median-cut) ---
  function quantizeColors(imageData, numColors, transparentBg) {
    const { data, width, height } = imageData;
    const pixels = [];

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (transparentBg && a < 128) continue;
      pixels.push([data[i], data[i + 1], data[i + 2]]);
    }

    const palette = medianCut(pixels, numColors);

    // Map each pixel to nearest palette color
    const colorMap = new Array(width * height).fill(0);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const a = data[idx + 3];
        if (transparentBg && a < 128) {
          colorMap[y * width + x] = -1; // transparent
          continue;
        }
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        colorMap[y * width + x] = nearestColor(r, g, b, palette);
      }
    }

    return { colorMap, palette, width, height };
  }

  function medianCut(pixels, numColors) {
    if (pixels.length === 0) return [[0, 0, 0]];
    let buckets = [pixels];

    while (buckets.length < numColors) {
      // Find bucket with largest range
      let maxRange = -1, splitIdx = 0;
      buckets.forEach((bucket, i) => {
        const range = colorRange(bucket);
        if (range > maxRange) { maxRange = range; splitIdx = i; }
      });

      const bucket = buckets[splitIdx];
      if (bucket.length <= 1) break;

      // Find channel with max range
      const [minR, maxR, minG, maxG, minB, maxB] = channelRanges(bucket);
      const rR = maxR - minR, rG = maxG - minG, rB = maxB - minB;
      const ch = rR >= rG && rR >= rB ? 0 : rG >= rB ? 1 : 2;

      bucket.sort((a, b) => a[ch] - b[ch]);
      const mid = Math.floor(bucket.length / 2);
      buckets.splice(splitIdx, 1, bucket.slice(0, mid), bucket.slice(mid));
    }

    return buckets.map(avgColor);
  }

  function colorRange(pixels) {
    const [minR, maxR, minG, maxG, minB, maxB] = channelRanges(pixels);
    return Math.max(maxR - minR, maxG - minG, maxB - minB);
  }

  function channelRanges(pixels) {
    let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
    for (const [r, g, b] of pixels) {
      if (r < minR) minR = r; if (r > maxR) maxR = r;
      if (g < minG) minG = g; if (g > maxG) maxG = g;
      if (b < minB) minB = b; if (b > maxB) maxB = b;
    }
    return [minR, maxR, minG, maxG, minB, maxB];
  }

  function avgColor(pixels) {
    const n = pixels.length;
    let r = 0, g = 0, b = 0;
    for (const p of pixels) { r += p[0]; g += p[1]; b += p[2]; }
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  }

  function nearestColor(r, g, b, palette) {
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < palette.length; i++) {
      const dr = r - palette[i][0], dg = g - palette[i][1], db = b - palette[i][2];
      const d = dr * dr + dg * dg + db * db;
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  }

  // --- SVG building: group pixels by color, build rects (fast approach) ---
  function buildSvg({ colorMap, palette, width, height }, tolerance) {
    const layers = [];

    // For each palette color, collect runs of pixels and merge into rectangles
    for (let ci = 0; ci < palette.length; ci++) {
      const rects = collectRects(colorMap, width, height, ci, tolerance);
      if (rects.length === 0) continue;
      const hex = toHex(palette[ci]);
      const paths = rects.map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h-${w}Z`).join(' ');
      layers.push(`<path fill="${hex}" d="${paths}"/>`);
    }

    // Transparent pixels: skip (background shows through)
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n${layers.join('\n')}\n</svg>`;
  }

  // Greedy rectangle merging for a single color index
  function collectRects(colorMap, width, height, ci, tolerance) {
    const visited = new Uint8Array(width * height);
    const rects = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (visited[i] || colorMap[i] !== ci) continue;

        // Expand width
        let w = 1;
        while (x + w < width && !visited[y * width + x + w] && colorMap[y * width + x + w] === ci) w++;

        // Expand height: find max h where all rows match this run
        let h = 1;
        outer: while (y + h < height) {
          for (let dx = 0; dx < w; dx++) {
            if (colorMap[(y + h) * width + x + dx] !== ci) break outer;
          }
          h++;
        }

        // Mark visited
        for (let dy = 0; dy < h; dy++) {
          for (let dx = 0; dx < w; dx++) {
            visited[(y + dy) * width + x + dx] = 1;
          }
        }

        rects.push([x, y, w, h]);
      }
    }

    return rects;
  }

  function toHex([r, g, b]) {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  // --- Download / Copy ---
  function downloadSvg() {
    if (!currentSvgString) return;
    const blob = new Blob([currentSvgString], { type: 'image/svg+xml' });
    utils.downloadBlob(blob, currentFileName + '.svg');
  }

  async function copySvgCode() {
    if (!currentSvgString) return;
    try {
      await navigator.clipboard.writeText(currentSvgString);
      setStatus('📋 SVG-Code in die Zwischenablage kopiert!');
    } catch {
      setStatus('❌ Kopieren fehlgeschlagen');
    }
  }

  // --- Helpers ---
  function setStatus(msg) {
    const el = document.getElementById('pngToSvgStatus');
    if (el) el.textContent = msg;
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // Init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { convert, updateLabel, downloadSvg, copySvgCode };
})();
