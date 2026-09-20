# Spiele & Werkzeuge

Meine Sammlung eigener Browserspiele und Werkzeuge. Alles läuft über GitHub Pages,
ohne Build-Schritt und ohne Abhängigkeiten außer ein paar CDN-Skripten.

**Startseite: https://bodenbac.github.io/GameList-Luis/**

| Projekt | Was es ist | Link |
| --- | --- | --- |
| **Legion of Towers** | Tower Defense mit sechs Karten, sechs Turmtypen und Multiplayer-Lobby (PeerJS) | [spielen](https://bodenbac.github.io/GameList-Luis/legion-of-towers/) |
| **Scam Slots** | Spielautomat mit Truhen, Items und Raritäten | [spielen](https://bodenbac.github.io/GameList-Luis/scam-slots/) |
| **blend.** | Smoothie-Planer mit Einkaufsliste | [öffnen](https://bodenbac.github.io/GameList-Luis/blend/) |
| **SuperTool** | Bild-, Video- und PDF-Werkzeuge, komplett clientseitig | [öffnen](https://bodenbac.github.io/GameList-Luis/super-tool/) |

## Aufbau

Jedes Projekt liegt in einem eigenen Ordner und bringt seine Assets selbst mit.
Einen gemeinsamen Asset-Ordner gibt es bewusst nicht mehr — so lässt sich ein Projekt
verschieben oder kopieren, ohne dass Pfade brechen.

```
index.html              Startseite mit der Übersicht
legion-of-towers/       index.html, main.js, styles.css + assets/{ui,maps,towers}
scam-slots/             index.html + assets/{chests,items,slot-symbols}
super-tool/             index.html + css/ + js/
blend/                  index.html + assets/fonts/
  ├── creator/          Drag-and-drop-Variante des Planers
  └── design-system/    Farben, Typografie, Komponenten-Previews
```

Pfade zu Assets sind durchgehend relativ. Ordner- und Dateinamen sind kleingeschrieben
und mit Bindestrichen getrennt, damit die URLs ohne `%20` auskommen und auch auf
case-sensitiven Servern funktionieren.

Die `.nojekyll`-Datei sorgt dafür, dass GitHub Pages die Dateien unverändert ausliefert,
statt sie durch Jekyll zu schicken.

## Kontakt

- E-Mail: luis-bodenbach@t-online.de
- GitHub: [@Bodenbac](https://github.com/Bodenbac)
