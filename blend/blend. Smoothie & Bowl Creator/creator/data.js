/* blend. Creator — ingredient data */

window.CREATOR_CATEGORIES = [
  {
    id: "basis",
    name: "Basis",
    subtitle: "Sattmacher",
    items: [
      { name: "Haferflocken",       amount: "3 EL",     emoji: "🌾", color: "#E8D9B5", weight: 1.0 },
      { name: "Bananen",            amount: "1 Stück",  emoji: "🍌", color: "#F2D45A", weight: 1.2 },
      { name: "Skyr",               amount: "150 g",    emoji: "🍶", color: "#FBF7EE", weight: 0.9 },
      { name: "Datteln",            amount: "2 Stück",  emoji: "🌴", color: "#7A4626", weight: 0.6 }
    ]
  },
  {
    id: "obst",
    name: "Obst",
    subtitle: "Süße & Frische",
    items: [
      { name: "Beerenmix",          amount: "1 Handvoll", emoji: "🫐", color: "#5B2C5F", weight: 1.1 },
      { name: "Mango",              amount: "½ Stück",    emoji: "🥭", color: "#F0A500", weight: 1.0 },
      { name: "Äpfel",              amount: "1 Stück",    emoji: "🍎", color: "#C9D87C", weight: 0.9 },
      { name: "Erdbeeren",          amount: "5 Stück",    emoji: "🍓", color: "#D63A4A", weight: 1.0 },
      { name: "Ananas",             amount: "2 Scheiben", emoji: "🍍", color: "#F2D34A", weight: 0.9 },
      { name: "Pfirsich",           amount: "1 Stück",    emoji: "🍑", color: "#F5B273", weight: 0.9 }
    ]
  },
  {
    id: "gemuese",
    name: "Gemüse",
    subtitle: "Grün & Erdig",
    items: [
      { name: "Babyspinat",         amount: "1 Handvoll", emoji: "🥬", color: "#3D7A4E", weight: 0.8 },
      { name: "Karotten",           amount: "1 Stück",    emoji: "🥕", color: "#E08A2A", weight: 0.9 },
      { name: "Gurke",              amount: "¼ Stück",    emoji: "🥒", color: "#A8D17A", weight: 0.7 },
      { name: "Rote Bete",          amount: "1 Stück",    emoji: "🌠", color: "#8B1538", weight: 1.3 },
      { name: "Avocado",            amount: "½ Stück",    emoji: "🥑", color: "#7A8F3D", weight: 1.0 }
    ]
  },
  {
    id: "fluessig",
    name: "Flüssig",
    subtitle: "Basis-Liquid",
    items: [
      { name: "Hafermilch",         amount: "200 ml",   emoji: "🥛", color: "#F5EEDD", weight: 1.5 },
      { name: "Mandelmilch",        amount: "200 ml",   emoji: "🥛", color: "#F0E5D0", weight: 1.5 },
      { name: "Kokoswasser",        amount: "200 ml",   emoji: "🥥", color: "#EDF5F0", weight: 1.4 },
      { name: "Apfelsaft",          amount: "150 ml",   emoji: "🧃", color: "#E8C940", weight: 1.4 },
      { name: "Wasser",             amount: "150 ml",   emoji: "💧", color: "#E8F0F2", weight: 1.6 }
    ]
  },
  {
    id: "nuesse",
    name: "Nüsse & Samen",
    subtitle: "Crunch & Protein",
    items: [
      { name: "Erdnussmus",         amount: "1 EL",       emoji: "🥜", color: "#B88A4E", weight: 0.6 },
      { name: "Chiasamen",          amount: "1 TL",       emoji: "🌱", color: "#3B3326", weight: 0.3 },
      { name: "Leinsamen",          amount: "1 TL",       emoji: "🌿", color: "#8A6E3A", weight: 0.3 },
      { name: "Walnüsse",           amount: "1 Handvoll", emoji: "🌰", color: "#6E4A2A", weight: 0.5 },
      { name: "Mandeln",            amount: "1 Handvoll", emoji: "🌰", color: "#C9A179", weight: 0.5 }
    ]
  },
  {
    id: "extras",
    name: "Geschmack",
    subtitle: "Würze & Kick",
    items: [
      { name: "Kakao",              amount: "1 TL",     emoji: "🍫", color: "#3D2616", weight: 0.4 },
      { name: "Ingwer",             amount: "1 Stück",  emoji: "🫛", color: "#E8C988", weight: 0.3 },
      { name: "Zimt",               amount: "1 Prise",  emoji: "🌰", color: "#B8703D", weight: 0.2 },
      { name: "Kurkuma",            amount: "1 Prise",  emoji: "✨", color: "#E0A52C", weight: 0.3 },
      { name: "Vanille",            amount: "1 Prise",  emoji: "🌼", color: "#F5E6C0", weight: 0.2 },
      { name: "Honig",              amount: "1 TL",     emoji: "🍯", color: "#E0A02C", weight: 0.4 }
    ]
  }
];

window.CREATOR_FLAT = (() => {
  const all = [];
  window.CREATOR_CATEGORIES.forEach(cat => {
    cat.items.forEach(it => all.push({ ...it, category: cat.id }));
  });
  return all;
})();

window.hexToRgb = function(hex) {
  const h = hex.replace("#", "");
  return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) };
};

window.rgbToHex = function(r, g, b) {
  const c = v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");
  return "#" + c(r) + c(g) + c(b);
};

window.mixColors = function(ingredients) {
  if (!ingredients.length) return "#EEE9E1";
  let r = 0, g = 0, b = 0, w = 0;
  ingredients.forEach(ing => {
    const c = window.hexToRgb(ing.color);
    const wt = ing.weight || 1;
    r += Math.pow(c.r / 255, 2.2) * wt;
    g += Math.pow(c.g / 255, 2.2) * wt;
    b += Math.pow(c.b / 255, 2.2) * wt;
    w += wt;
  });
  r = Math.pow(r / w, 1 / 2.2) * 255;
  g = Math.pow(g / w, 1 / 2.2) * 255;
  b = Math.pow(b / w, 1 / 2.2) * 255;
  return window.rgbToHex(r, g, b);
};

window.suggestName = function(ingredients) {
  if (!ingredients.length) return "";
  const names = ingredients.map(i => i.name);
  const has = n => names.some(name => name.toLowerCase().includes(n.toLowerCase()));
  if (has("Beere") || has("Erdbeer")) return "Berry Boost";
  if (has("Mango") && has("Karotte")) return "Sonnenkuss";
  if (has("Spinat") || has("Avocado")) return "Green Glow";
  if (has("Kakao")) return "Schoko Power";
  if (has("Rote Bete")) return "Beet Therapy";
  if (has("Kurkuma")) return "Golden Hour";
  if (has("Banane") && has("Erdnuss")) return "Sattmacher";
  return "Mein Smoothie";
};
