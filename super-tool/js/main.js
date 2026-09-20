// Main navigation and utility functions

document.addEventListener('DOMContentLoaded', function() {
  initNavigation();
  setupPDFjs();
});

// Initialize sidebar navigation
function initNavigation() {
  const toolTabs = document.querySelectorAll('.tool-tab');
  const toolPanels = document.querySelectorAll('.tool-panel');

  toolTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const toolId = this.getAttribute('data-tool');

      // Update active tab
      toolTabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');

      // Update active panel
      toolPanels.forEach(panel => panel.classList.remove('active'));
      document.getElementById('tool-' + toolId).classList.add('active');
    });
  });
}

// Setup PDF.js worker
function setupPDFjs() {
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
  }
}

// Utility functions
const utils = {
  formatFileSize: function(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  formatTime: function(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  },

  downloadBlob: function(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  showElement: function(elementId) {
    document.getElementById(elementId).classList.remove('hidden');
  },

  hideElement: function(elementId) {
    document.getElementById(elementId).classList.add('hidden');
  }
};
