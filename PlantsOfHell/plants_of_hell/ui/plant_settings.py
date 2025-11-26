import pygame as pg

from ..config import WIDTH, GRID_TOP
from .widgets import Button, Checkbox


class PlantInspector:
    def __init__(self, font: pg.font.Font):
        self.font = font
        self.visible = False
        self.plant = None

        panel_width, panel_height = 260, 230
        self.rect = pg.Rect(0, 0, panel_width, panel_height)
        self.rect.topright = (WIDTH - 24, GRID_TOP + 10)

        close_w = font.size("Close")[0] + 30
        close_rect = pg.Rect(0, 0, close_w, 30)
        close_rect.topright = (self.rect.right - 12, self.rect.top + 12)
        self.close_btn = Button(close_rect, "Close", font)

        chk_rect = pg.Rect(self.rect.left + 16, self.rect.bottom - 56, 22, 22)
        self.chk_zombie = Checkbox(chk_rect, checked=False, label="Zombified", font=font)

        self.preview_rect = pg.Rect(self.rect.left + 16, self.rect.top + 56, self.rect.width - 32, 110)

    def show(self, plant):
        self.plant = plant
        self.visible = True
        self.chk_zombie.checked = bool(getattr(plant, "zombified", False))

    def hide(self):
        self.visible = False
        self.plant = None

    def handle_event(self, event):
        if not self.visible or not self.plant:
            return False

        handled = False
        inside_click = False

        if event.type == pg.MOUSEBUTTONDOWN and event.button == 1:
            if not self.rect.collidepoint(event.pos):
                self.hide()
            else:
                inside_click = True

        if self.close_btn.handle_event(event):
            self.hide()
            handled = True

        if self.chk_zombie.handle_event(event):
            handled = True
            if self.plant:
                self.plant.set_zombified(self.chk_zombie.checked)

        return handled or inside_click

    def draw(self, surf):
        if not self.visible or not self.plant:
            return

        self.chk_zombie.checked = bool(getattr(self.plant, "zombified", False))

        pg.draw.rect(surf, (235, 244, 238), self.rect, border_radius=12)
        pg.draw.rect(surf, (40, 80, 60), self.rect, 2, border_radius=12)

        title = self.font.render(self.plant.__class__.__name__, True, (20, 35, 25))
        surf.blit(title, (self.rect.left + 16, self.rect.top + 16))

        pg.draw.rect(surf, (220, 230, 225), self.preview_rect, border_radius=10)
        pg.draw.rect(surf, (100, 130, 110), self.preview_rect, 1, border_radius=10)

        preview = self._current_preview_surface()
        if preview:
            scaled = self._fit_to_rect(preview, self.preview_rect)
            dest = scaled.get_rect()
            dest.center = self.preview_rect.center
            surf.blit(scaled, dest)

        self.chk_zombie.draw(surf)
        self.close_btn.draw(surf)

    def _current_preview_surface(self):
        sprite = None
        if hasattr(self.plant, "get_render_sprite"):
            sprite = self.plant.get_render_sprite()
        if sprite is None and hasattr(self.plant.__class__, "preview_surface"):
            sprite = self.plant.__class__.preview_surface()
        return sprite

    def _fit_to_rect(self, surface: pg.Surface, bounds: pg.Rect) -> pg.Surface:
        sw, sh = surface.get_size()
        if sw <= bounds.width and sh <= bounds.height:
            return surface
        ratio = min(bounds.width / sw, bounds.height / sh)
        new_size = (max(1, int(sw * ratio)), max(1, int(sh * ratio)))
        return pg.transform.smoothscale(surface, new_size)
