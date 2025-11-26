import pygame as pg
from ..config import GRID_DARK, GRID_LIGHT, BORDER, grid_rect


class Tile:
    def __init__(self, row, col):
        self.row = row
        self.col = col
        self.rect = grid_rect(row, col)
        self.plant = None

    def draw(self, surf, highlight=False):
        color = GRID_LIGHT if (self.row + self.col) % 2 == 0 else GRID_DARK
        pg.draw.rect(surf, color, self.rect)
        pg.draw.rect(surf, BORDER, self.rect, 2)
        if highlight:
            hl = self.rect.inflate(-6, -6)
            pg.draw.rect(surf, (255, 255, 255), hl, 3)

