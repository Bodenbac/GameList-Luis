import math
import random
import struct
import wave
from io import BytesIO

import pygame as pg


class SoundBank:
    def __init__(self):
        self.enabled = False
        try:
            pg.mixer.pre_init(44100, -16, 1, 256)
            pg.mixer.init()
            self.enabled = True
        except Exception:
            self.enabled = False
        self.shoot_snd = None
        self.hit_snd = None
        self.music_snd = None
        self.music_channel = None
        self.effects_volume = 0.8
        self.music_volume = 0.0
        if self.enabled:
            try:
                self.shoot_snd = self._build_shoot()
                self.hit_snd = self._build_hit()
                self.music_snd = self._build_music()
            except Exception:
                try:
                    self.shoot_snd = self._build_shoot(fallback_to_file=True)
                    self.hit_snd = self._build_hit(fallback_to_file=True)
                    self.music_snd = self._build_music(fallback_to_file=True)
                except Exception:
                    self.enabled = False
        if self.enabled and self.music_snd:
            # start looping "music" in a dedicated channel
            self.music_channel = pg.mixer.Channel(7)
            self.music_channel.set_volume(self.music_volume)
            self.music_channel.play(self.music_snd, loops=-1)

    def _tone_bytes(self, samplerate, samples):
        buf = BytesIO()
        with wave.open(buf, 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(samplerate)
            w.writeframes(b''.join(struct.pack('<h', max(-32768, min(32767, int(s)))) for s in samples))
        return buf.getvalue()

    def _build_shoot(self, fallback_to_file: bool = False):
        sr = 44100
        dur = 0.12
        n = int(sr * dur)
        samples = []
        f0, f1 = 950, 620
        for i in range(n):
            t = i / sr
            f = f0 + (f1 - f0) * (i / n)
            env = (1 - i / n) ** 1.5
            val = math.sin(2 * math.pi * f * t) * 14000 * env
            if i < 60:
                val += (60 - i) * 120
            samples.append(val)
        data = self._tone_bytes(sr, samples)
        if not fallback_to_file:
            return pg.mixer.Sound(buffer=data)
        tmp = BytesIO(data)
        return pg.mixer.Sound(file=tmp)

    def _build_hit(self, fallback_to_file: bool = False):
        sr = 44100
        dur = 0.09
        n = int(sr * dur)
        samples = []
        rnd = random.Random(1234)
        for i in range(n):
            env = (1 - i / n) ** 2
            val = (rnd.random() * 2 - 1) * 12000 * env
            samples.append(val)
        data = self._tone_bytes(sr, samples)
        if not fallback_to_file:
            return pg.mixer.Sound(buffer=data)
        tmp = BytesIO(data)
        return pg.mixer.Sound(file=tmp)

    def play_shoot(self):
        if self.enabled and self.shoot_snd:
            s = self.shoot_snd
            s.set_volume(self.effects_volume)
            s.play()

    def play_hit(self):
        if self.enabled and self.hit_snd:
            s = self.hit_snd
            s.set_volume(self.effects_volume)
            s.play()

    def set_effects_volume(self, v: float):
        self.effects_volume = max(0.0, min(1.0, v))

    def set_music_volume(self, v: float):
        self.music_volume = max(0.0, min(1.0, v))
        if self.music_channel:
            self.music_channel.set_volume(self.music_volume)

    def _build_music(self, fallback_to_file: bool = False):
        # generate a soft ambient loop
        sr = 22050
        dur = 1.2  # short loop
        n = int(sr * dur)
        samples = []
        for i in range(n):
            t = i / sr
            # simple chord-ish blend with slow wobble
            a = 220  # A3
            c = 261.63  # C4
            e = 329.63  # E4
            wob = 0.5 + 0.5 * math.sin(2 * math.pi * 0.25 * t)
            val = (
                600 * math.sin(2 * math.pi * a * t) +
                500 * math.sin(2 * math.pi * c * t * (0.995 + 0.01 * wob)) +
                400 * math.sin(2 * math.pi * e * t * (1.005 - 0.01 * wob))
            ) * 0.4
            samples.append(val)
        data = self._tone_bytes(sr, samples)
        if not fallback_to_file:
            return pg.mixer.Sound(buffer=data)
        tmp = BytesIO(data)
        return pg.mixer.Sound(file=tmp)
