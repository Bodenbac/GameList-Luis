/* blend. RecipeCard — inspiration tile with color-dot or loaded check */

function BlendRecipeCard({ recipe, loaded, onClick }) {
  return (
    <div
      className={"bk-recipe-card" + (loaded ? " bk-recipe-card--loaded" : "")}
      onClick={onClick}
      role="button"
    >
      <div className="bk-recipe-top">
        <span className="bk-recipe-name">{recipe.name}</span>
        {loaded
          ? <span className="bk-recipe-check">✓</span>
          : <span className="bk-recipe-dot" style={{ background: recipe.color }} />}
      </div>
      <div className="bk-recipe-divider" />
      <ul className="bk-recipe-list">
        {recipe.ingredients.map(ing => (
          <li key={ing} className="bk-recipe-ingredient">{ing}</li>
        ))}
      </ul>
    </div>
  );
}

window.BlendRecipeCard = BlendRecipeCard;
