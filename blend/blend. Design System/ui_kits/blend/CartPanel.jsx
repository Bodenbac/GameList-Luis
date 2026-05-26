/* blend. CartPanel — sticky rail (desktop) / bottom sheet (mobile) */
const { useState: useStateCP, useEffect: useEffectCP } = React;

function BlendCartPanel({ items, onRemove, onReset, onExport, mobile, expanded, onToggle }) {
  return (
    <aside className={"bk-cart-panel" + (mobile ? " bk-cart-panel--mobile" : "") + (expanded ? " bk-cart-panel--expanded" : "")}>
      {mobile && (
        <div className="bk-cart-tabbar" onClick={onToggle}>
          <span className="bk-cart-tabbar-label">Einkaufszettel</span>
          <span className="bk-cart-tabbar-info">{items.length} Artikel</span>
        </div>
      )}
      <div className="bk-cart-inner">
        <div className="bk-cart-header">
          <h2 className="bk-cart-title">Einkaufszettel</h2>
          <span className="bk-cart-count">{items.length}</span>
        </div>
        {items.length === 0 ? (
          <div className="bk-cart-empty">
            <IconLeaf />
            <p>Noch nichts ausgewählt.</p>
          </div>
        ) : (
          <div className="bk-cart-list">
            {items.map(i => (
              <div key={i.name} className="bk-cart-row">
                <div className="bk-cart-row-left">
                  <span className="bk-cart-row-emoji">{i.emoji}</span>
                  <div>
                    <p className="bk-cart-row-name">{i.name}</p>
                    <p className="bk-cart-row-amount">{i.amount}</p>
                  </div>
                </div>
                <button className="bk-cart-remove" onClick={() => onRemove(i.name)} aria-label={`${i.name} entfernen`}>−</button>
              </div>
            ))}
          </div>
        )}
        <div className="bk-cart-actions">
          {items.length > 0 && (
            <button className="bk-btn bk-btn--export" onClick={onExport}>
              <IconShare /> <span style={{ marginLeft: 7 }}>Einkaufszettel teilen</span>
            </button>
          )}
          <button className="bk-btn bk-btn--secondary" onClick={onReset}>Zurücksetzen</button>
        </div>
      </div>
    </aside>
  );
}

window.BlendCartPanel = BlendCartPanel;
