// PDF Converter
const pdfTools = {
  currentFile: null,

  init: function() {
    this.setupEventListeners();
  },

  setupEventListeners: function() {
    const uploadZone = document.getElementById('pdfUploadZone');
    const fileInput = document.getElementById('pdfFileInput');

    // Click to upload
    uploadZone.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.handleFile(file);
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
      const file = e.dataTransfer.files[0];
      if (file) this.handleFile(file);
    });
  },

  async handleFile(file) {
    this.currentFile = file;
    const ext = (file.name.split('.').pop() || '').toLowerCase();

    document.getElementById('pdfFileName').textContent = file.name;
    document.getElementById('pdfFileType').textContent = file.type || 'unbekannt';
    document.getElementById('pdfFileSize').textContent = utils.formatFileSize(file.size);

    utils.showElement('pdfFileInfo');
    const actionButtons = document.getElementById('pdfActionButtons');
    actionButtons.innerHTML = '';

    if (file.type === 'application/pdf' || ext === 'pdf') {
      this.setupPdfActions(file, actionButtons);
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx') {
      this.setupDocxActions(file, actionButtons);
    } else {
      actionButtons.innerHTML = '<p style="color: #ef4444;">Nur PDF oder DOCX sind erlaubt.</p>';
    }
  },

  setupPdfActions: function(file, container) {
    const previewBtn = document.createElement('button');
    previewBtn.className = 'btn';
    previewBtn.textContent = 'Textvorschau anzeigen';
    previewBtn.onclick = async () => {
      this.setStatus('PDF wird analysiert …');
      const pages = await this.extractPdfText(file);
      this.setStatus('');
      this.showPreview(pages.map((t, i) => `— Seite ${i + 1} —\n${t}`).join('\n\n'));
    };

    const toDocxBtn = document.createElement('button');
    toDocxBtn.className = 'btn btn-primary';
    toDocxBtn.textContent = 'Als DOCX herunterladen';
    toDocxBtn.onclick = async () => {
      this.setStatus('Konvertiere PDF → DOCX …');
      const pages = await this.extractPdfText(file);
      await this.exportPagesToDocx(pages, file.name.replace(/\.pdf$/i, '') || 'export');
      this.setStatus('Download abgeschlossen!');
      setTimeout(() => this.setStatus(''), 2000);
    };

    container.appendChild(previewBtn);
    container.appendChild(toDocxBtn);
  },

  setupDocxActions: function(file, container) {
    const previewBtn = document.createElement('button');
    previewBtn.className = 'btn';
    previewBtn.textContent = 'Vorschau anzeigen';
    previewBtn.onclick = async () => {
      this.setStatus('Lese DOCX …');
      const arrayBuffer = await file.arrayBuffer();
      const result = await window.mammoth.convertToHtml({ arrayBuffer });
      this.setStatus('');
      this.showPreview(result.value, true);
    };

    const toPdfBtn = document.createElement('button');
    toPdfBtn.className = 'btn btn-primary';
    toPdfBtn.textContent = 'Als PDF herunterladen';
    toPdfBtn.onclick = async () => {
      this.setStatus('Konvertiere DOCX → PDF …');
      const arrayBuffer = await file.arrayBuffer();
      const result = await window.mammoth.convertToHtml({ arrayBuffer });

      const temp = document.createElement('div');
      temp.style.padding = '20px';
      temp.style.maxWidth = '800px';
      temp.innerHTML = result.value;
      document.body.appendChild(temp);

      const opt = {
        margin: 10,
        filename: file.name.replace(/\.docx$/i, '') + '.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().from(temp).set(opt).save();
      temp.remove();
      this.setStatus('Download abgeschlossen!');
      setTimeout(() => this.setStatus(''), 2000);
    };

    container.appendChild(previewBtn);
    container.appendChild(toPdfBtn);
  },

  async extractPdfText(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const results = [];

    for (let p = 1; p <= pdf.numPages; p++) {
      this.setStatus(`Lese Seite ${p}/${pdf.numPages} …`);
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const text = (content.items || []).map(i => i.str).join(' ').replace(/\s+/g, ' ').trim();
      results.push(text || '(Keine Textinhalte gefunden)');
    }

    return results;
  },

  async exportPagesToDocx(pages, baseName) {
    const { Document, Packer, Paragraph, HeadingLevel, PageBreak, TextRun } = window.docx;

    const children = [];
    pages.forEach((pageText, idx) => {
      if (idx > 0) {
        children.push(new Paragraph({ children: [new PageBreak()] }));
      }
      children.push(new Paragraph({
        text: `Seite ${idx + 1}`,
        heading: HeadingLevel.HEADING_3
      }));

      const lines = pageText.split(/\r?\n/);
      lines.forEach(line => {
        const text = line.trim();
        if (text.length === 0) {
          children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
        } else {
          children.push(new Paragraph({ children: [new TextRun({ text })] }));
        }
      });
    });

    const doc = new Document({
      sections: [{ properties: {}, children }]
    });

    const blob = await Packer.toBlob(doc);
    utils.downloadBlob(blob, `${baseName}.docx`);
  },

  showPreview: function(content, isHtml = false) {
    const previewContent = document.getElementById('pdfPreviewContent');
    if (isHtml) {
      previewContent.innerHTML = content;
    } else {
      previewContent.textContent = content;
    }
    utils.showElement('pdfPreview');
  },

  setStatus: function(msg) {
    document.getElementById('pdfStatus').textContent = msg || '';
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => pdfTools.init());
} else {
  pdfTools.init();
}
