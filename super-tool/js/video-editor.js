// Video Editor Pro
const videoTools = {
  videoFile: null,
  videoUrl: null,
  videoPlayer: null,
  processedVideoBlob: null,
  startTime: 0,
  endTime: 0,
  originalWidth: 0,
  originalHeight: 0,

  init: function() {
    this.videoPlayer = document.getElementById('videoPlayer');
    this.setupEventListeners();
  },

  setupEventListeners: function() {
    const uploadZone = document.getElementById('videoUploadZone');
    const fileInput = document.getElementById('videoFileInput');

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

    // Video player events
    this.videoPlayer.addEventListener('timeupdate', () => this.updateTimeline());

    // Timeline click
    document.getElementById('timeline').addEventListener('click', (e) => this.handleTimelineClick(e));
  },

  handleFile: function(file) {
    if (!this.isProbablyVideo(file)) {
      alert('Bitte wählen Sie eine Videodatei aus.');
      return;
    }

    this.videoFile = file;
    if (this.videoUrl) URL.revokeObjectURL(this.videoUrl);
    this.videoUrl = URL.createObjectURL(file);
    this.videoPlayer.src = this.videoUrl;
    this.videoPlayer.load();

    this.videoPlayer.onloadedmetadata = () => {
      const duration = this.videoPlayer.duration || 0;
      this.startTime = 0;
      this.endTime = duration;

      document.getElementById('startTime').value = 0;
      document.getElementById('endTime').value = duration.toFixed(2);

      this.originalWidth = this.videoPlayer.videoWidth || 0;
      this.originalHeight = this.videoPlayer.videoHeight || 0;

      document.getElementById('vidDuration').textContent = utils.formatTime(duration);
      document.getElementById('vidResolution').textContent = `${this.originalWidth} × ${this.originalHeight}`;
      document.getElementById('vidFormat').textContent = (file.type || 'Unbekannt').replace('video/', '').toUpperCase();
      document.getElementById('vidSize').textContent = utils.formatFileSize(file.size || 0);

      utils.showElement('videoInfoSection');
      utils.showElement('videoToolsSection');
    };
  },

  isProbablyVideo: function(file) {
    if (file.type && file.type.startsWith('video/')) return true;
    const name = (file.name || '').toLowerCase();
    return /\.(mp4|webm|ogg|ogv|mov|mkv|avi|m4v)$/i.test(name);
  },

  setStartTime: function() {
    this.startTime = this.videoPlayer.currentTime;
    document.getElementById('startTime').value = this.startTime.toFixed(2);
  },

  setEndTime: function() {
    this.endTime = this.videoPlayer.currentTime;
    document.getElementById('endTime').value = this.endTime.toFixed(2);
  },

  previewCut: function() {
    this.startTime = parseFloat(document.getElementById('startTime').value) || 0;
    this.endTime = parseFloat(document.getElementById('endTime').value) || this.videoPlayer.duration;

    if (this.startTime >= this.endTime) {
      alert('Ende muss nach Start liegen.');
      return;
    }

    this.videoPlayer.currentTime = this.startTime;
    this.videoPlayer.play();

    const stopCheck = () => {
      if (this.videoPlayer.currentTime >= this.endTime || this.videoPlayer.paused) {
        this.videoPlayer.pause();
        this.videoPlayer.removeEventListener('timeupdate', stopCheck);
      }
    };
    this.videoPlayer.addEventListener('timeupdate', stopCheck);
  },

  updateTimeline: function() {
    const progress = (this.videoPlayer.currentTime / (this.videoPlayer.duration || 1)) * 100;
    document.getElementById('timelineProgress').style.width = progress + '%';
  },

  handleTimelineClick: function(e) {
    const rect = document.getElementById('timeline').getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    this.videoPlayer.currentTime = percent * (this.videoPlayer.duration || 0);
  },

  async exportVideo() {
    this.startTime = parseFloat(document.getElementById('startTime').value) || 0;
    this.endTime = parseFloat(document.getElementById('endTime').value) || this.videoPlayer.duration;

    if (!this.videoFile || this.startTime >= this.endTime) {
      alert('Bitte gültigen Bereich wählen.');
      return;
    }

    utils.showElement('progressIndicator');
    document.getElementById('progressText').textContent = 'Initialisierung...';
    document.getElementById('progressFill').style.width = '10%';

    try {
      const width = this.originalWidth || 1280;
      const height = this.originalHeight || 720;
      const fps = parseInt(document.getElementById('fpsSelect').value, 10) || 30;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: false });

      const srcVideo = document.createElement('video');
      srcVideo.src = this.videoUrl;
      srcVideo.muted = true;
      srcVideo.playsInline = true;
      await new Promise(res => { srcVideo.onloadedmetadata = res; });

      // Pick mimeType
      let mime = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mime)) {
        const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
        mime = candidates.find(t => MediaRecorder.isTypeSupported(t));
      }

      if (!mime) {
        alert('Kein unterstütztes Aufnahmeformat gefunden.');
        utils.hideElement('progressIndicator');
        return;
      }

      const stream = canvas.captureStream(fps);
      const chunks = [];
      const mr = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 3500000 });

      mr.ondataavailable = (ev) => {
        if (ev.data && ev.data.size) chunks.push(ev.data);
      };

      mr.onstop = () => {
        this.processedVideoBlob = new Blob(chunks, { type: mime.split(';')[0] });
        document.getElementById('progressText').textContent = '✅ Fertig!';
        document.getElementById('progressFill').style.width = '100%';

        // Auto download
        const ext = document.getElementById('formatSelect').value === 'mp4' ? 'mp4' : 'webm';
        utils.downloadBlob(this.processedVideoBlob, `video_export.${ext}`);

        setTimeout(() => utils.hideElement('progressIndicator'), 900);
      };

      // Start recording
      mr.start();
      document.getElementById('progressText').textContent = 'Aufnahme gestartet…';
      document.getElementById('progressFill').style.width = '25%';

      const total = this.endTime - this.startTime;
      const drawFrame = () => {
        ctx.drawImage(srcVideo, 0, 0, width, height);
      };

      const stopAll = () => {
        try { srcVideo.pause(); } catch (e) { }
        try { if (mr.state !== 'inactive') mr.stop(); } catch (e) { }
      };

      const hasRVFC = typeof srcVideo.requestVideoFrameCallback === 'function';

      const renderLoopRVFC = () => {
        if (srcVideo.currentTime >= this.endTime || srcVideo.ended) {
          stopAll();
          return;
        }
        drawFrame();
        const played = Math.min(Math.max(0, srcVideo.currentTime - this.startTime), total);
        const ratio = total ? played / total : 1;
        document.getElementById('progressFill').style.width = (25 + ratio * 65) + '%';
        document.getElementById('progressText').textContent = `Export ${Math.round(ratio * 100)}%…`;
        srcVideo.requestVideoFrameCallback(renderLoopRVFC);
      };

      const renderLoopRAF = () => {
        if (srcVideo.currentTime >= this.endTime || srcVideo.paused) {
          stopAll();
          return;
        }
        drawFrame();
        const played = Math.min(Math.max(0, srcVideo.currentTime - this.startTime), total);
        const ratio = total ? played / total : 1;
        document.getElementById('progressFill').style.width = (25 + ratio * 65) + '%';
        document.getElementById('progressText').textContent = `Export ${Math.round(ratio * 100)}%…`;
        requestAnimationFrame(renderLoopRAF);
      };

      await new Promise(r => { srcVideo.onseeked = r; srcVideo.currentTime = this.startTime; });
      await srcVideo.play();

      if (hasRVFC) {
        srcVideo.requestVideoFrameCallback(renderLoopRVFC);
      } else {
        requestAnimationFrame(renderLoopRAF);
      }

      // Safety stop
      const safety = setInterval(() => {
        if (srcVideo.currentTime >= this.endTime) {
          clearInterval(safety);
          stopAll();
        }
      }, 100);

    } catch (err) {
      console.error(err);
      alert('Fehler beim Export: ' + err?.message);
      utils.hideElement('progressIndicator');
    }
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => videoTools.init());
} else {
  videoTools.init();
}
