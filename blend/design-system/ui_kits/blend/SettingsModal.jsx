/* blend. SettingsModal — font + columns picker, bottom-sheet on mobile */

function BlendSettingsModal({ open, fontKey, onFontChange, onClose }) {
  if (!open) return null;
  const fonts = [
    { key: "classic",     name: "blend.", sub: "Standard",    style: { fontFamily: "'Playfair Display', serif" } },
    { key: "littlelord",  name: "blend.", sub: "LittleLord",  style: { fontFamily: "'LittleLord', serif" } },
    { key: "quirkyrobot", name: "blend.", sub: "QuirkyRobot", style: { fontFamily: "'QuirkyRobot', monospace" } },
    { key: "greatvibes",  name: "blend.", sub: "GreatVibes",  style: { fontFamily: "'GreatVibes', cursive", fontSize: 22 } }
  ];
  return (
    <div className="bk-modal bk-modal--visible" role="dialog" aria-modal="true">
      <div className="bk-modal-backdrop" onClick={onClose} />
      <div className="bk-modal-sheet">
        <p className="bk-modal-title">Einstellungen</p>
        <p className="bk-modal-section-label">Schriftart</p>
        <div className="bk-font-options">
          {fonts.map(f => (
            <button
              key={f.key}
              className={"bk-font-option" + (fontKey === f.key ? " bk-font-option--active" : "")}
              onClick={() => onFontChange(f.key)}
            >
              <div>
                <div className="bk-font-name" style={f.style}>{f.name}</div>
                <div className="bk-font-sub">{f.sub}</div>
              </div>
              <span className="bk-font-check">✓</span>
            </button>
          ))}
        </div>
        <button className="bk-modal-cancel" onClick={onClose}>Schließen</button>
      </div>
    </div>
  );
}

window.BlendSettingsModal = BlendSettingsModal;
