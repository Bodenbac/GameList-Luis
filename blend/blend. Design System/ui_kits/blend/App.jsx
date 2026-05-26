/* blend. App — composes Header, RecipeStrip, IngredientGrid, CartPanel + modals */
const { useState: useStateApp, useEffect: useEffectApp, useMemo } = React;

function BlendApp() {
  const categories = window.BLEND_CATEGORIES;
  const recipes    = window.BLEND_RECIPES;
  const starterSet = window.BLEND_STARTER_SET;

  const [selected, setSelected] = useStateApp(() => {
    const s = {};
    categories.forEach(c => c.items.forEach(i => { s[i.name] = starterSet.has(i.name); }));
    return s;
  });
  const [activeCat, setActiveCat]       = useStateApp("all");
  const [fontKey, setFontKey]           = useStateApp("classic");
  const [settingsOpen, setSettingsOpen] = useStateApp(false);
  const [exportOpen, setExportOpen]     = useStateApp(false);
  const [cartExpanded, setCartExpanded] = useStateApp(false);
  const [shake, setShake]               = useStateApp(0);
  const [isMobile, setIsMobile]         = useStateApp(typeof window !== "undefined" && window.innerWidth < 900);

  useEffectApp(() => {
    document.documentElement.setAttribute("data-font", fontKey);
  }, [fontKey]);

  useEffectApp(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const selectedItems = useMemo(() => (
    categories.flatMap(c => c.items.filter(i => selected[i.name]))
  ), [selected, categories]);

  const filteredItems = useMemo(() => {
    if (activeCat === "all") return categories.flatMap(c => c.items);
    const cat = categories.find(c => c.name === activeCat);
    return cat ? cat.items : [];
  }, [activeCat, categories]);

  const toggleItem = (name) => {
    setSelected(s => ({ ...s, [name]: !s[name] }));
    setShake(x => x + 1);
  };

  const toggleRecipe = (recipe) => {
    const allLoaded = recipe.ingredients.every(n => selected[n]);
    setSelected(s => {
      const next = { ...s };
      recipe.ingredients.forEach(n => { next[n] = !allLoaded; });
      return next;
    });
    setShake(x => x + 1);
  };

  const resetAll = () => {
    const s = {};
    categories.forEach(c => c.items.forEach(i => { s[i.name] = false; }));
    setSelected(s);
  };

  const tabs = [{ key: "all", label: "Alle" }, ...categories.map(c => ({ key: c.name, label: c.name }))];

  return (
    <>
      <BlendHeader
        cartCount={selectedItems.length}
        shakeTrigger={shake}
        onProfile={() => {}}
        onSettings={() => setSettingsOpen(true)}
        onCart={() => isMobile && setCartExpanded(e => !e)}
      />
      <main className="bk-page">
        <section className="bk-recipes-section">
          <p className="bk-eyebrow">Inspiration</p>
          <div className="bk-recipes-strip">
            {recipes.map(r => (
              <BlendRecipeCard
                key={r.name}
                recipe={r}
                loaded={r.ingredients.every(n => selected[n])}
                onClick={() => toggleRecipe(r)}
              />
            ))}
          </div>
        </section>
        <div className="bk-workspace">
          <div className="bk-ingredients-col">
            <BlendPillTabs tabs={tabs} active={activeCat} onChange={setActiveCat} />
            <div className="bk-ingredient-grid">
              {filteredItems.map((item, i) => (
                <BlendIngredientCard
                  key={item.name}
                  item={item}
                  selected={!!selected[item.name]}
                  onClick={() => toggleItem(item.name)}
                  staggerDelay={i * 28}
                />
              ))}
            </div>
          </div>
          <BlendCartPanel
            items={selectedItems}
            onRemove={toggleItem}
            onReset={resetAll}
            onExport={() => setExportOpen(true)}
            mobile={isMobile}
            expanded={cartExpanded}
            onToggle={() => setCartExpanded(e => !e)}
          />
        </div>
      </main>
      {isMobile && cartExpanded && <div className="bk-cart-overlay" onClick={() => setCartExpanded(false)} />}
      <BlendSettingsModal
        open={settingsOpen}
        fontKey={fontKey}
        onFontChange={setFontKey}
        onClose={() => setSettingsOpen(false)}
      />
      <BlendExportModal
        open={exportOpen}
        onByDrink={() => setExportOpen(false)}
        onAll={() => setExportOpen(false)}
        onClose={() => setExportOpen(false)}
      />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<BlendApp />);
