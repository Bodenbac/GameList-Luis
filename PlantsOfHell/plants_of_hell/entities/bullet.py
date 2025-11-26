import pygame as pg
from ..config import WIDTH, PEA_DAMAGE, PEA_GREEN


class Bullet:
    def __init__(self, x: float, y: float, vx: float, radius: int = 7, damage: int = PEA_DAMAGE, *, color=None, slow: float = 0.0, slow_time: float = 0.0):
        self.x = x
        self.y = y
        self.vx = vx
        self.radius = radius
        self.damage = damage
        self.alive = True
        self.color = color or PEA_GREEN
        # slow is multiplier applied to zombie speed (e.g., 0.5), slow_time is duration in seconds
        self.slow = slow
        self.slow_time = slow_time

    def rect(self) -> pg.Rect:
        return pg.Rect(int(self.x - self.radius), int(self.y - self.radius), self.radius * 2, self.radius * 2)

    def update(self, dt):
        self.x += self.vx * dt
        if self.x > WIDTH + 40:
            self.alive = False

    def draw(self, surf, fancy_vfx: bool = True):
        cx, cy = int(self.x), int(self.y)
        pg.draw.circle(surf, self.color, (cx, cy), self.radius)
        pg.draw.circle(surf, (220, 255, 220), (cx - 2, cy - 2), max(1, self.radius - 5))
        if fancy_vfx:
            pg.draw.circle(surf, (120, 220, 120), (cx - 8, cy), max(1, self.radius - 3))
