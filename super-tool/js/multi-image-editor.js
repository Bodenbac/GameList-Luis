// Multi Image Editor
const multiImageTools = {
  canvas: null,
  ctx: null,
  images: [],
  currentImageIndex: -1,
  MAX_IMAGES: 20,

  init: function() {
    this.canvas = document.getElementById('multiImageCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.setupEventListeners();
  },

  setupEventListeners: function() {
    const uploadZone = document.getElementById('multiImageUploadZone');
    const fileInput = document.getElementById('multiImageFileInput');

    // Click to upload
    uploadZone.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', (e) => {
      this.handleFiles(Array.from(e.target.files));
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
      this.handleFiles(Array.from(e.dataTransfer.files));
    });
  },

  handleFiles: function(files) {
    const validFiles = files.filter(file => file.type.match('image.*'));

    if (validFiles.length === 0) {
      alert('Bitte wählen Sie Bilddateien aus.');
      return;
    }

    if (this.images.length + validFiles.length > this.MAX_IMAGES) {
      alert(`Sie können maximal ${this.MAX_IMAGES} Bilder laden. Aktuell haben Sie ${this.images.length} Bilder.`);
      return;
    }

    validFiles.forEach(file => {
      if (this.images.length < this.MAX_IMAGES) {
        this.loadImage(file);
      }
    });
  },

  loadImage: function(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const imageData = {
          originalImage: img,
          currentImage: img,
          file: file,
          name: file.name,
          id: Date.now() + Math.random()
        };

        this.images.push(imageData);
        this.addImageToGallery(imageData, this.images.length - 1);
        this.updateImageCounter();

        // Show gallery and select first image
        if (this.images.length === 1) {
          utils.showElement('imageGallery');
          this.selectImage(0);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  addImageToGallery: function(imageData, index) {
    const galleryGrid = document.getElementById('galleryGrid');

    const thumbnail = document.createElement('div');
    thumbnail.className = 'image-thumbnail';
    thumbnail.dataset.index = index;
    thumbnail.onclick = () => this.selectImage(index);

    const img = document.createElement('img');
    img.src = imageData.currentImage.src;
    img.alt = imageData.name;

    thumbnail.appendChild(img);
    galleryGrid.appendChild(thumbnail);
  },

  selectImage: function(index) {
    if (index < 0 || index >= this.images.length) return;

    // Update selection in gallery
    document.querySelectorAll('.image-thumbnail').forEach((thumb, i) => {
      thumb.classList.toggle('selected', i === index);
    });

    this.currentImageIndex = index;
    const imageData = this.images[index];

    this.displayImage(imageData.currentImage);
    utils.showElement('multiImageToolsSection');
  },

  displayImage: function(img) {
    const maxWidth = 600;
    const ratio = Math.min(maxWidth / img.width, 1);
    this.canvas.width = img.width * ratio;
    this.canvas.height = img.height * ratio;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
  },

  updateImageCounter: function() {
    document.getElementById('imageCount').textContent = this.images.length;
  },

  downloadCurrent: function() {
    if (this.currentImageIndex < 0) {
      alert('Bitte wählen Sie zuerst ein Bild aus.');
      return;
    }

    const currentImage = this.images[this.currentImageIndex].currentImage;
    const imageName = this.images[this.currentImageIndex].name;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = currentImage.width;
    tempCanvas.height = currentImage.height;

    tempCtx.drawImage(currentImage, 0, 0);

    tempCanvas.toBlob((blob) => {
      const nameWithoutExt = imageName.replace(/\.[^/.]+$/, "");
      utils.downloadBlob(blob, `${nameWithoutExt}_edited.png`);
    }, 'image/png', 0.9);
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => multiImageTools.init());
} else {
  multiImageTools.init();
}
