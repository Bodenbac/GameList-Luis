/* blend. ExportModal — share-as-text destination picker */

function BlendExportModal({ open, onByDrink, onAll, onClose }) {
  if (!open) return null;
  return (
    <div className="bk-modal bk-modal--visible" role="dialog" aria-modal="true">
      <div className="bk-modal-backdrop" onClick={onClose} />
      <div className="bk-modal-sheet">
        <p className="bk-modal-title">Einkaufszettel teilen</p>
        <button className="bk-export-option" onClick={onByDrink}>
          <span className="bk-export-icon">🥤</span>
          <div className="bk-export-text">
            <span className="bk-export-title">Nach Smoothie aufgeteilt</span>
          </div>
        </button>
        <button className="bk-export-option" onClick={onAll}>
          <span className="bk-export-icon">📋</span>
          <div className="bk-export-text">
            <span className="bk-export-title">Gesamter Einkaufszettel</span>
          </div>
        </button>
        <button className="bk-modal-cancel" onClick={onClose}>Abbrechen</button>
      </div>
    </div>
  );
}

window.BlendExportModal = BlendExportModal;
