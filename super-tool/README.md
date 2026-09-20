# SuperTool - All-in-One Toolkit

Ein professionelles All-in-One-Toolkit für Bild-, Video- und Dokumentenbearbeitung, das vollständig im Browser läuft.

## 🚀 Features

### 🖼️ Bildbearbeitung Pro
- Bilder zuschneiden und skalieren
- Filter anwenden (Helligkeit, Kontrast, Sättigung)
- Mehrere Exportformate (PNG, JPEG, WebP)
- Drag & Drop Support

### 🖼️× Multi-Bildbearbeitung
- Bis zu 20 Bilder gleichzeitig laden
- Galerie-Ansicht mit Thumbnails
- Einzelne Bilder auswählen und bearbeiten
- Batch-Download-Funktionalität

### 🎬 Video Editor Pro
- Videos schneiden und trimmen
- Anpassbare FPS und Bitrate
- Export in WebM/MP4
- Echtzeit-Vorschau
- Timeline-Navigation

### 📄 PDF ↔ DOCX Konverter
- PDF zu DOCX konvertieren
- DOCX zu PDF konvertieren
- OCR-Unterstützung für gescannte PDFs
- Textvorschau vor Export

### 📐 SVG → PNG Konverter
- Batch-Konvertierung mehrerer SVG-Dateien
- Automatische Größenerkennung
- Einzelne oder alle Dateien herunterladen
- Konvertierungsstatistiken

### 🎨 SVG Reworker
- SVG-Farben live ändern und ersetzen
- Drehen, spiegeln und skalieren
- Live-Vorschau mit allen Änderungen
- Als PNG exportieren mit anpassbarer Größe

## 📁 Projekt-Struktur

```
SuperTool/
├── index.html              # Haupt-HTML-Datei mit allen Tools
├── css/
│   └── styles.css          # Gemeinsame Styles für alle Tools
├── js/
│   ├── main.js                 # Haupt-JavaScript (Navigation, Utilities)
│   ├── image-editor.js         # Einzelbild-Editor
│   ├── multi-image-editor.js   # Multi-Bild-Editor
│   ├── video-editor.js         # Video-Editor
│   ├── pdf-converter.js        # PDF-Konverter
│   └── svg-tools.js            # SVG → PNG & SVG Reworker
├── assets/                 # Ordner für Assets (falls benötigt)
├── index.html.backup       # Backup der ursprünglichen index.html
└── README.md               # Diese Datei
```

## 🛠️ Verwendete Technologien

- **HTML5 Canvas** - Bildbearbeitung
- **MediaRecorder API** - Video-Export
- **PDF.js** - PDF-Verarbeitung
- **Mammoth.js** - DOCX-Verarbeitung
- **Tesseract.js** - OCR für PDFs
- **html2pdf.js** - PDF-Generierung
- **docx.js** - DOCX-Generierung

## 📖 Verwendung

1. Öffnen Sie `index.html` in einem modernen Browser (Chrome, Firefox, Edge empfohlen)
2. Wählen Sie ein Tool aus der Sidebar:
   - **Bild** - Einzelbild-Editor
   - **Multi** - Mehrere Bilder gleichzeitig
   - **Video** - Video-Editor
   - **PDF** - PDF/DOCX-Konverter
   - **SVG→PNG** - SVG zu PNG Batch-Konverter
   - **SVG Edit** - SVG Farben ändern und bearbeiten
3. Laden Sie Ihre Dateien hoch (Drag & Drop oder Klick)
4. Bearbeiten Sie Ihre Dateien mit den verfügbaren Tools
5. Laden Sie das Ergebnis herunter

## 🎨 Design-System

- **Farbschema**: Dunkles Theme mit blauen und cyan Akzenten
- **Schriftart**: Inter (Google Fonts)
- **Animationen**: Sanfte Übergänge und Hover-Effekte
- **Responsive**: Optimiert für Desktop und Mobile

## 💡 Hinweise

- Alle Verarbeitung erfolgt **lokal im Browser** - keine Daten werden hochgeladen
- Moderne Browser erforderlich (ES6+ Support)
- Für beste Performance: Chrome oder Edge verwenden
- OCR lädt beim ersten Mal Sprachdaten aus dem Internet

## 🔧 Entwicklung

### Dateistruktur ändern
Die Dateien sind modular aufgebaut:
- Jedes Tool hat seine eigene JS-Datei
- Styles sind zentral in `css/styles.css`
- Gemeinsame Funktionen in `js/main.js`

### Neues Tool hinzufügen
1. HTML-Markup in `index.html` unter `tool-content-wrapper` hinzufügen
2. Neuen Tab in der Sidebar erstellen
3. Neue JS-Datei im `js/`-Ordner erstellen
4. Script-Tag in `index.html` einfügen

## 📝 Lizenz

Dieses Projekt ist für private und kommerzielle Nutzung frei verfügbar.

## 🤝 Mitwirkende

Erstellt mit Claude Code (Anthropic)

---

**Version**: 1.0.0
**Letztes Update**: Dezember 2025
