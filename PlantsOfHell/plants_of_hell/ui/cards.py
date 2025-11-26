import pygame as pg
from ..config import BLACK


class PlantCard:
    def __init__(self, label: str, plant_factory, x: int, y: int, w: int, h: int, preview_provider=None):
        self.label = label
        self.plant_factory = plant_factory
        self.rect = pg.Rect(x, y, w, h)
        self.cooldown = 0.0
        self.cooldown_time = 1.0
        self.preview_provider = preview_provider

    def can_pick(self):
        return self.cooldown <= 0

    def pick(self):
        if self.can_pick():
            self.cooldown = self.cooldown_time
            return True
        return False

    def update(self, dt):
        self.cooldown -= dt

    def draw(self, surf, font):
        col = (200, 230, 200) if self.can_pick() else (150, 160, 150)
        pg.draw.rect(surf, col, self.rect, border_radius=10)
        pg.draw.rect(surf, (40, 80, 60), self.rect, 3, border_radius=10)
        text = font.render(self.label, True, BLACK)
        surf.blit(text, (self.rect.centerx - text.get_width() // 2, self.rect.centery - text.get_height() // 2))

    def get_preview(self):
        if callable(self.preview_provider):
            return self.preview_provider()
        return self.preview_provider
