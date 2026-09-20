// Image Editor Pro
const imageTools = {
  canvas: null,
  ctx: null,
  currentImage: null,
  originalImage: null,
  cropMode: false,
  cropRect: { x: 0, y: 0, width: 0, height: 0 },
  selectedFormat: 'png',

  init: function() {
    this.canvas = document.getElementById('imageCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.setupEventListeners();
  },

  setupEventListeners: function() {
    const uploadZone = document.getElementById('imageUploadZone');
    const fileInput = document.getElementById('imageFileInput');

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

    // Format selection
    document.querySelectorAll('.format-option').forEach(option => {
      option.addEventListener('click', function() {
        document.querySelectorAll('.format-option').forEach(o => o.classList.remove('selected'));
        this.classList.add('selected');
        imageTools.selectedFormat = this.getAttribute('data-format');
      });
    });

    // Resize inputs
    document.getElementById('resizeWidth').addEventListener('input', () => this.syncResizeInputs('width'));
    document.getElementById('resizeHeight').addEventListener('input', () => this.syncResizeInputs('height'));

    // Filter sliders
    document.getElementById('brightness').addEventListener('input', function() {
      document.getElementById('brightnessValue').textContent = this.value;
    });
    document.getElementById('contrast').addEventListener('input', function() {
      document.getElementById('contrastValue').textContent = this.value;
    });
    document.getElementById('saturation').addEventListener('input', function() {
      document.getElementById('saturationValue').textContent = this.value;
    });
  },

  handleFile: function(file) {
    if (!file.type.match('image.*')) {
      alert('Bitte wählen Sie eine Bilddatei aus.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.currentImage = img;
        this.displayImage(img);
        this.showImageInfo(file, img);
        utils.showElement('imageInfoSection');
        utils.showElement('imageToolsSection');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  displayImage: function(img) {
    const maxWidth = 800;
    const ratio = Math.min(maxWidth / img.width, 1);
    this.canvas.width = img.width * ratio;
    this.canvas.height = img.height * ratio;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);

    // Update resize inputs
    document.getElementById('resizeWidth').value = img.width;
    document.getElementById('resizeHeight').value = img.height;
  },

  showImageInfo: function(file, img) {
    document.getElementById('imgWidth').textContent = img.width + 'px';
    document.getElementById('imgHeight').textContent = img.height + 'px';
    document.getElementById('imgFormat').textContent = file.type.split('/')[1].toUpperCase();
    document.getElementById('imgSize').textContent = utils.formatFileSize(file.size);
  },

  startCrop: function() {
    this.cropMode = true;
    const cropControls = document.getElementById('cropControls');
    cropControls.classList.remove('hidden');

    // Initialize crop rectangle
    this.cropRect.x = 0;
    this.cropRect.y = 0;
    this.cropRect.width = this.currentImage.width;
    this.cropRect.height = this.currentImage.height;

    document.getElementById('cropX').value = this.cropRect.x;
    document.getElementById('cropY').value = this.cropRect.y;
    document.getElementById('cropWidth').value = this.cropRect.width;
    document.getElementById('cropHeight').value = this.cropRect.height;
  },

  applyCrop: function() {
    const x = parseInt(document.getElementById('cropX').value) || 0;
    const y = parseInt(document.getElementById('cropY').value) || 0;
    const width = parseInt(document.getElementById('cropWidth').value) || 100;
    const height = parseInt(document.getElementById('cropHeight').value) || 100;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = width;
    tempCanvas.height = height;

    tempCtx.drawImage(this.currentImage, x, y, width, height, 0, 0, width, height);

    const newImage = new Image();
    newImage.onload = () => {
      this.currentImage = newImage;
      this.displayImage(newImage);
      this.cropMode = false;
      document.getElementById('cropControls').classList.add('hidden');
    };
    newImage.src = tempCanvas.toDataURL();
  },

  syncResizeInputs: function(changedInput) {
    if (!document.getElementById('maintainRatio').checked || !this.currentImage) return;

    const aspectRatio = this.currentImage.width / this.currentImage.height;
    const widthInput = document.getElementById('resizeWidth');
    const heightInput = document.getElementById('resizeHeight');

    if (changedInput === 'width') {
      heightInput.value = Math.round(widthInput.value / aspectRatio);
    } else {
      widthInput.value = Math.round(heightInput.value * aspectRatio);
    }
  },

  resizeImage: function() {
    if (!this.currentImage) return;

    const newWidth = parseInt(document.getElementById('resizeWidth').value);
    const newHeight = parseInt(document.getElementById('resizeHeight').value);

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = newWidth;
    tempCanvas.height = newHeight;

    tempCtx.drawImage(this.currentImage, 0, 0, newWidth, newHeight);

    const newImage = new Image();
    newImage.onload = () => {
      this.currentImage = newImage;
      this.displayImage(newImage);
      document.getElementById('imgWidth').textContent = newWidth + 'px';
      document.getElementById('imgHeight').textContent = newHeight + 'px';
    };
    newImage.src = tempCanvas.toDataURL();
  },

  applyFilters: function() {
    const brightness = document.getElementById('brightness').value;
    const contrast = document.getElementById('contrast').value;
    const saturation = document.getElementById('saturation').value;

    this.canvas.style.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
  },

  resetFilters: function() {
    document.getElementById('brightness').value = 100;
    document.getElementById('contrast').value = 100;
    document.getElementById('saturation').value = 100;
    document.getElementById('brightnessValue').textContent = '100';
    document.getElementById('contrastValue').textContent = '100';
    document.getElementById('saturationValue').textContent = '100';
    this.canvas.style.filter = '';
  },

  downloadImage: function() {
    if (!this.currentImage) {
      alert('Bitte laden Sie zuerst ein Bild hoch.');
      return;
    }

    // Create temporary canvas with filters applied
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = this.currentImage.width;
    tempCanvas.height = this.currentImage.height;

    // Get filter values
    const brightness = document.getElementById('brightness').value / 100;
    const contrast = document.getElementById('contrast').value / 100;
    const saturation = document.getElementById('saturation').value / 100;

    // Draw image
    tempCtx.drawImage(this.currentImage, 0, 0);

    // Apply filters if needed
    if (brightness !== 1 || contrast !== 1 || saturation !== 1) {
      const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        // Apply brightness
        data[i] = Math.min(255, data[i] * brightness);
        data[i + 1] = Math.min(255, data[i + 1] * brightness);
        data[i + 2] = Math.min(255, data[i + 2] * brightness);

        // Apply contrast
        data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrast + 128));
        data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrast + 128));
        data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrast + 128));

        // Apply saturation
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = Math.min(255, Math.max(0, gray + (data[i] - gray) * saturation));
        data[i + 1] = Math.min(255, Math.max(0, gray + (data[i + 1] - gray) * saturation));
        data[i + 2] = Math.min(255, Math.max(0, gray + (data[i + 2] - gray) * saturation));
      }

      tempCtx.putImageData(imageData, 0, 0);
    }

    // Convert to blob and download
    tempCanvas.toBlob((blob) => {
      utils.downloadBlob(blob, `edited-image.${this.selectedFormat}`);
    }, `image/${this.selectedFormat}`, 0.9);
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => imageTools.init());
} else {
  imageTools.init();
}
