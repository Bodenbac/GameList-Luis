import pygame as pg


class Button:
    def __init__(self, rect: pg.Rect, label: str, font: pg.font.Font, bg=(210, 230, 220)):
        self.rect = pg.Rect(rect)
        self.label = label
        self.font = font
        self.bg = bg
        self.hover = False

    def handle_event(self, event) -> bool:
        if event.type == pg.MOUSEMOTION:
            self.hover = self.rect.collidepoint(event.pos)
        elif event.type == pg.MOUSEBUTTONDOWN and event.button == 1:
            if self.rect.collidepoint(event.pos):
                return True
        return False

    def draw(self, surf):
        col = self.bg if not self.hover else (max(0, self.bg[0]-10), max(0, self.bg[1]-10), max(0, self.bg[2]-10))
        pg.draw.rect(surf, col, self.rect, border_radius=8)
        pg.draw.rect(surf, (40, 80, 60), self.rect, 2, border_radius=8)
        text = self.font.render(self.label, True, (10, 10, 10))
        surf.blit(text, (self.rect.centerx - text.get_width()//2, self.rect.centery - text.get_height()//2))


class Slider:
    def __init__(self, rect: pg.Rect, value: float = 1.0):
        self.rect = pg.Rect(rect)
        self.value = max(0.0, min(1.0, value))
        self.dragging = False

    def handle_event(self, event) -> bool:
        if event.type == pg.MOUSEBUTTONDOWN and event.button == 1:
            if self.rect.collidepoint(event.pos):
                self.dragging = True
                self._set_from_pos(event.pos[0])
                return True
        elif event.type == pg.MOUSEBUTTONUP and event.button == 1:
            if self.dragging:
                self.dragging = False
                return True
        elif event.type == pg.MOUSEMOTION and self.dragging:
            self._set_from_pos(event.pos[0])
            return True
        return False

    def _set_from_pos(self, x: int):
        t = (x - self.rect.left) / max(1, self.rect.width)
        self.value = max(0.0, min(1.0, t))

    def draw(self, surf):
        # track
        pg.draw.rect(surf, (180, 190, 185), self.rect, border_radius=6)
        pg.draw.rect(surf, (40, 80, 60), self.rect, 2, border_radius=6)
        # knob
        knob_x = int(self.rect.left + self.value * self.rect.width)
        knob = pg.Rect(0, 0, 14, self.rect.height + 6)
        knob.center = (knob_x, self.rect.centery)
        pg.draw.rect(surf, (230, 240, 240), knob, border_radius=6)
        pg.draw.rect(surf, (60, 100, 90), knob, 2, border_radius=6)


class Checkbox:
    def __init__(self, rect: pg.Rect, checked: bool = True, label: str | None = None, font: pg.font.Font | None = None):
        self.rect = pg.Rect(rect)
        self.checked = checked
        self.label = label
        self.font = font

    def handle_event(self, event) -> bool:
        if event.type == pg.MOUSEBUTTONDOWN and event.button == 1:
            if self.rect.collidepoint(event.pos):
                self.checked = not self.checked
                return True
        return False

    def draw(self, surf):
        pg.draw.rect(surf, (230, 240, 240), self.rect)
        pg.draw.rect(surf, (40, 80, 60), self.rect, 2)
        if self.checked:
            inner = self.rect.inflate(-8, -8)
            pg.draw.rect(surf, (60, 160, 110), inner)
        if self.label and self.font:
            text = self.font.render(self.label, True, (10, 10, 10))
            surf.blit(text, (self.rect.right + 10, self.rect.top - 2))

