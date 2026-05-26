/* blend. IngredientCard — emoji + name + amount, selected = green-100 fill */
const { useState: useStateIC } = React;

function BlendIngredientCard({ item, selected, onClick, staggerDelay }) {
  const [selecting, setSelecting] = useStateIC(false);
  const handleClick = () => {
    setSelecting(true);
    setTimeout(() => setSelecting(false), 200);
    onClick();
  };
  return (
    <button
      className={
        "bk-ing-card" +
        (selected ? " bk-ing-card--selected" : "") +
        (selecting ? " bk-ing-card--selecting" : "") +
        " bk-ing-card--stagger"
      }
      onClick={handleClick}
      aria-pressed={selected ? "true" : "false"}
      style={{ animationDelay: `${staggerDelay}ms` }}
    >
      <span className="bk-ing-emoji" aria-hidden="true">{item.emoji}</span>
      <div className="bk-ing-top">
        <span className="bk-ing-name">{item.name}</span>
        <span className="bk-ing-check" aria-hidden="true">✓</span>
      </div>
      <span className="bk-ing-amount">{item.amount}</span>
    </button>
  );
}

window.BlendIngredientCard = BlendIngredientCard;
