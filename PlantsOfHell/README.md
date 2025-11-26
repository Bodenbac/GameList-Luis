Plants of Hell — a Pygame mini clone of Plants vs. Zombies

How to run

- Install Python 3.9+.
- Install dependencies: `python -m pip install -r requirements.txt`.
- Start the game (package): `python -m plants_of_hell`
- Or via wrapper script: `python game.py`

Gameplay

- 5 lanes × 9 columns board.
- Drag the Peashooter card from the bottom bar and drop it on a tile to place a plant.
- Plants fire peas horizontally along their lane.
- Zombies spawn on the right and walk left. If any reaches the house (left side), it’s game over.
- Zombies stop and eat plants when colliding with them.
 - Peashooter now has recoil + muzzle flash and simple particle effects.
 - Sounds: procedural shoot and hit effects (no external files). If audio init fails, the game auto-disables sound.

Notes

- This prototype uses simple shapes, no external assets.
- Tweak constants in `plants_of_hell/config.py` to adjust speeds, rates, and sizes.

Project structure

- `plants_of_hell/` — package root
  - `config.py` — sizes, colors, tuning knobs
  - `game.py` — main game loop and orchestration
  - `__main__.py` — module entry point (`python -m plants_of_hell`)
  - `entities/` — gameplay objects (`plants.py`, `zombie.py`, `bullet.py`)
  - `ui/` — board and cards UI (`board.py`, `cards.py`)
  - `effects/` — particles and screen effects (`particles.py`)
  - `audio/` — procedural sound effects (`sound.py`)
- `game.py` — thin wrapper for convenience
