import pygame as pg
from ..config import clamp


class Particle:
    def __init__(self, x, y, vx, vy, radius, life, color, fade=True):
        self.x = x
        self.y = y
        self.vx = vx
        self.vy = vy
        self.radius = radius
        self.life = life
        self.color = color
        self.fade = fade

    def update(self, dt):
        self.life -= dt
        self.x += self.vx * dt
        self.y += self.vy * dt
        self.vx *= 0.98
        self.vy += 10 * dt

    def draw(self, surf):
        if self.life <= 0:
            return
        alpha = 255
        if self.fade:
            alpha = int(255 * clamp(self.life, 0, 1))
        col = (*self.color, alpha)
        s = pg.Surface((self.radius * 2, self.radius * 2), pg.SRCALPHA)
        pg.draw.circle(s, col, (self.radius, self.radius), self.radius)
        surf.blit(s, (int(self.x - self.radius), int(self.y - self.radius)))

