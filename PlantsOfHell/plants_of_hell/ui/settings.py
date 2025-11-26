import pygame as pg
from .widgets import Button, Slider, Checkbox
from ..config import WIDTH, HEIGHT


class SettingsPanel:
    def __init__(self, font: pg.font.Font):
        self.font = font
        self.open = False

        # Panel geometry
        w, h = 560, 380
        self.rect = pg.Rect(0, 0, w, h)
        self.rect.center = (WIDTH // 2, HEIGHT // 2)

        # Tabs
        self.tabs = ["Music", "Performance", "Game"]
        self.active_tab = "Music"
        self.tab_rects: list[pg.Rect] = []
        tx = self.rect.left + 18
        for name in self.tabs:
            tw, th = font.size(name)
            wtab = tw + 24
            r = pg.Rect(tx, self.rect.top + 10, wtab, 28)
            self.tab_rects.append(r)
            tx += wtab + 10

        # Controls (shared but drawn per tab)
        pad = 24
        area_left = self.rect.left + pad
        area_top = self.rect.top + 60
        area_w = self.rect.width - pad * 2

        # Music tab controls
        self.music_slider = Slider(pg.Rect(area_left + 200, area_top + 10, 280, 18), value=0.0)
        self.fx_slider = Slider(pg.Rect(area_left + 200, area_top + 10 + 56, 280, 18), value=0.8)

        # Performance tab controls
        self.chk_particles = Checkbox(pg.Rect(area_left + 10, area_top + 46, 22, 22), checked=True, label="Particles", font=font)
        self.chk_fancy = Checkbox(pg.Rect(area_left + 10, area_top + 86, 22, 22), checked=True, label="Fancy VFX (muzzle, trails)", font=font)

        # Game tab controls
        self.btn_restart = Button(pg.Rect(self.rect.centerx - 100, area_top + 10, 200, 44), "Restart Level", font)

        # Close button (persistent)
        cw = font.size("Close")[0] + 24
        self.btn_close = Button(pg.Rect(self.rect.right - (cw + 10), self.rect.top + 10, cw, 28), "Close", font)

    def show(self, game):
        self.open = True
        self.active_tab = "Music"
        # Sync from game
        self.music_slider.value = game.music_volume
        self.fx_slider.value = game.effects_volume
        self.chk_particles.checked = game.settings.get('particles', True)
        self.chk_fancy.checked = game.settings.get('fancy_vfx', True)

    def hide(self):
        self.open = False

    def apply_to_game(self, game):
        game.music_volume = self.music_slider.value
        game.effects_volume = self.fx_slider.value
        game.settings['particles'] = self.chk_particles.checked
        game.settings['fancy_vfx'] = self.chk_fancy.checked
        if game.snd and game.snd.enabled:
            game.snd.set_music_volume(game.music_volume)
            game.snd.set_effects_volume(game.effects_volume)

    def handle_event(self, event, game):
        if not self.open:
            return False

        handled = False

        # Tab switching
        if event.type == pg.MOUSEBUTTONDOWN and event.button == 1:
            for name, r in zip(self.tabs, self.tab_rects):
                if r.collidepoint(event.pos):
                    self.active_tab = name
                    handled = True
                    break

        # Close button always active
        if self.btn_close.handle_event(event):
            self.hide()
            return True

        # Route events to active tab controls
        if self.active_tab == "Music":
            if self.music_slider.handle_event(event):
                handled = True
            if self.fx_slider.handle_event(event):
                handled = True
        elif self.active_tab == "Performance":
            if self.chk_particles.handle_event(event):
                handled = True
            if self.chk_fancy.handle_event(event):
                handled = True
        elif self.active_tab == "Game":
            if self.btn_restart.handle_event(event):
                game.reset()
                handled = True

        if handled:
            self.apply_to_game(game)
        return handled

    def draw(self, surf):
        if not self.open:
            return

        # Dim background
        overlay = pg.Surface((WIDTH, HEIGHT), pg.SRCALPHA)
        overlay.fill((0, 0, 0, 140))
        surf.blit(overlay, (0, 0))

        # Panel
        pg.draw.rect(surf, (230, 240, 235), self.rect, border_radius=14)
        pg.draw.rect(surf, (40, 80, 60), self.rect, 3, border_radius=14)

        # Tabs
        for name, r in zip(self.tabs, self.tab_rects):
            is_active = (name == self.active_tab)
            bg = (210, 230, 220) if is_active else (200, 215, 210)
            pg.draw.rect(surf, bg, r, border_radius=8)
            pg.draw.rect(surf, (40, 80, 60), r, 2, border_radius=8)
            t = self.font.render(name, True, (10, 10, 10))
            surf.blit(t, (r.centerx - t.get_width() // 2, r.centery - t.get_height() // 2))

        # Content area
        content = pg.Rect(self.rect.left + 16, self.rect.top + 50, self.rect.width - 32, self.rect.height - 66)
        pg.draw.rect(surf, (245, 250, 248), content, border_radius=10)
        pg.draw.rect(surf, (40, 80, 60), content, 1, border_radius=10)

        # Section labels and controls by tab
        lx = content.left + 16
        ly = content.top + 16
        def label(txt, y):
            t = self.font.render(txt, True, (10, 10, 10))
            surf.blit(t, (lx, y))

        if self.active_tab == "Music":
            label("Music Volume", ly)
            self.music_slider.draw(surf)
            ly += 56
            label("Effects Volume", ly)
            self.fx_slider.draw(surf)
        elif self.active_tab == "Performance":
            label("Toggles", ly)
            self.chk_particles.draw(surf)
            self.chk_fancy.draw(surf)
        elif self.active_tab == "Game":
            label("Session", ly)
            self.btn_restart.draw(surf)

        # Close button
        self.btn_close.draw(surf)
