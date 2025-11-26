import math
import random
import pygame as pg
from ..config import ZOMBIE_SPEED, ZOMBIE_HP, ZOMBIE_EAT_DPS, grid_rect, clamp, RED, ZOMBIE_COL, GRID_LEFT, COLS
from .base import Entity


class ZombieBase(Entity):
    width = 52
    height = 76

    def __init__(self, row: int, *, hp_mult: float = 1.0, speed_mult: float = 1.0, color=None):
        super().__init__()
        self.row = row
        r = grid_rect(row, COLS - 1)
        self.x = r.right + 50
        self.y = r.centery
        self.speed_base = ZOMBIE_SPEED * speed_mult * random.uniform(0.95, 1.05)
        self.hp = int(ZOMBIE_HP * hp_mult * random.uniform(0.9, 1.15))
        self.color = color or ZOMBIE_COL
        self.eating = False
        self.target_plant = None
        self.slow_timer = 0.0
        self.slow_mult = 1.0
        self.anim_phase = random.random() * math.tau
        self.bite_timer = random.uniform(0.3, 0.5)

    def rect(self) -> pg.Rect:
        return pg.Rect(int(self.x - self.width // 2), int(self.y - self.height // 2), self.width, self.height)

    def apply_slow(self, mult: float, time: float):
        # Keep strongest slow and longest time
        self.slow_mult = min(self.slow_mult, mult)
        self.slow_timer = max(self.slow_timer, time)

    def update(self, dt, game):
        if self.hp <= 0:
            self.alive = False
            return
        # decay slow
        if self.slow_timer > 0:
            self.slow_timer -= dt
            if self.slow_timer <= 0:
                self.slow_mult = 1.0

        if self.eating:
            if self.target_plant is None or not self.target_plant.alive:
                self.eating = False
                self.target_plant = None
            else:
                self.target_plant.take_damage(ZOMBIE_EAT_DPS * dt)
                self.bite_timer -= dt
                if self.bite_timer <= 0:
                    game.spawn_bite(self.x - self.width * 0.2, self.y)
                    self.bite_timer = random.uniform(0.25, 0.45)
                self.anim_phase += dt * 10
                return

        speed = self.speed_base * self.slow_mult
        self.x -= speed * dt
        if self.x < GRID_LEFT - 10:
            game.game_over = True

        self.anim_phase += dt * 4

        zr = self.rect()
        for p in game.plants:
            if getattr(p, 'row', None) != self.row or not p.alive:
                continue
            pr = grid_rect(p.row, p.col).inflate(-16, -16)
            if zr.colliderect(pr):
                self.eating = True
                self.target_plant = p
                break

    def draw(self, surf):
        r = self.rect()
        sway = math.sin(self.anim_phase * (1.4 if self.eating else 1.0)) * (4 if self.eating else 2)
        bob = math.sin(self.anim_phase * 2.2) * (2 if self.eating else 1)
        body = r.copy()
        body.y += 4 + int(bob)
        body.x += int(sway * 0.3)
        pg.draw.rect(surf, self.color, body, border_radius=6)
        head = pg.Rect(0, 0, body.width - 10, 28)
        head.midbottom = (body.centerx, body.top + 18)
        head.x += int(sway)
        head.y += int(bob * 0.5)
        pg.draw.rect(surf, (140, 160, 160), head, border_radius=6)
        pg.draw.circle(surf, (10, 10, 10), (head.left + 14, head.centery), 3)
        pg.draw.circle(surf, (10, 10, 10), (head.left + 28, head.centery + 2), 3)
        if self.eating:
            mouth = pg.Rect(0, 0, head.width - 14, 8)
            mouth.midtop = (head.centerx, head.bottom - 6)
            pg.draw.rect(surf, (160, 60, 60), mouth, border_radius=4)
        hp_ratio = clamp(self.hp / ZOMBIE_HP, 0, 1)
        hb_bg = pg.Rect(r.left, r.top - 10, r.width, 6)
        hb_fg = pg.Rect(r.left, r.top - 10, int(r.width * hp_ratio), 6)
        pg.draw.rect(surf, (50, 50, 50), hb_bg, border_radius=3)
        pg.draw.rect(surf, RED, hb_fg, border_radius=3)


class BasicZombie(ZombieBase):
    def __init__(self, row: int):
        super().__init__(row, hp_mult=1.0, speed_mult=1.0)


class FastZombie(ZombieBase):
    def __init__(self, row: int):
        super().__init__(row, hp_mult=0.8, speed_mult=1.6, color=(110, 130, 140))


class TankZombie(ZombieBase):
    def __init__(self, row: int):
        super().__init__(row, hp_mult=2.0, speed_mult=0.7, color=(80, 95, 105))
