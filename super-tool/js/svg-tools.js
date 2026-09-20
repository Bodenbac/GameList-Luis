// SVG to PNG Batch Converter
const svgTools = {
  files: [],
  nextId: 0,

  init: function() {
    this.setupEventListeners();
  },

  setupEventListeners: function() {
    const uploadZone = document.getElementById('svgUploadZone');
    const fileInput = document.getElementById('svgFileInput');

    // Click to upload
    uploadZone.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', (e) => {
      if (e.target.files) this.addFiles(Array.from(e.target.files));
    });

    // Drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      uploadZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      uploadZone.addEventListener(eventName, () => {
        uploadZone.style.borderColor = '#22d3ee';
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      uploadZone.addEventListener(eventName, () => {
        uploadZone.style.borderColor = '';
      });
    });

    uploadZone.addEventListener('drop', (e) => {
      const files = Array.from(e.dataTransfer.files);
      this.addFiles(files);
    });
  },

  isSvgFile: function(file) {
    return file.type === 'image/svg+xml' || /\.svg$/i.test(file.name || '');
  },

  addFiles: function(files) {
    const validFiles = files.filter(file => this.isSvgFile(file));

    if (validFiles.length === 0) {
      alert('Bitte wählen Sie SVG-Dateien aus.');
      return;
    }

    validFiles.forEach(file => {
      const id = this.nextId++;
      const fileData = {
        id,
        file,
        name: file.name || 'unnamed.svg',
        displayName: (file.name || 'unnamed.svg').replace(/\.svg$/i, ''),
        size: file.size || 0,
        status: 'pending',
        pngBlob: null,
        pngUrl: null,
        dom: null
      };

      this.files.push(fileData);
      this.createFileRow(fileData);
      this.processFile(fileData);
    });

    utils.showElement('svgFileList');
    utils.showElement('svgStats');
    this.updateStats();
  },

  createFileRow: function(fileData) {
    const container = document.getElementById('svgFileListContainer');

    const row = document.createElement('div');
    row.className = 'file-row';
    row.style.cssText = 'display: grid; grid-template-columns: 1fr auto auto; gap: 12px; align-items: center; padding: 12px; background: rgba(15, 23, 42, 0.8); border-radius: 10px; margin-bottom: 8px; border: 1px solid rgba(148, 163, 184, 0.2);';

    const nameEl = document.createElement('div');
    nameEl.textContent = fileData.name;
    nameEl.style.cssText = 'font-size: 14px; color: #e5e7eb;';

    const statusEl = document.createElement('div');
    statusEl.className = 'status-badge';
    statusEl.textContent = 'Wird konvertiert...';
    statusEl.style.cssText = 'padding: 4px 12px; border-radius: 999px; font-size: 12px; background: rgba(234, 179, 8, 0.2); color: #fbbf24; border: 1px solid rgba(234, 179, 8, 0.5);';

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn';
    downloadBtn.textContent = '📥 PNG';
    downloadBtn.disabled = true;
    downloadBtn.style.fontSize = '12px';
    downloadBtn.onclick = () => {
      if (fileData.pngUrl) {
        utils.downloadBlob(fileData.pngBlob, fileData.displayName + '.png');
      }
    };

    row.appendChild(nameEl);
    row.appendChild(statusEl);
    row.appendChild(downloadBtn);
    container.appendChild(row);

    fileData.dom = { row, statusEl, downloadBtn };
  },

  async processFile(fileData) {
    try {
      const svgText = await fileData.file.text();
      const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const img = new Image();

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          // Extract size from SVG if needed
          if (!width || !height) {
            const size = this.extractSvgSize(svgText);
            width = size.width || 1024;
            height = size.height || 1024;
          }

          canvas.width = width;
          canvas.height = height;

          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((pngBlob) => {
            if (!pngBlob) {
              this.updateFileStatus(fileData, 'error');
              return;
            }

            fileData.pngBlob = pngBlob;
            fileData.pngUrl = URL.createObjectURL(pngBlob);
            this.updateFileStatus(fileData, 'done');
            URL.revokeObjectURL(url);
          }, 'image/png', 0.95);

        } catch (err) {
          console.error(err);
          this.updateFileStatus(fileData, 'error');
          URL.revokeObjectURL(url);
        }
      };

      img.onerror = () => {
        this.updateFileStatus(fileData, 'error');
        URL.revokeObjectURL(url);
      };

      img.src = url;

    } catch (err) {
      console.error(err);
      this.updateFileStatus(fileData, 'error');
    }
  },

  extractSvgSize: function(svgText) {
    const size = { width: null, height: null };

    const widthMatch = svgText.match(/width="([\d.]+)(px)?"/i);
    const heightMatch = svgText.match(/height="([\d.]+)(px)?"/i);

    if (widthMatch && heightMatch) {
      size.width = parseFloat(widthMatch[1]);
      size.height = parseFloat(heightMatch[1]);
      return size;
    }

    const viewBoxMatch = svgText.match(/viewBox="([\d.\s-]+)"/i);
    if (viewBoxMatch) {
      const parts = viewBoxMatch[1].trim().split(/\s+/);
      if (parts.length === 4) {
        size.width = parseFloat(parts[2]);
        size.height = parseFloat(parts[3]);
      }
    }

    return size;
  },

  updateFileStatus: function(fileData, status) {
    fileData.status = status;
    const { statusEl, downloadBtn } = fileData.dom;

    if (status === 'done') {
      statusEl.textContent = '✓ Fertig';
      statusEl.style.cssText = 'padding: 4px 12px; border-radius: 999px; font-size: 12px; background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.5);';
      downloadBtn.disabled = false;
    } else if (status === 'error') {
      statusEl.textContent = '✗ Fehler';
      statusEl.style.cssText = 'padding: 4px 12px; border-radius: 999px; font-size: 12px; background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.5);';
      downloadBtn.disabled = true;
    }

    this.updateStats();
  },

  updateStats: function() {
    const total = this.files.length;
    const converted = this.files.filter(f => f.status === 'done').length;
    const failed = this.files.filter(f => f.status === 'error').length;

    document.getElementById('svgFileCount').textContent = total;
    document.getElementById('svgStatsTotal').textContent = total;
    document.getElementById('svgStatsConverted').textContent = converted;
    document.getElementById('svgStatsFailed').textContent = failed;

    const downloadAllBtn = document.getElementById('svgDownloadAllBtn');
    downloadAllBtn.disabled = converted === 0;
  },

  downloadAll: function() {
    const downloadable = this.files.filter(f => f.status === 'done' && f.pngBlob);

    if (downloadable.length === 0) {
      alert('Keine Dateien zum Herunterladen verfügbar.');
      return;
    }

    downloadable.forEach((fileData, index) => {
      setTimeout(() => {
        utils.downloadBlob(fileData.pngBlob, fileData.displayName + '.png');
      }, index * 120);
    });
  },

  clearAll: function() {
    this.files.forEach(fileData => {
      if (fileData.pngUrl) URL.revokeObjectURL(fileData.pngUrl);
    });
    this.files = [];
    document.getElementById('svgFileListContainer').innerHTML = '';
    utils.hideElement('svgFileList');
    utils.hideElement('svgStats');
    this.updateStats();
  }
};

// SVG Reworker (Color Editor, Flip, Rotate)
const svgReworker = {
  svgCode: '',
  colorMap: {},
  flipH: false,
  flipV: false,

  init: function() {
    this.setupEventListeners();
  },

  setupEventListeners: function() {
    const textarea = document.getElementById('svgCodeInput');
    const fileInput = document.getElementById('svgReworkerFileInput');

    textarea.addEventListener('input', () => {
      this.svgCode = textarea.value;
      this.analyzeColors();
      this.updatePreview();
    });

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file && /\.svg$/i.test(file.name)) {
        const text = await file.text();
        textarea.value = text;
        this.svgCode = text;
        this.analyzeColors();
        this.updatePreview();
      }
    });

    // Update value displays
    document.getElementById('iconSize').addEventListener('input', function() {
      document.getElementById('iconSizeValue').textContent = this.value;
    });
    document.getElementById('rotation').addEventListener('input', function() {
      document.getElementById('rotationValue').textContent = this.value;
    });
    document.getElementById('padding').addEventListener('input', function() {
      document.getElementById('paddingValue').textContent = this.value;
    });
  },

  async pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      document.getElementById('svgCodeInput').value = text;
      this.svgCode = text;
      this.analyzeColors();
      this.updatePreview();
    } catch (err) {
      alert('Fehler beim Lesen der Zwischenablage: ' + err.message);
    }
  },

  analyzeColors: function() {
    const regex = /#[0-9a-fA-F]{3,8}\b/g;
    const colors = new Set();
    let match;

    while ((match = regex.exec(this.svgCode)) !== null) {
      colors.add(match[0]);
    }

    this.colorMap = {};
    const colorArray = Array.from(colors);

    document.getElementById('colorCount').textContent = colorArray.length;

    const colorList = document.getElementById('colorList');
    colorList.innerHTML = '';

    colorArray.forEach(color => {
      this.colorMap[color] = color;

      const row = document.createElement('div');
      row.style.cssText = 'display: grid; grid-template-columns: 40px 1fr; gap: 8px; align-items: center;';

      const swatch = document.createElement('div');
      swatch.style.cssText = `width: 40px; height: 30px; border-radius: 6px; background: ${color}; border: 2px solid rgba(148, 163, 184, 0.5);`;

      const input = document.createElement('input');
      input.type = 'text';
      input.value = color;
      input.dataset.original = color;
      input.style.cssText = 'width: 100%; padding: 6px 10px; border-radius: 6px; background: rgba(15, 23, 42, 0.8); color: #e5e7eb; border: 2px solid rgba(148, 163, 184, 0.3); font-size: 13px;';

      input.addEventListener('input', () => {
        let val = input.value.trim();
        if (!val.startsWith('#')) val = '#' + val;
        if (/^#[0-9a-fA-F]{3,8}$/.test(val)) {
          this.colorMap[input.dataset.original] = val;
          swatch.style.background = val;
          this.updatePreview();
        }
      });

      row.appendChild(swatch);
      row.appendChild(input);
      colorList.appendChild(row);
    });
  },

  updatePreview: function() {
    if (!this.svgCode.trim()) {
      document.getElementById('svgPreviewContent').innerHTML = '<p style="color: #9ca3af;">SVG-Code einfügen...</p>';
      return;
    }

    let modifiedSvg = this.svgCode;

    // Apply color mappings
    Object.entries(this.colorMap).forEach(([original, mapped]) => {
      if (original !== mapped) {
        const regex = new RegExp(original.replace('#', '\\#'), 'gi');
        modifiedSvg = modifiedSvg.replace(regex, mapped);
      }
    });

    const previewContent = document.getElementById('svgPreviewContent');
    previewContent.innerHTML = modifiedSvg;

    const svgEl = previewContent.querySelector('svg');
    if (!svgEl) {
      previewContent.innerHTML = '<p style="color: #ef4444;">Kein gültiges SVG gefunden</p>';
      return;
    }

    const size = parseInt(document.getElementById('iconSize').value) || 200;
    const rotation = parseInt(document.getElementById('rotation').value) || 0;
    const padding = parseInt(document.getElementById('padding').value) || 0;

    svgEl.style.width = size + 'px';
    svgEl.style.height = size + 'px';

    let scaleX = this.flipH ? -1 : 1;
    let scaleY = this.flipV ? -1 : 1;

    svgEl.style.transform = `scale(${scaleX}, ${scaleY}) rotate(${rotation}deg)`;
    svgEl.style.transformOrigin = '50% 50%';

    const box = document.getElementById('svgPreviewBox');
    box.style.padding = (20 + padding) + 'px';
  },

  flipHorizontal: function() {
    this.flipH = !this.flipH;
    this.updatePreview();
  },

  flipVertical: function() {
    this.flipV = !this.flipV;
    this.updatePreview();
  },

  async downloadAsPng() {
    const previewContent = document.getElementById('svgPreviewContent');
    const svgEl = previewContent.querySelector('svg');

    if (!svgEl) {
      alert('Bitte fügen Sie zuerst SVG-Code ein.');
      return;
    }

    const exportSize = parseInt(document.getElementById('pngExportSize').value) || 512;

    // Create a clean SVG for export
    let exportSvg = this.svgCode;
    Object.entries(this.colorMap).forEach(([original, mapped]) => {
      if (original !== mapped) {
        const regex = new RegExp(original.replace('#', '\\#'), 'gi');
        exportSvg = exportSvg.replace(regex, mapped);
      }
    });

    const blob = new Blob([exportSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = exportSize;
      canvas.height = exportSize;

      ctx.save();
      ctx.translate(exportSize / 2, exportSize / 2);

      const rotation = parseInt(document.getElementById('rotation').value) || 0;
      ctx.rotate((rotation * Math.PI) / 180);

      const scaleX = this.flipH ? -1 : 1;
      const scaleY = this.flipV ? -1 : 1;
      ctx.scale(scaleX, scaleY);

      ctx.drawImage(img, -exportSize / 2, -exportSize / 2, exportSize, exportSize);
      ctx.restore();

      canvas.toBlob((pngBlob) => {
        utils.downloadBlob(pngBlob, 'svg-reworked.png');
        URL.revokeObjectURL(url);
      }, 'image/png', 0.95);
    };

    img.onerror = () => {
      alert('Fehler beim Laden des SVG');
      URL.revokeObjectURL(url);
    };

    img.src = url;
  }
};

// Initialize both tools
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    svgTools.init();
    svgReworker.init();
  });
} else {
  svgTools.init();
  svgReworker.init();
}
