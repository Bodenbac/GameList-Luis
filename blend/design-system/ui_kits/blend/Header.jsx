/* blend. Header — fixed, frosted, wordmark + actions + cart */
const { useState, useEffect, useRef } = React;

function BlendHeader({ cartCount, onSettings, onProfile, onCart, shakeTrigger }) {
  const [shaking, setShaking] = useState(false);
  const [popping, setPopping] = useState(false);
  const [entering, setEntering] = useState(false);
  const prevCount = useRef(cartCount);

  useEffect(() => {
    if (shakeTrigger === 0) return;
    setShaking(true);
    const t = setTimeout(() => setShaking(false), 280);
    return () => clearTimeout(t);
  }, [shakeTrigger]);

  useEffect(() => {
    if (cartCount === 0) { prevCount.current = 0; return; }
    if (prevCount.current === 0) {
      setEntering(true);
      const t = setTimeout(() => setEntering(false), 200);
      prevCount.current = cartCount;
      return () => clearTimeout(t);
    }
    if (cartCount !== prevCount.current) {
      setPopping(true);
      const t = setTimeout(() => setPopping(false), 130);
      prevCount.current = cartCount;
      return () => clearTimeout(t);
    }
  }, [cartCount]);

  return (
    <header className="bk-header">
      <div className="bk-header-left">
        <a className="bk-wordmark" href="#">blend.</a>
        <button className="bk-icon-btn" onClick={onProfile} aria-label="Profil"><IconProfile /></button>
        <button className="bk-icon-btn" onClick={onSettings} aria-label="Einstellungen"><IconSettings /></button>
      </div>
      <button className={"bk-cart-btn" + (shaking ? " bk-cart-btn--shaking" : "")} onClick={onCart} aria-label="Warenkorb">
        <IconCart />
        {cartCount > 0 && (
          <span className={"bk-cart-badge" + (entering ? " bk-cart-badge--entering" : "") + (popping ? " bk-cart-badge--popping" : "")}>{cartCount}</span>
        )}
      </button>
    </header>
  );
}

window.BlendHeader = BlendHeader;
