/* blend. Creator — main app */
const { useState, useEffect, useRef, useMemo, useCallback } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "mixer": "modern",
  "layout": "ring",
  "bg": "dark",
  "showSaved": true
}/*EDITMODE-END*/;

const STORAGE_KEY = "blend.creator.smoothies.v1";
const CART_KEY = "blend.creator.cart.v1";

/* ──────────────────────────────────────────────────────────
   Layout math — chips arranged on a ring around the mixer
   ────────────────────────────────────────────────────────── */
const RING_RADIUS = 248;
const LABEL_RADIUS = 304;

function useChipLayout(categories, layout) {
  return useMemo(() => {
    if (layout === "rails") return { positions: [], labels: [] };
    const positions = [];
    const labels = [];
    const totalCats = categories.length;
    let span = 360;
    let startAngle = -90;
    if (layout === "half") {
      span = 200;
      startAngle = -170;
    }
    const arcPerCat = span / totalCats;
    categories.forEach((cat, i) => {
      const catCenter = startAngle + arcPerCat * (i + 0.5);
      labels.push({ id: cat.id, name: cat.name, angle: catCenter });
      const items = cat.items;
      const innerArc = arcPerCat - 16;
      const step = items.length > 1 ? innerArc / (items.length - 1) : 0;
      const a0 = items.length > 1 ? catCenter - innerArc / 2 : catCenter;
      items.forEach((item, j) => {
        const ang = a0 + j * step;
        const rad = (ang * Math.PI) / 180;
        positions.push({
          ...item,
          category: cat.id,
          x: Math.cos(rad) * RING_RADIUS,
          y: Math.sin(rad) * RING_RADIUS
        });
      });
    });
    return { positions, labels };
  }, [categories, layout]);
}

/* ──────────────────────────────────────────────────────────
   Drag-and-drop hook
   ────────────────────────────────────────────────────────── */
function useDrag(onDropOverTarget) {
  const [dragState, setDragState] = useState(null); // {item, x, y, moved}
  const dragRef = useRef(null);
  dragRef.current = dragState;

  const start = useCallback((item, e) => {
    const pt = e.touches ? e.touches[0] : e;
    setDragState({ item, x: pt.clientX, y: pt.clientY, moved: false });
  }, []);

  useEffect(() => {
    if (!dragState) return;
    const move = (e) => {
      const pt = e.touches ? e.touches[0] : e;
      const cur = dragRef.current;
      if (!cur) return;
      const dx = pt.clientX - cur.x;
      const dy = pt.clientY - cur.y;
      const moved = cur.moved || Math.hypot(dx, dy) > 5;
      setDragState({ ...cur, x: pt.clientX, y: pt.clientY, moved });
    };
    const end = (e) => {
      const cur = dragRef.current;
      if (!cur) return;
      const pt = e.changedTouches ? e.changedTouches[0] : e;
      // Hit test for drop zone
      const dropEl = document.elementFromPoint(pt.clientX, pt.clientY);
      const isOverDrop = dropEl && dropEl.closest && dropEl.closest(".cr-drop");
      if (!cur.moved || isOverDrop) {
        onDropOverTarget(cur.item, !cur.moved);
      }
      setDragState(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [!!dragState, onDropOverTarget]);

  return { dragState, start };
}

/* ──────────────────────────────────────────────────────────
   Storage
   ────────────────────────────────────────────────────────── */
function loadSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveSavedList(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}
function saveCart(list) {
  localStorage.setItem(CART_KEY, JSON.stringify(list));
}

/* ──────────────────────────────────────────────────────────
   Chip — one ingredient in the ring
   ────────────────────────────────────────────────────────── */
function Chip({ item, used, position, dragOffset, onPointerDown }) {
  const style = position
    ? {
        left: `calc(50% + ${position.x}px)`,
        top: `calc(50% + ${position.y}px)`
      }
    : undefined;
  return (
    <div
      className={"cr-ing-chip" + (used ? " is-used" : "") + (dragOffset ? " is-dragging" : "")}
      style={style}
      onPointerDown={(e) => onPointerDown(item, e)}
      role="button"
      aria-label={`${item.name} hinzufügen`}
    >
      <span className="cr-ing-chip-emoji">{item.emoji}</span>
      <span className="cr-ing-chip-tooltip">{item.name}</span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   3D Mixer — central component
   ────────────────────────────────────────────────────────── */
function Mixer({ mixerStyle, contents, phase, liquidColor, blendProgress }) {
  // Position ingredients inside the jug in a stable pseudo-random grid
  const positioned = useMemo(() => {
    return contents.map((item, i) => {
      const seed = (item.name.charCodeAt(0) * 13 + i * 47) % 100;
      const seed2 = (item.name.charCodeAt(item.name.length - 1) * 7 + i * 23) % 100;
      const left = 20 + (seed % 60);
      const top  = 30 + (seed2 % 55);
      const rot  = (seed - 50) * 0.4;
      return { ...item, left, top, rot, key: `${item.name}-${i}` };
    });
  }, [contents]);

  const showIngredients = phase !== "reveal";
  const showFinalLiquid = phase === "blending" || phase === "reveal";
  const liquidHeight = phase === "reveal" ? "82%" : (phase === "blending" ? `${blendProgress}%` : "0%");

  const dropOverRef = useRef(false);

  return (
    <div className="cr-mixer-wrap" data-mixer={mixerStyle}>
      <div className={"cr-mixer" + (phase === "blending" ? " is-blending" : "")}>
        <div className="cr-mixer-lid" aria-hidden="true"></div>
        <div className="cr-mixer-jug">
          <div className="cr-drop" aria-label="Mixer-Glas — Zutaten hier ablegen" />
          <div
            className="cr-mixer-liquid"
            style={{
              height: liquidHeight,
              "--liquid-color": liquidColor
            }}
          />
          <div className="cr-jug-contents">
            {showIngredients && positioned.map((p, i) => (
              <span
                key={p.key}
                className={"cr-jug-ingredient" + (phase === "blending" && blendProgress > 55 ? " is-fading" : "")}
                style={{
                  left: `${p.left}%`,
                  top: `${p.top}%`,
                  animationDelay: `${i * 50}ms`,
                  transform: `translate(-50%, -50%) rotate(${p.rot}deg)`
                }}
              >
                {p.emoji}
              </span>
            ))}
          </div>
          <div className="cr-mixer-blade" aria-hidden="true">
            <BladeSvg />
          </div>
        </div>
        <div className="cr-mixer-base">
          <div className="cr-mixer-base-row">
            <div className="cr-base-dial"></div>
            <div className="cr-base-readout">{phase === "blending" ? "MIX" : phase === "reveal" ? "DONE" : "STBY"}</div>
            <div className="cr-base-dial"></div>
          </div>
        </div>
        <div className="cr-base-brand">blend.</div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Result modal — naming + save + add to cart
   ────────────────────────────────────────────────────────── */
function ResultModal({ color, ingredients, onSave, onAddCart, onDismiss }) {
  const [name, setName] = useState(() => window.suggestName(ingredients));
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current && inputRef.current.focus(); inputRef.current && inputRef.current.select(); }, []);

  const shuffleName = () => {
    const fallbacks = [
      "Sonnen­shake", "Morgentau", "Wilder Garten", "Sattmacher", "Smaragd",
      "Honig­glanz", "Brombeer­wolke", "Erdgut", "Golden Hour", "Calm & Bright",
      "Sanftmut", "Berry Therapy", "Kakao Kuss", "Lemon Drift"
    ];
    setName(fallbacks[Math.floor(Math.random() * fallbacks.length)]);
  };

  const summary = ingredients.length + " Zutaten";
  const dominantCat = useMemo(() => {
    const counts = {};
    ingredients.forEach(i => { counts[i.category] = (counts[i.category] || 0) + 1; });
    const cat = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (!cat) return "—";
    const found = window.CREATOR_CATEGORIES.find(c => c.id === cat[0]);
    return found ? found.name : "—";
  }, [ingredients]);

  return (
    <div className="cr-result-overlay" role="dialog" aria-modal="true">
      <div className="cr-result-card" style={{ "--result-color": color }}>
        <div className="cr-result-glass" aria-hidden="true">
          <div className="cr-result-fill" style={{ background: color }} />
        </div>
        <p className="cr-result-eyebrow">Fertig gemixt</p>
        <h2 className="cr-result-heading">
          Dein leckerer Smoothie wartet
        </h2>
        <p className="cr-result-sub">Gib ihm einen Namen — wir speichern ihn in deiner Sammlung.</p>

        <div className="cr-name-row">
          <input
            ref={inputRef}
            className="cr-name-input"
            type="text"
            placeholder="Mein Smoothie"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
          />
          <button className="cr-name-shuffle" onClick={shuffleName} aria-label="Anderen Namen vorschlagen">
            <IconShuffle />
          </button>
        </div>

        <div className="cr-result-meta">
          <div className="cr-meta-cell">
            <p className="cr-meta-label">Inhalt</p>
            <div className="cr-meta-value">{summary}</div>
          </div>
          <div className="cr-meta-cell">
            <p className="cr-meta-label">Charakter</p>
            <div className="cr-meta-value">{dominantCat}</div>
          </div>
          <div className="cr-meta-cell">
            <p className="cr-meta-label">Farbton</p>
            <div className="cr-meta-value"><span className="cr-meta-swatch" style={{ background: color }} />{color.toUpperCase()}</div>
          </div>
        </div>


        <div className="cr-result-actions">
          <button className="cr-btn-blend" onClick={() => onSave(name || "Mein Smoothie")}>
            <IconSparkle /> In Sammlung speichern
          </button>
          <button className="cr-btn-cart" onClick={() => onAddCart(name || "Mein Smoothie")}>
            <IconCart size={15} /> Zutaten zum Einkaufszettel
          </button>
          <button className="cr-result-dismiss" onClick={onDismiss}>Verwerfen</button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   App
   ────────────────────────────────────────────────────────── */
function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [contents, setContents] = useState([]);
  const [phase, setPhase] = useState("idle"); // idle | blending | reveal
  const [blendProgress, setBlendProgress] = useState(0);
  const [toast, setToast] = useState(null);
  const [savedSmoothies, setSavedSmoothies] = useState(loadSaved);
  const [cart, setCart] = useState(loadCart);

  const categories = window.CREATOR_CATEGORIES;
  const layout = useChipLayout(categories, tweaks.layout);

  /* Apply data-bg attribute */
  useEffect(() => {
    document.body.setAttribute("data-bg", tweaks.bg);
  }, [tweaks.bg]);

  /* Liquid color — live as ingredients drop in */
  const liquidColor = useMemo(() => {
    if (contents.length === 0) return "rgba(212, 235, 225, 0.3)";
    return window.mixColors(contents);
  }, [contents]);

  /* Add / remove ingredients */
  const addIngredient = useCallback((item, viaClick) => {
    if (phase !== "idle") return;
    setContents((prev) => {
      // duplicate allowed up to 2x same item
      const occ = prev.filter(i => i.name === item.name).length;
      if (occ >= 2) {
        setToast({ text: `${item.name} ist schon doppelt drin`, color: "var(--amber-500)" });
        setTimeout(() => setToast(null), 1500);
        return prev;
      }
      return [...prev, item];
    });
  }, [phase]);

  const removeLast = useCallback(() => {
    setContents(prev => prev.slice(0, -1));
  }, []);

  const clearAll = useCallback(() => {
    setContents([]);
  }, []);

  /* Drag */
  const drag = useDrag(addIngredient);

  /* Blend */
  const startBlend = useCallback(() => {
    if (contents.length < 2) return;
    setPhase("blending");
    setBlendProgress(0);
    const start = performance.now();
    const dur = 2400;
    const tick = (now) => {
      const p = Math.min(100, ((now - start) / dur) * 100);
      setBlendProgress(p);
      if (p < 100) requestAnimationFrame(tick);
      else setTimeout(() => setPhase("reveal"), 250);
    };
    requestAnimationFrame(tick);
  }, [contents.length]);

  const dismissResult = useCallback(() => {
    setPhase("idle");
    setContents([]);
    setBlendProgress(0);
  }, []);

  const handleSave = useCallback((name) => {
    const entry = {
      id: Date.now(),
      name: name.trim() || "Mein Smoothie",
      color: liquidColor,
      ingredients: contents.map(c => c.name),
      createdAt: new Date().toISOString()
    };
    const next = [entry, ...savedSmoothies].slice(0, 24);
    setSavedSmoothies(next);
    saveSavedList(next);
    setToast({ text: `„${entry.name}" gespeichert`, color: liquidColor });
    setTimeout(() => setToast(null), 2400);
    dismissResult();
  }, [contents, liquidColor, savedSmoothies, dismissResult]);

  const handleAddToCart = useCallback((name) => {
    const newItems = contents.map(c => c.name).filter(n => !cart.includes(n));
    const next = [...cart, ...newItems];
    setCart(next);
    saveCart(next);
    // Bridge: mark items as selected in the main planner's localStorage
    try {
      const existing = JSON.parse(localStorage.getItem('blend-selected') || '{}');
      newItems.forEach(n => { existing[n] = true; });
      localStorage.setItem('blend-selected', JSON.stringify(existing));
    } catch(e) {}
    setToast({ text: `${newItems.length} Zutaten in Einkaufszettel`, color: "var(--amber-500)" });
    setTimeout(() => setToast(null), 2400);
  }, [contents, cart]);

  /* Determine which items are "used up" (visually faded in ring) */
  const usedNames = useMemo(() => {
    const counts = {};
    contents.forEach(c => { counts[c.name] = (counts[c.name] || 0) + 1; });
    return counts;
  }, [contents]);

  return (
    <>
      <Header cart={cart} savedCount={savedSmoothies.length} />

      <main className="cr-stage">
        <div className="cr-topbar">
          <div className="cr-eyebrow-stack">
            <span className="cr-eyebrow">Studio · Smoothie Creator</span>
            <h1 className="cr-title">
              Was kommt heute <em>in den Mixer?</em>
            </h1>
          </div>
        </div>

        <div className="cr-canvas" data-layout={tweaks.layout}>
          {/* RING layout */}
          {tweaks.layout !== "rails" && (
            <div className="cr-ring">
              {layout.labels.map((lab) => {
                const rad = (lab.angle * Math.PI) / 180;
                const lx = Math.cos(rad) * LABEL_RADIUS;
                const ly = Math.sin(rad) * LABEL_RADIUS;
                return (
                  <div
                    key={lab.id}
                    className="cr-segment-label"
                    style={{ left: `calc(50% + ${lx}px)`, top: `calc(50% + ${ly}px)` }}
                  >{lab.name}</div>
                );
              })}
              {layout.positions.map((p, i) => {
                const dragging = drag.dragState && drag.dragState.item.name === p.name && drag.dragState.moved;
                const offset = dragging
                  ? {
                      x: drag.dragState.x - (drag.startX || drag.dragState.x),
                      y: drag.dragState.y - (drag.startY || drag.dragState.y)
                    }
                  : null;
                return (
                  <Chip
                    key={`${p.category}-${p.name}-${i}`}
                    item={p}
                    used={(usedNames[p.name] || 0) >= 2}
                    position={{ x: p.x, y: p.y }}
                    dragOffset={null}
                    onPointerDown={drag.start}
                  />
                );
              })}
            </div>
          )}

          {/* RAILS layout */}
          {tweaks.layout === "rails" && (
            <>
              <div className="cr-rails left">
                {categories.slice(0, 3).map(cat => (
                  <div key={cat.id} className="cr-rail-section">
                    <div className="cr-rail-label">{cat.name}</div>
                    <div className="cr-rail-chips">
                      {cat.items.map(it => (
                        <Chip key={it.name}
                          item={{ ...it, category: cat.id }}
                          used={(usedNames[it.name] || 0) >= 2}
                          position={null}
                          dragOffset={null}
                          onPointerDown={drag.start}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="cr-rails right">
                {categories.slice(3).map(cat => (
                  <div key={cat.id} className="cr-rail-section">
                    <div className="cr-rail-label">{cat.name}</div>
                    <div className="cr-rail-chips">
                      {cat.items.map(it => (
                        <Chip key={it.name}
                          item={{ ...it, category: cat.id }}
                          used={(usedNames[it.name] || 0) >= 2}
                          position={null}
                          dragOffset={null}
                          onPointerDown={drag.start}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <Mixer
            mixerStyle={tweaks.mixer}
            contents={contents}
            phase={phase}
            liquidColor={liquidColor}
            blendProgress={blendProgress}
          />

          {/* Controls */}
          <div className="cr-mixer-controls">
            <div className="cr-count-badge">
              {contents.length === 0 ? (
                <span className="cr-count-empty">Ziehe Zutaten in den Mixer · oder tippe</span>
              ) : (
                <><strong>{contents.length}</strong> {contents.length === 1 ? "Zutat" : "Zutaten"} im Glas</>
              )}
            </div>
            <div className="cr-action-row">
              {contents.length > 0 && (
                <button className="cr-btn-clear" onClick={clearAll}>Zurücksetzen</button>
              )}
              <button
                className="cr-btn-blend"
                onClick={startBlend}
                disabled={contents.length < 2 || phase !== "idle"}
              >
                <IconSparkle />
                {phase === "blending" ? "Mixe …" : "Mixen & erstellen"}
              </button>
            </div>
          </div>

          {/* Side rail */}
          {tweaks.showSaved && (
            <aside className="cr-siderail">
              <div className="cr-card">
                <h3 className="cr-card-title">So funktioniert's</h3>
                <ol className="cr-hint-list">
                  <li><span className="cr-hint-num">1</span><span>Wähle Zutaten — ziehe oder tippe sie in den Mixer.</span></li>
                  <li><span className="cr-hint-num">2</span><span>Mindestens zwei Zutaten, dann „Mixen & erstellen".</span></li>
                  <li><span className="cr-hint-num">3</span><span>Gib dem Ergebnis einen Namen — fertig.</span></li>
                </ol>
              </div>
              <div className="cr-card" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                <h3 className="cr-card-title">Deine Sammlung</h3>
                <p className="cr-card-sub">{savedSmoothies.length === 0 ? "Noch nichts gemixt." : `${savedSmoothies.length} gespeichert`}</p>
                <div className="cr-saved-list">
                  {savedSmoothies.length === 0 && <div className="cr-saved-empty">Dein erster Smoothie wartet auf dich.</div>}
                  {savedSmoothies.slice(0, 8).map(s => (
                    <div key={s.id} className="cr-saved-row">
                      <div className="cr-saved-dot" style={{ background: s.color }} />
                      <div className="cr-saved-name">{s.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          )}
        </div>

        {/* Result modal */}
        {phase === "reveal" && (
          <ResultModal
            color={liquidColor}
            ingredients={contents}
            onSave={handleSave}
            onAddCart={handleAddToCart}
            onDismiss={dismissResult}
          />
        )}

        {/* Toast */}
        {toast && (
          <div className="cr-toast">
            <span className="cr-toast-dot" style={{ "--toast-color": toast.color }} />
            {toast.text}
          </div>
        )}
      </main>

      {/* Drag ghost — follows pointer when actually dragging */}
      {drag.dragState && drag.dragState.moved && (
        <div
          className="cr-ing-chip is-dragging"
          style={{
            position: "fixed",
            left: drag.dragState.x,
            top: drag.dragState.y,
            transform: "translate(-50%, -50%) scale(1.18)",
            pointerEvents: "none",
            zIndex: 500
          }}
        >
          <span className="cr-ing-chip-emoji">{drag.dragState.item.emoji}</span>
        </div>
      )}

      {/* Tweaks panel */}
      <TweaksPanel>
        <TweakSection label="Mixer-Stil" />
        <TweakSelect
          label="Form"
          value={tweaks.mixer}
          onChange={(v) => setTweak("mixer", v)}
          options={[
            { value: "classic", label: "Classic Trapez" },
            { value: "modern", label: "Modern Rechteck" },
            { value: "pitcher", label: "Pitcher (Schulter)" },
            { value: "apothecary", label: "Apothecary (Korken)" }
          ]}
        />
        <TweakSection label="Zutaten-Layout" />
        <TweakRadio
          label="Anordnung"
          value={tweaks.layout}
          onChange={(v) => setTweak("layout", v)}
          options={[
            { value: "ring", label: "Kreis" },
            { value: "half", label: "Halb" },
            { value: "rails", label: "Seiten" }
          ]}
        />
        <TweakSection label="Hintergrund" />
        <TweakRadio
          label="Stimmung"
          value={tweaks.bg}
          onChange={(v) => setTweak("bg", v)}
          options={[
            { value: "cream", label: "Cream" },
            { value: "orange", label: "Orange" },
            { value: "dark", label: "Dunkel" }
          ]}
        />
        <TweakSection label="Seitenleiste" />
        <TweakToggle
          label="Hinweise & Sammlung"
          value={tweaks.showSaved}
          onChange={(v) => setTweak("showSaved", v)}
        />
      </TweaksPanel>
    </>
  );
}

/* ──────────────────────────────────────────────────────────
   Header (compact, matches blend.)
   ────────────────────────────────────────────────────────── */
function Header({ cart, savedCount }) {
  return (
    <header className="cr-header">
      <div className="cr-header-left">
        <a className="cr-wordmark" href="../index.html">blend.</a>
        <nav className="cr-nav" aria-label="blend. Navigation">
          <a className="cr-nav-item" href="../index.html">Planner</a>
          <span className="cr-nav-item is-active">Creator</span>
        </nav>
        <div className="cr-actions">
          <button className="cr-icon-btn" aria-label="Profil"><IconProfile /></button>
          <button className="cr-icon-btn" aria-label="Einstellungen"><IconSettings /></button>
          <button className="cr-icon-btn cr-cart-btn" aria-label={`Einkaufszettel (${cart.length})`}>
            <IconCart />
            {cart.length > 0 && (
              <span className="cr-cart-badge">{cart.length}</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

/* Mount */
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
