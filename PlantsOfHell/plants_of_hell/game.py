import random
import sys
import pygame as pg

from .config import (
    WIDTH,
    HEIGHT,
    FPS,
    BG,
    BORDER,
    GRID_TOP,
    GRID_LEFT,
    ROWS,
    COLS,
    TILE_H,
    BAR_H,
    ZOMBIE_SPAWN_EVERY,
    WHITE,
    grid_rect,
)
from .ui.board import Tile
from .ui.cards import PlantCard
from .ui.widgets import Button
from .entities.plants import Peashooter, Repeater, SnowPea, Wallnut
from .entities.bullet import Bullet
from .entities.zombie import BasicZombie, FastZombie, TankZombie
from .effects.particles import Particle
from .audio.sound import SoundBank
from .config import clamp
from .config import PEA_SPEED
from .ui.settings import SettingsPanel
from .ui.plant_settings import PlantInspector


class Game:
    def __init__(self):
        pg.init()
        pg.display.set_caption("Plants of Hell")
        self.screen = pg.display.set_mode((WIDTH, HEIGHT))
        self.clock = pg.time.Clock()
        self.font = pg.font.SysFont("consolas", 22)
        self.big_font = pg.font.SysFont("consolas", 48, bold=True)

        # Sounds
        self.snd = SoundBank()

        # grid
        self.tiles = [Tile(r, c) for r in range(ROWS) for c in range(COLS)]

        # entity collections
        self.plants = []
        self.bullets = []
        self.zombies = []
        self.particles = []

        # speeds/config passed into entities if needed
        self.speeds = {'pea': PEA_SPEED}

        # UI
        bar_top = GRID_TOP + ROWS * TILE_H + 20
        card_w, card_h = 140, 80
        self.cards = [
            PlantCard("Peashooter", lambda r, c: Peashooter(r, c), GRID_LEFT, bar_top, card_w, card_h, preview_provider=Peashooter.preview_surface),
            PlantCard("Repeater",   lambda r, c: Repeater(r, c),   GRID_LEFT + 160, bar_top, card_w, card_h, preview_provider=Repeater.preview_surface),
            PlantCard("Snow Pea",   lambda r, c: SnowPea(r, c),    GRID_LEFT + 320, bar_top, card_w, card_h, preview_provider=SnowPea.preview_surface),
            PlantCard("Wall-nut",   lambda r, c: Wallnut(r, c),    GRID_LEFT + 480, bar_top, card_w, card_h, preview_provider=Wallnut.preview_surface),
        ]
        # Settings button on the right side of the bar
        self.settings_button = Button(pg.Rect(WIDTH - 160, bar_top + (card_h - 40)//2, 140, 40), "Settings", self.font)
        self.dragging_card = None
        self.drag_pos = (0, 0)

        # spawning/state
        self.spawn_timer = 1.0
        self.game_over = False
        # settings state
        self.settings = {'particles': True, 'fancy_vfx': True}
        self.effects_volume = 0.8
        self.music_volume = 0.0
        self.settings_panel = SettingsPanel(self.font)
        self.plant_inspector = PlantInspector(self.font)
        # apply initial volumes
        if self.snd and self.snd.enabled:
            self.snd.set_effects_volume(self.effects_volume)
            self.snd.set_music_volume(self.music_volume)

    def tile_at_pos(self, pos):
        x, y = pos
        for t in self.tiles:
            if t.rect.collidepoint(x, y):
                return t
        return None

    def place_plant(self, tile, plant_factory):
        if tile.plant is not None:
            return False
        p = plant_factory(tile.row, tile.col)
        tile.plant = p
        self.plants.append(p)
        return True

    def spawn_flash(self, x, y, color=(255, 255, 200)):
        self.particles.append(Particle(x, y, 0, 0, 8, 0.12, color))

    def spawn_smoke(self, x, y, count=4):
        for _ in range(count):
            vx = random.uniform(10, 40)
            vy = random.uniform(-30, -10)
            r = random.randint(3, 5)
            life = random.uniform(0.3, 0.6)
            self.particles.append(Particle(x, y, vx, vy, r, life, (180, 220, 180)))

    def spawn_bite(self, x, y):
        if not self.settings.get('particles', True):
            return
        for _ in range(3):
            vx = random.uniform(-50, 50)
            vy = random.uniform(-20, 20)
            life = random.uniform(0.2, 0.35)
            self.particles.append(Particle(x, y, vx, vy, 4, life, (255, 120, 90)))

    def row_for_y(self, y: float) -> int:
        row = int((y - GRID_TOP) // TILE_H)
        return clamp(row, 0, ROWS - 1)

    def update(self, dt):
        if self.game_over:
            self.plant_inspector.hide()
            return
        if self.settings_panel.open:
            return
        for c in self.cards:
            c.update(dt)
        # plants
        for p in list(self.plants):
            p.update(dt, self)
            if hasattr(p, "animate"):
                p.animate(dt)
            if not p.alive:
                for t in self.tiles:
                    if t.plant is p:
                        t.plant = None
                        break
                self.plants.remove(p)
                if self.plant_inspector.plant is p:
                    self.plant_inspector.hide()

        # bullets
        for b in list(self.bullets):
            b.update(dt)
            if not b.alive:
                self.bullets.remove(b)

        # bullet collisions
        for b in list(self.bullets):
            br = b.rect()
            hit_any = False
            for z in self.zombies:
                if z.row != self.row_for_y(b.y):
                    continue
                if br.colliderect(z.rect()):
                    z.hp -= b.damage
                    if getattr(b, 'slow', 0.0) and getattr(b, 'slow_time', 0.0):
                        if hasattr(z, 'apply_slow'):
                            z.apply_slow(b.slow, b.slow_time)
                    if self.settings.get('particles', True):
                        ix, iy = br.centerx, br.centery
                        for _ in range(4):
                            self.particles.append(Particle(ix, iy, random.uniform(-50, 30), random.uniform(-40, 20), 3, 0.3, (140, 255, 140)))
                    if self.snd:
                        self.snd.play_hit()
                    hit_any = True
                    break
            if hit_any:
                b.alive = False
                self.bullets.remove(b)

        # zombies
        for z in list(self.zombies):
            z.update(dt, self)
            if not z.alive:
                self.zombies.remove(z)

        # particles
        if self.settings.get('particles', True):
            for p in list(self.particles):
                p.update(dt)
                if p.life <= 0:
                    self.particles.remove(p)

        # spawning
        self.spawn_timer -= dt
        if self.spawn_timer <= 0:
            lane = random.randint(0, ROWS - 1)
            z_cls = random.choices([BasicZombie, FastZombie, TankZombie], weights=[0.6, 0.25, 0.15])[0]
            self.zombies.append(z_cls(lane))
            self.spawn_timer = ZOMBIE_SPAWN_EVERY * random.uniform(0.8, 1.2)

    def draw(self):
        self.screen.fill(BG)
        # grid
        for t in self.tiles:
            t.draw(self.screen)
        # plants
        for p in self.plants:
            p.draw(self.screen)
        # bullets
        for b in self.bullets:
            b.draw(self.screen, fancy_vfx=self.settings.get('fancy_vfx', True))
        # zombies
        for z in self.zombies:
            z.draw(self.screen)
        # particles
        if self.settings.get('particles', True):
            for p in self.particles:
                p.draw(self.screen)

        # bottom bar
        bar_rect = pg.Rect(0, GRID_TOP + ROWS * TILE_H, WIDTH, BAR_H)
        pg.draw.rect(self.screen, (200, 220, 210), bar_rect)
        pg.draw.line(self.screen, BORDER, (0, bar_rect.top), (WIDTH, bar_rect.top), 3)
        for c in self.cards:
            c.draw(self.screen, self.font)
        self.settings_button.draw(self.screen)

        if self.dragging_card is not None:
            mx, my = self.drag_pos
            tile = self.tile_at_pos(self.drag_pos)
            if tile and tile.plant is None:
                tile.draw(self.screen, highlight=True)

            preview = None
            if hasattr(self.dragging_card, "get_preview"):
                preview = self.dragging_card.get_preview()

            if preview:
                rect = preview.get_rect()
                rect.midbottom = (mx, my)
                self.screen.blit(preview, rect)
            else:
                ghost = pg.Rect(0, 0, 54, 54)
                ghost.center = (mx, my)
                pg.draw.ellipse(self.screen, (100, 200, 120), ghost)
                pg.draw.ellipse(self.screen, (40, 80, 60), ghost, 2)

        self.plant_inspector.draw(self.screen)

        if self.game_over:
            overlay = pg.Surface((WIDTH, HEIGHT), pg.SRCALPHA)
            overlay.fill((0, 0, 0, 140))
            self.screen.blit(overlay, (0, 0))
            text = self.big_font.render("Game Over", True, WHITE)
            self.screen.blit(text, (WIDTH // 2 - text.get_width() // 2, HEIGHT // 2 - text.get_height() // 2))
            sub = self.font.render("Press R to restart", True, WHITE)
            self.screen.blit(sub, (WIDTH // 2 - sub.get_width() // 2, HEIGHT // 2 + 40))

        # Settings overlay
        self.settings_panel.draw(self.screen)

        pg.display.flip()

    def reset(self):
        self.plants.clear()
        self.bullets.clear()
        self.zombies.clear()
        self.particles.clear()
        for t in self.tiles:
            t.plant = None
        self.spawn_timer = 1.0
        self.game_over = False
        self.plant_inspector.hide()

    def handle_mouse_down(self, pos):
        if self.game_over:
            return
        if self.settings_panel.open:
            return
        for c in self.cards:
            if c.rect.collidepoint(pos) and c.can_pick():
                if c.pick():
                    self.dragging_card = c
                    self.drag_pos = pos
                    self.plant_inspector.hide()
                return
        # settings button
        fake_event = pg.event.Event(pg.MOUSEBUTTONDOWN, {'pos': pos, 'button': 1})
        if self.settings_button.handle_event(fake_event):
            self.settings_panel.show(self)
            self.plant_inspector.hide()
            return
        tile = self.tile_at_pos(pos)
        if tile and tile.plant:
            self.plant_inspector.show(tile.plant)
            return
        self.plant_inspector.hide()

    def handle_mouse_up(self, pos):
        if self.game_over:
            return
        if self.settings_panel.open:
            return
        if self.dragging_card is not None:
            tile = self.tile_at_pos(pos)
            if tile and tile.plant is None:
                self.place_plant(tile, self.dragging_card.plant_factory)
            self.dragging_card = None

    def handle_mouse_motion(self, pos):
        if self.dragging_card is not None:
            self.drag_pos = pos

    def run(self):
        running = True
        while running:
            dt_ms = self.clock.tick(FPS)
            dt = dt_ms / 1000.0
            for event in pg.event.get():
                if not self.settings_panel.open and self.plant_inspector.handle_event(event):
                    continue
                if event.type == pg.QUIT:
                    running = False
                elif event.type == pg.KEYDOWN:
                    if event.key == pg.K_ESCAPE:
                        if self.settings_panel.open:
                            self.settings_panel.hide()
                        else:
                            running = False
                    if event.key == pg.K_r:
                        self.reset()
                elif event.type == pg.MOUSEBUTTONDOWN and event.button == 1:
                    if not self.settings_panel.open:
                        self.handle_mouse_down(event.pos)
                elif event.type == pg.MOUSEBUTTONUP and event.button == 1:
                    if not self.settings_panel.open:
                        self.handle_mouse_up(event.pos)
                elif event.type == pg.MOUSEMOTION:
                    if not self.settings_panel.open:
                        self.handle_mouse_motion(event.pos)
                # route events to settings when open
                if self.settings_panel.open:
                    self.settings_panel.handle_event(event, self)
            self.update(dt)
            self.draw()
        pg.quit()


def main():
    try:
        Game().run()
    except Exception as e:
        print("Error:", e)
        pg.quit()
        sys.exit(1)
