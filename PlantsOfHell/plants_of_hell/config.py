from pathlib import Path
import pygame as pg

# Board layout
ROWS = 5
COLS = 9
TILE_W = 96
TILE_H = 96
GRID_TOP = 40
GRID_LEFT = 40
BAR_H = 120
MARGIN_RIGHT = 40
MARGIN_BOTTOM = 20

WIDTH = GRID_LEFT + COLS * TILE_W + MARGIN_RIGHT
HEIGHT = GRID_TOP + ROWS * TILE_H + BAR_H + MARGIN_BOTTOM

FPS = 60

# Gameplay tuning
PEA_SPEED = 360.0  # px/s
PEASHOOTER_FIRE_RATE = 1.2  # s between shots
PEA_DAMAGE = 20

ZOMBIE_SPEED = 26.0  # px/s baseline
ZOMBIE_HP = 100
ZOMBIE_SPAWN_EVERY = 2.2  # seconds between spawns
ZOMBIE_EAT_DPS = 28  # damage per second to plants

PLANT_MAX_HP = 100

# Colors
BG = (28, 120, 65)
GRID_DARK = (22, 100, 55)
GRID_LIGHT = (24, 110, 60)
BORDER = (20, 80, 45)
WHITE = (240, 240, 240)
BLACK = (10, 10, 10)
YELLOW = (240, 220, 60)
PEA_GREEN = (140, 240, 140)
ZOMBIE_COL = (90, 110, 120)
PLANT_COL = (40, 180, 60)
RED = (220, 60, 60)

# Paths
PACKAGE_DIR = Path(__file__).resolve().parent
ROOT_DIR = PACKAGE_DIR.parent
ASSETS_DIR = ROOT_DIR / "assets"


def grid_rect(row: int, col: int) -> pg.Rect:
    return pg.Rect(GRID_LEFT + col * TILE_W, GRID_TOP + row * TILE_H, TILE_W, TILE_H)


def clamp(v, a, b):
    return max(a, min(b, v))
