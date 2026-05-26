/* blend. PillTabs — horizontal scrollable category filter */

function BlendPillTabs({ tabs, active, onChange }) {
  return (
    <div className="bk-pill-tabs">
      {tabs.map(t => (
        <button
          key={t.key}
          className={"bk-pill-tab" + (active === t.key ? " bk-pill-tab--active" : "")}
          onClick={() => onChange(t.key)}
        >{t.label}</button>
      ))}
    </div>
  );
}

window.BlendPillTabs = BlendPillTabs;
