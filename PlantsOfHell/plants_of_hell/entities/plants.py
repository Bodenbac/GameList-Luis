import pygame as pg
from dataclasses import dataclass
from ..config import (
    PLANT_MAX_HP,
    BLACK,
    grid_rect,
    clamp,
    PEASHOOTER_FIRE_RATE,
    PEA_GREEN,
    TILE_W,
    TILE_H,
    ASSETS_DIR,
)
from ..entities.bullet import Bullet
from .base import Entity


_PEASHOOTER_SURF = None
_PEASHOOTER_FRAMES = None
_REPEATER_SURF = None
_SNOWPEA_SURF = None
_WALLNUT_SURF = None


def _scale_surface_to_tile(surface: pg.Surface, scale=(0.92, 0.95)) -> pg.Surface:
    """Scale sprite so it fits inside a tile while preserving aspect ratio."""
    target_w = int(TILE_W * scale[0])
    target_h = int(TILE_H * scale[1])
    sw, sh = surface.get_size()
    if sw == 0 or sh == 0:
        return surface
    ratio = min(target_w / sw, target_h / sh)
    new_size = (max(1, int(sw * ratio)), max(1, int(sh * ratio)))
    if new_size == surface.get_size():
        return surface
    return pg.transform.smoothscale(surface, new_size)


def _load_surface(path, scale=(0.92, 0.95)):
    try:
        image = pg.image.load(path.as_posix()).convert_alpha()
    except Exception:
        return None
    return _scale_surface_to_tile(image, scale)


@dataclass(slots=True)
class PlantArt:
    normal: pg.Surface | None = None
    zombie: pg.Surface | None = None


class PlantArtRegistry:
    SPECS = {
        "peashooter": {"folder": "01 Peashooter", "file": "peashooter"},
        "repeater": {"folder": "02 Repeater", "file": "repeater", "scale": (0.9, 0.92)},
        "snowpea": {"folder": "03 Iceshooter", "file": "iceshooter"},
        "iceshooter": {"folder": "03 Iceshooter", "file": "iceshooter"},
        "sunflower": {"folder": "04 Sunflower", "file": "sunflower"},
        "wallnut": {"folder": "05 Wallnut", "file": "wallnut", "scale": (0.85, 0.95)},
    }
    _cache: dict[str, PlantArt] = {}

    @classmethod
    def get(cls, key: str | None) -> PlantArt:
        if not key:
            return PlantArt()
        key = key.lower()
        if key not in cls._cache:
            cls._cache[key] = cls._load_art(key)
        return cls._cache[key]

    @classmethod
    def _load_art(cls, key: str) -> PlantArt:
        spec = cls.SPECS.get(key)
        if not spec:
            return PlantArt()
        base_dir = ASSETS_DIR / "plants" / spec["folder"]
        scale = spec.get("scale", (0.92, 0.95))

        def load_variant(tag: str):
            filename = f"{spec['file']} ({tag}).png"
            return _load_surface(base_dir / filename, scale=scale)

        normal = load_variant("normal")
        zombie = load_variant("zombified")
        return PlantArt(normal=normal, zombie=zombie)


def get_peashooter_surface():
    global _PEASHOOTER_SURF
    if _PEASHOOTER_SURF is None:
        path = ASSETS_DIR / "plants" / "peashooter.png"
        try:
            img = pg.image.load(path.as_posix()).convert_alpha()
            target_w = int(TILE_W * 0.85)
            target_h = int(TILE_H * 0.85)
            _PEASHOOTER_SURF = pg.transform.smoothscale(img, (target_w, target_h))
        except Exception:
            _PEASHOOTER_SURF = None
    return _PEASHOOTER_SURF


def get_peashooter_frames():
    global _PEASHOOTER_FRAMES
    if _PEASHOOTER_FRAMES is None:
        path = ASSETS_DIR / "plants" / "peashooter - spritesheet - shooting animation - 25 sprites.png"
        frames = []
        try:
            sheet = pg.image.load(path.as_posix()).convert_alpha()
            cols = rows = 5
            frame_w = sheet.get_width() // cols
            frame_h = sheet.get_height() // rows
            target_w = int(TILE_W * 0.85)
            target_h = int(TILE_H * 0.85)
            for row in range(rows):
                for col in range(cols):
                    rect = pg.Rect(col * frame_w, row * frame_h, frame_w, frame_h)
                    frame = pg.Surface((frame_w, frame_h), pg.SRCALPHA)
                    frame.blit(sheet, (0, 0), rect)
                    frames.append(pg.transform.smoothscale(frame, (target_w, target_h)))
        except Exception:
            frames = []
        _PEASHOOTER_FRAMES = frames
    return _PEASHOOTER_FRAMES


def _build_vector_surface(draw_fn, scale=(0.9, 0.92)):
    canvas = pg.Surface((TILE_W, TILE_H), pg.SRCALPHA)
    draw_fn(canvas, pg.Rect(0, 0, TILE_W, TILE_H))
    target_size = (int(TILE_W * scale[0]), int(TILE_H * scale[1]))
    return pg.transform.smoothscale(canvas, target_size)


def get_repeater_surface():
    global _REPEATER_SURF
    if _REPEATER_SURF is None:
        def draw(canvas, r):
            base = r.inflate(-18, -18)
            stem = pg.Rect(0, 0, 16, base.height - 14)
            stem.midbottom = (base.centerx - 14, base.bottom)
            pg.draw.rect(canvas, (42, 150, 80), stem, border_radius=6)
            leaf1 = pg.Rect(0, 0, 30, 18); leaf1.midleft = (stem.centerx - 6, stem.centery + 8)
            leaf2 = pg.Rect(0, 0, 30, 18); leaf2.midright = (stem.centerx + 12, stem.centery - 6)
            pg.draw.ellipse(canvas, (68, 200, 90), leaf1)
            pg.draw.ellipse(canvas, (68, 200, 90), leaf2)
            body = pg.Rect(0, 0, 48, 38)
            body.center = (base.centerx + 4, base.centery)
            pg.draw.ellipse(canvas, (70, 200, 120), body)
            pg.draw.ellipse(canvas, (120, 235, 150), body.inflate(-14, -12))
            head_front = pg.Rect(0, 0, 38, 32)
            head_front.midleft = (body.right - 4, body.centery - 8)
            pg.draw.ellipse(canvas, (90, 240, 150), head_front)
            pg.draw.ellipse(canvas, (200, 255, 220), head_front.inflate(-18, -16))
            head_back = head_front.copy()
            head_back.centery += 12
            head_back.centerx -= 6
            pg.draw.ellipse(canvas, (86, 225, 140), head_back)
            pg.draw.ellipse(canvas, (200, 250, 220), head_back.inflate(-18, -16))
            nozzle = pg.Rect(0, 0, 16, 12)
            nozzle.midleft = (head_front.right - 8, head_front.centery)
            pg.draw.ellipse(canvas, (230, 255, 230), nozzle)
        _REPEATER_SURF = _build_vector_surface(draw, (0.96, 0.94))
    return _REPEATER_SURF


def get_snowpea_surface():
    global _SNOWPEA_SURF
    if _SNOWPEA_SURF is None:
        def draw(canvas, r):
            base = r.inflate(-18, -18)
            stem = pg.Rect(0, 0, 16, base.height - 14)
            stem.midbottom = (base.centerx - 12, base.bottom)
            pg.draw.rect(canvas, (40, 150, 190), stem, border_radius=6)
            leaf1 = pg.Rect(0, 0, 30, 18); leaf1.midleft = (stem.centerx - 6, stem.centery + 8)
            leaf2 = pg.Rect(0, 0, 30, 18); leaf2.midright = (stem.centerx + 12, stem.centery - 6)
            pg.draw.ellipse(canvas, (60, 190, 220), leaf1)
            pg.draw.ellipse(canvas, (60, 190, 220), leaf2)
            body = pg.Rect(0, 0, 46, 36)
            body.center = (base.centerx + 6, base.centery - 6)
            pg.draw.ellipse(canvas, (110, 210, 240), body)
            pg.draw.ellipse(canvas, (180, 240, 255), body.inflate(-12, -12))
            head = pg.Rect(0, 0, 40, 34)
            head.midleft = (body.right - 4, body.centery)
            pg.draw.ellipse(canvas, (150, 240, 255), head)
            pg.draw.ellipse(canvas, (230, 255, 255), head.inflate(-16, -16))
            nose = pg.Rect(0, 0, 18, 16)
            nose.midleft = (head.right - 6, head.centery - 2)
            pg.draw.ellipse(canvas, (210, 255, 255), nose)
        _SNOWPEA_SURF = _build_vector_surface(draw, (0.96, 0.94))
    return _SNOWPEA_SURF


def get_wallnut_surface():
    global _WALLNUT_SURF
    if _WALLNUT_SURF is None:
        def draw(canvas, r):
            body = r.inflate(-24, -12)
            pg.draw.ellipse(canvas, (160, 110, 70), body)
            pg.draw.ellipse(canvas, (195, 150, 95), body.inflate(-18, -18))
            crack = pg.Rect(0, 0, 6, body.height - 18)
            crack.midtop = (body.centerx + 8, body.top + 12)
            pg.draw.rect(canvas, (150, 100, 60), crack, border_radius=3)
            eye1 = pg.Rect(0, 0, 8, 8); eye1.center = (body.centerx - 14, body.centery - 8)
            eye2 = pg.Rect(0, 0, 8, 8); eye2.center = (body.centerx + 10, body.centery - 6)
            pg.draw.ellipse(canvas, (10, 10, 10), eye1)
            pg.draw.ellipse(canvas, (10, 10, 10), eye2)
        _WALLNUT_SURF = _build_vector_surface(draw, (0.85, 0.96))
    return _WALLNUT_SURF


class Plant(Entity):
    art_key = None

    def __init__(self, row: int, col: int):
        super().__init__()
        self.row = row
        self.col = col
        r = grid_rect(row, col)
        self.x = r.centerx
        self.y = r.centery
        self.max_hp = PLANT_MAX_HP
        self.hp = float(self.max_hp)
        self.hurt_timer = 0.0
        self.use_base_body = True
        self.sprite = None
        self._last_sprite_rect = None
        self.sprite_normal = None
        self.sprite_zombie = None
        self.zombified = False

    def take_damage(self, d):
        self.hp = max(0.0, self.hp - d)
        self.hurt_timer = 0.25
        if self.hp <= 0:
            self.alive = False

    def update(self, dt, game):
        pass

    def animate(self, dt):
        if self.hurt_timer > 0:
            self.hurt_timer = max(0.0, self.hurt_timer - dt)

    def draw(self, surf):
        r = grid_rect(self.row, self.col)
        inner = r.inflate(-16, -16)
        if self.use_base_body:
            pg.draw.rect(surf, (40, 180, 60), inner, border_radius=10)
        hp_ratio = clamp(self.hp / self.max_hp, 0, 1)
        hb_bg = pg.Rect(inner.left, inner.top - 8, inner.width, 6)
        hb_fg = pg.Rect(inner.left, inner.top - 8, int(inner.width * hp_ratio), 6)
        pg.draw.rect(surf, (50, 50, 50), hb_bg, border_radius=3)
        pg.draw.rect(surf, (60, 220, 90), hb_fg, border_radius=3)
        if self.hurt_timer > 0:
            strength = clamp(self.hurt_timer / 0.25, 0, 1)
            if self.use_base_body:
                overlay = pg.Surface((inner.width, inner.height), pg.SRCALPHA)
                overlay.fill((255, 80, 80, int(120 * strength)))
                surf.blit(overlay, inner.topleft)
            elif self._last_sprite_rect is not None:
                overlay = pg.Surface(self._last_sprite_rect.size, pg.SRCALPHA)
                overlay.fill((255, 120, 120, int(100 * strength)))
                surf.blit(overlay, self._last_sprite_rect.topleft)

    def blit_sprite(self, surf, sprite, offset=(0, 0)):
        if sprite is None:
            return False
        r = grid_rect(self.row, self.col)
        rect = sprite.get_rect()
        rect.midbottom = (r.centerx + offset[0], r.bottom + offset[1])
        surf.blit(sprite, rect)
        self._last_sprite_rect = rect.copy()
        return True

    @classmethod
    def preview_surface(cls):
        if cls.art_key:
            art = PlantArtRegistry.get(cls.art_key)
            if art.normal:
                return art.normal
        return None

    def apply_art_from_registry(self, fallback: pg.Surface | None = None):
        art = PlantArtRegistry.get(self.art_key)
        if art.normal is not None:
            self.sprite_normal = art.normal
            self.sprite = art.normal
            self.use_base_body = False
        elif fallback is not None:
            self.sprite_normal = fallback
            self.sprite = fallback
        if art.zombie is not None:
            self.sprite_zombie = art.zombie
        return art

    def get_render_sprite(self):
        if self.zombified and self.sprite_zombie is not None:
            return self.sprite_zombie
        if self.sprite_normal is not None:
            return self.sprite_normal
        return self.sprite

    def set_zombified(self, value: bool):
        self.zombified = bool(value)


class Peashooter(Plant):
    art_key = "peashooter"

    def __init__(self, row, col):
        super().__init__(row, col)
        self.cooldown = 0.2
        self.recoil_timer = 0.0
        self.muzzle_timer = 0.0
        fallback = get_peashooter_surface()
        self.sprite = fallback
        self.anim_frames = get_peashooter_frames()
        self.anim_frame_time = 0.032
        self.anim_timer = 0.0
        self.anim_index = 0
        self.anim_playing = False
        self.pending_shot = False
        self.shot_delay = 0.0
        self.use_base_body = False
        self.apply_art_from_registry(fallback=fallback)

    def update(self, dt, game):
        self.cooldown -= dt
        self.recoil_timer = max(0.0, self.recoil_timer - dt)
        self.muzzle_timer = max(0.0, self.muzzle_timer - dt)
        self.update_animation(dt)
        if self.pending_shot:
            self.shot_delay -= dt
            if self.shot_delay <= 0:
                self.pending_shot = False
                self._fire_now(game)
        if self.cooldown <= 0 and not self.pending_shot:
            any_in_lane = any(z.row == self.row and z.x > self.x for z in game.zombies)
            if any_in_lane:
                self.cooldown = PEASHOOTER_FIRE_RATE
                self.pending_shot = True
                self.shot_delay = 0.08
                self.start_animation()

    def _fire_now(self, game):
        b = Bullet(self.x + 24, self.y - 8, game.speeds['pea'])
        game.bullets.append(b)
        self.recoil_timer = 0.14
        if game.settings.get('fancy_vfx', True):
            self.muzzle_timer = 0.08
        if game.settings.get('particles', True):
            if game.settings.get('fancy_vfx', True):
                game.spawn_flash(self.x + 34, self.y - 10, color=(240, 255, 190))
            game.spawn_smoke(self.x + 30, self.y - 10, count=3)
        if game.snd:
            game.snd.play_shoot()

    def start_animation(self):
        if self.anim_frames:
            self.anim_playing = True
            self.anim_index = 0
            self.anim_timer = 0.0

    def update_animation(self, dt):
        if not self.anim_frames or not self.anim_playing:
            return
        self.anim_timer += dt
        while self.anim_timer >= self.anim_frame_time:
            self.anim_timer -= self.anim_frame_time
            self.anim_index += 1
            if self.anim_index >= len(self.anim_frames):
                self.anim_index = 0
                self.anim_playing = False
                break

    def draw(self, surf):
        r = grid_rect(self.row, self.col)
        sway = -6 * clamp(self.recoil_timer / 0.14, 0, 1)
        self._last_sprite_rect = None
        sprite = None
        if self.zombified and self.sprite_zombie:
            sprite = self.sprite_zombie
        elif self.sprite_normal is not None:
            sprite = self.sprite_normal
        elif self.anim_frames:
            idx = self.anim_index if self.anim_playing else 0
            sprite = self.anim_frames[min(idx, len(self.anim_frames) - 1)]
        else:
            sprite = self.sprite
        if not self.blit_sprite(surf, sprite, (4 + int(sway), -6)):
            # fallback to vector art if sprite missing
            base = r.inflate(-18, -18)
            stem = pg.Rect(0, 0, 12, base.height - 18)
            stem.midbottom = (base.centerx - 8, base.bottom)
            pg.draw.rect(surf, (40, 160, 70), stem, border_radius=6)
            leaf1 = pg.Rect(0, 0, 26, 16); leaf1.midleft = (stem.centerx - 4, stem.centery + 6)
            leaf2 = pg.Rect(0, 0, 26, 16); leaf2.midright = (stem.centerx + 10, stem.centery - 8)
            pg.draw.ellipse(surf, (60, 200, 90), leaf1)
            pg.draw.ellipse(surf, (60, 200, 90), leaf2)
        # muzzle flash overlay stays the same
        if self.muzzle_timer > 0:
            muzzle_pos = (r.centerx + 30, r.centery - 8)
            pg.draw.circle(surf, (250, 255, 200), muzzle_pos, 6)
            pg.draw.circle(surf, (255, 240, 120), muzzle_pos, 3)
        super().draw(surf)

    @classmethod
    def preview_surface(cls):
        art = PlantArtRegistry.get(cls.art_key)
        if art.normal:
            return art.normal
        frames = get_peashooter_frames()
        if frames:
            return frames[0]
        return get_peashooter_surface()


class Repeater(Plant):
    art_key = "repeater"

    def __init__(self, row, col):
        super().__init__(row, col)
        self.cooldown = 0.2
        self.recoil_timer = 0.0
        self.muzzle_timer = 0.0
        self.burst_delay = 0.0
        self.burst_shots = 0
        self.sprite = get_repeater_surface()
        self.use_base_body = False
        self.apply_art_from_registry(fallback=self.sprite)

    def update(self, dt, game):
        self.cooldown -= dt
        self.recoil_timer = max(0.0, self.recoil_timer - dt)
        self.muzzle_timer = max(0.0, self.muzzle_timer - dt)
        lane_threat = any(z.row == self.row and z.x > self.x for z in game.zombies)
        if self.cooldown <= 0 and lane_threat and self.burst_shots == 0:
            self.burst_shots = 2
            self.burst_delay = 0.0

        if self.burst_shots > 0:
            self.burst_delay -= dt
            if self.burst_delay <= 0:
                self.fire(game)
                self.burst_shots -= 1
                if self.burst_shots > 0:
                    self.burst_delay = 0.2
                else:
                    self.cooldown = max(0.7, PEASHOOTER_FIRE_RATE * 0.95)

    def fire(self, game):
        b = Bullet(self.x + 24, self.y - 8, game.speeds['pea'])
        game.bullets.append(b)
        self.recoil_timer = 0.12
        if game.settings.get('fancy_vfx', True):
            self.muzzle_timer = 0.06
        if game.settings.get('particles', True):
            if game.settings.get('fancy_vfx', True):
                game.spawn_flash(self.x + 34, self.y - 10, color=(240, 255, 190))
        if game.snd:
            game.snd.play_shoot()

    def draw(self, surf):
        r = grid_rect(self.row, self.col)
        rx = -5 * clamp(self.recoil_timer / 0.12, 0, 1)
        self._last_sprite_rect = None
        sprite = self.get_render_sprite()
        if not self.blit_sprite(surf, sprite, (int(rx), -6)):
            base = r.inflate(-18, -18)
            stem = pg.Rect(0, 0, 12, base.height - 18)
            stem.midbottom = (base.centerx - 8, base.bottom)
            pg.draw.rect(surf, (40, 160, 70), stem, border_radius=6)
            leaf1 = pg.Rect(0, 0, 26, 16); leaf1.midleft = (stem.centerx - 4, stem.centery + 6)
            leaf2 = pg.Rect(0, 0, 26, 16); leaf2.midright = (stem.centerx + 10, stem.centery - 8)
            pg.draw.ellipse(surf, (60, 200, 90), leaf1)
            pg.draw.ellipse(surf, (60, 200, 90), leaf2)
        if self.muzzle_timer > 0:
            muzzle1 = (r.centerx + 24, r.centery - 10)
            muzzle2 = (r.centerx + 34, r.centery)
            for pos in (muzzle1, muzzle2):
                pg.draw.circle(surf, (250, 255, 200), pos, 5)
                pg.draw.circle(surf, (255, 240, 120), pos, 3)
        super().draw(surf)

    @classmethod
    def preview_surface(cls):
        art = PlantArtRegistry.get(cls.art_key)
        if art.normal:
            return art.normal
        return get_repeater_surface()


class SnowPea(Plant):
    art_key = "snowpea"

    def __init__(self, row, col):
        super().__init__(row, col)
        self.cooldown = 0.2
        self.recoil_timer = 0.0
        self.muzzle_timer = 0.0
        self.sprite = get_snowpea_surface()
        self.use_base_body = False
        self.apply_art_from_registry(fallback=self.sprite)

    def update(self, dt, game):
        self.cooldown -= dt
        self.recoil_timer = max(0.0, self.recoil_timer - dt)
        self.muzzle_timer = max(0.0, self.muzzle_timer - dt)
        if self.cooldown <= 0:
            lane_threat = any(z.row == self.row and z.x > self.x for z in game.zombies)
            if lane_threat:
                self.fire(game)
                self.cooldown = PEASHOOTER_FIRE_RATE * 1.2

    def fire(self, game):
        # blue pea that slows for 2s, at 50% speed
        b = Bullet(self.x + 24, self.y - 8, game.speeds['pea'] * 0.9, color=(140, 200, 255), slow=0.5, slow_time=2.0)
        game.bullets.append(b)
        self.recoil_timer = 0.14
        if game.settings.get('fancy_vfx', True):
            self.muzzle_timer = 0.08
        if game.settings.get('particles', True):
            if game.settings.get('fancy_vfx', True):
                game.spawn_flash(self.x + 34, self.y - 10, color=(200, 240, 255))
        if game.snd:
            game.snd.play_shoot()

    def draw(self, surf):
        r = grid_rect(self.row, self.col)
        rx = -6 * clamp(self.recoil_timer / 0.14, 0, 1)
        self._last_sprite_rect = None
        sprite = self.get_render_sprite()
        if not self.blit_sprite(surf, sprite, (int(rx), -6)):
            base = r.inflate(-18, -18)
            stem = pg.Rect(0, 0, 12, base.height - 18)
            stem.midbottom = (base.centerx - 8, base.bottom)
            pg.draw.rect(surf, (40, 140, 160), stem, border_radius=6)
            leaf1 = pg.Rect(0, 0, 26, 16); leaf1.midleft = (stem.centerx - 4, stem.centery + 6)
            leaf2 = pg.Rect(0, 0, 26, 16); leaf2.midright = (stem.centerx + 10, stem.centery - 8)
            pg.draw.ellipse(surf, (60, 170, 200), leaf1)
            pg.draw.ellipse(surf, (60, 170, 200), leaf2)
        if self.muzzle_timer > 0:
            muzzle_pos = (r.centerx + 28, r.centery - 6)
            pg.draw.circle(surf, (230, 245, 255), muzzle_pos, 6)
            pg.draw.circle(surf, (180, 230, 255), muzzle_pos, 3)
        super().draw(surf)

    @classmethod
    def preview_surface(cls):
        art = PlantArtRegistry.get(cls.art_key)
        if art.normal:
            return art.normal
        return get_snowpea_surface()


class Wallnut(Plant):
    art_key = "wallnut"

    def __init__(self, row, col):
        super().__init__(row, col)
        self.max_hp = PLANT_MAX_HP * 4
        self.hp = float(self.max_hp)
        self.sprite = get_wallnut_surface()
        self.use_base_body = False
        self.apply_art_from_registry(fallback=self.sprite)

    def draw(self, surf):
        r = grid_rect(self.row, self.col)
        self._last_sprite_rect = None
        sprite = self.get_render_sprite()
        if not self.blit_sprite(surf, sprite, (0, -4)):
            body = r.inflate(-20, -20)
            pg.draw.ellipse(surf, (160, 110, 70), body)
            pg.draw.ellipse(surf, (190, 140, 100), body.inflate(-18, -18))
            eye1 = pg.Rect(0, 0, 6, 6); eye1.center = (body.centerx - 12, body.centery - 6)
            eye2 = pg.Rect(0, 0, 6, 6); eye2.center = (body.centerx + 8, body.centery - 4)
            pg.draw.ellipse(surf, (10, 10, 10), eye1)
            pg.draw.ellipse(surf, (10, 10, 10), eye2)
        super().draw(surf)

    @classmethod
    def preview_surface(cls):
        art = PlantArtRegistry.get(cls.art_key)
        if art.normal:
            return art.normal
        return get_wallnut_surface()
