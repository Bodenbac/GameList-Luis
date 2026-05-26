/* blend. data — lifted from SmoothiePlanner/index.html */

window.BLEND_CATEGORIES = [
  {
    name: "Basis & Sattmacher",
    items: [
      { name: "Haferflocken",             amount: "1 Packung",        emoji: "🌾" },
      { name: "Bananen",                  amount: "8–10 Stück",       emoji: "🍌" },
      { name: "Skyr oder Naturjoghurt",   amount: "500 g – 1 kg",     emoji: "🍶" },
      { name: "Milch oder Hafermilch",    amount: "1–2 Liter",        emoji: "🥛" },
      { name: "Erdnussmus",               amount: "1 Glas",           emoji: "🥜" },
      { name: "Leinsamen oder Chiasamen", amount: "1 Packung",        emoji: "🌱" },
      { name: "Kakao ungesüßt",           amount: "1 Packung",        emoji: "🍫" }
    ]
  },
  {
    name: "Obst",
    items: [
      { name: "TK-Beerenmix",             amount: "1 große Packung",  emoji: "🫐" },
      { name: "TK-Mango oder TK-Ananas",  amount: "1 Packung",        emoji: "🥭" },
      { name: "Äpfel",                    amount: "4–6 Stück",        emoji: "🍎" },
      { name: "Zitronen oder Limetten",   amount: "3–4 Stück",        emoji: "🍋" },
      { name: "Datteln",                  amount: "1 kleine Packung", emoji: "🌴" }
    ]
  },
  {
    name: "Gemüse",
    items: [
      { name: "Babyspinat oder TK-Spinat", amount: "1 Packung", emoji: "🥬" },
      { name: "Karotten",                  amount: "1 kg",       emoji: "🥕" },
      { name: "Gurke",                     amount: "1 Stück",    emoji: "🥒" },
      { name: "Gekochte Rote Bete",        amount: "1 Packung",  emoji: "🫐" }
    ]
  },
  {
    name: "Geschmack & Extras",
    items: [
      { name: "Ingwer",  amount: "1 kleines Stück", emoji: "🌿" },
      { name: "Zimt",    amount: "1 Dose",          emoji: "🫙" },
      { name: "Kurkuma", amount: "1 Dose",          emoji: "🌻" }
    ]
  }
];

window.BLEND_RECIPES = [
  { name: "Sattmacher Shake", color: "#C8A96E", ingredients: ["Haferflocken", "Bananen", "Milch oder Hafermilch", "Erdnussmus", "Kakao ungesüßt"] },
  { name: "Berry Protein",    color: "#9B6EA8", ingredients: ["TK-Beerenmix", "Bananen", "Skyr oder Naturjoghurt", "Milch oder Hafermilch", "Haferflocken"] },
  { name: "Green Glow",       color: "#4A9B6F", ingredients: ["Babyspinat oder TK-Spinat", "Bananen", "Äpfel", "Zitronen oder Limetten"] },
  { name: "Mango Karotte",    color: "#E07B39", ingredients: ["TK-Mango oder TK-Ananas", "Karotten", "Bananen", "Ingwer"] },
  { name: "Detox Grün",       color: "#5BAD72", ingredients: ["Babyspinat oder TK-Spinat", "Gurke", "Äpfel", "Zitronen oder Limetten", "Ingwer"] },
  { name: "Golden Glow",      color: "#D4A017", ingredients: ["Karotten", "Bananen", "Kurkuma", "Ingwer", "Milch oder Hafermilch"] },
  { name: "Schoko Power",     color: "#6B3A2A", ingredients: ["Kakao ungesüßt", "Bananen", "Erdnussmus", "Haferflocken", "Milch oder Hafermilch"] },
  { name: "Rote Bete Boost",  color: "#A0264A", ingredients: ["Gekochte Rote Bete", "Äpfel", "Zitronen oder Limetten", "Ingwer"] },
  { name: "Tropical Vibes",   color: "#F0A500", ingredients: ["TK-Mango oder TK-Ananas", "Bananen", "Milch oder Hafermilch", "Datteln"] },
  { name: "Chia Power",       color: "#7B9EA6", ingredients: ["Leinsamen oder Chiasamen", "TK-Beerenmix", "Bananen", "Skyr oder Naturjoghurt"] }
];

window.BLEND_STARTER_SET = new Set([
  "Haferflocken", "Bananen", "Skyr oder Naturjoghurt", "Milch oder Hafermilch",
  "Erdnussmus", "TK-Beerenmix", "Äpfel", "Babyspinat oder TK-Spinat"
]);

window.BLEND_ITEM_MAP = (() => {
  const map = {};
  window.BLEND_CATEGORIES.forEach(cat => cat.items.forEach(i => { map[i.name] = i; }));
  return map;
})();
