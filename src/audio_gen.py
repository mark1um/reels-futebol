"""Gera os áudios do reel: voz em 48 kHz, rolamento de tique (contadores) e trilha musical.

A trilha é composta em código (semente fixa): pluck leve, baixo, bumbo e chocalho a 104 BPM.
Uso: python src/audio_gen.py build/<slug> assets/reel
"""
import json, os, subprocess, sys
import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000


def decode(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def tick_roll(out, dur=1.15):
    click = decode(os.path.join(ROOT, "assets/sfx/click-soft.mp3"))
    pk = int(np.argmax(np.abs(click)))
    click = click[max(0, pk - 40): pk + int(0.06 * SR)]
    click *= np.linspace(1, 0, len(click)) ** 0.5
    buf = np.zeros(int((dur + 0.15) * SR), dtype=np.float32)
    # os tiques acompanham a contagem (power2.out): rápidos no começo, lentos no fim
    n = 22
    for i in range(n):
        p = i / (n - 1)
        t = dur * (1 - np.sqrt(1 - p))  # inverso de power2.out
        s = int(t * SR)
        g = 1.0 if i == 0 else 0.55 + 0.25 * (i / n)
        e = min(len(buf), s + len(click))
        buf[s:e] += click[: e - s] * g
    buf /= max(1e-6, np.abs(buf).max()) / 0.9
    sf.write(out, buf, SR)


def music(out, duration, seed=11):
    rng = np.random.default_rng(seed)
    bpm = 104
    beat = 60 / bpm
    n = int(duration * SR) + SR
    L = np.zeros(n, np.float32)
    R = np.zeros(n, np.float32)
    t_axis = lambda d: np.arange(int(d * SR)) / SR

    def add(sig, start, pan=0.0, gain=1.0):
        s = int(start * SR)
        e = min(n, s + len(sig))
        if e <= s:
            return
        L[s:e] += sig[: e - s] * gain * (1 - pan) * 0.5 * 2 ** 0.5
        R[s:e] += sig[: e - s] * gain * (1 + pan) * 0.5 * 2 ** 0.5

    def pluck(freq, d=0.5):
        t = t_axis(d)
        env = np.exp(-t * 7.5) * np.minimum(1, t * 400)
        return (np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(4 * np.pi * freq * t) + 0.12 * np.sin(6 * np.pi * freq * t)) * env

    def bass(freq, d):
        t = t_axis(d)
        env = np.minimum(1, t * 200) * np.exp(-t * 2.2)
        return np.tanh(1.6 * np.sin(2 * np.pi * freq * t)) * env

    def kick():
        t = t_axis(0.35)
        f = 48 + 90 * np.exp(-t * 28)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)

    def shaker():
        t = t_axis(0.07)
        x = rng.standard_normal(len(t))
        x = np.diff(np.concatenate([[0], x]))  # brilho de ruído agudo
        return x * np.exp(-t * 60) * 0.5

    midi = lambda m: 440 * 2 ** ((m - 69) / 12)
    prog = [[60, 64, 67, 72], [55, 59, 62, 67], [57, 60, 64, 69], [53, 57, 60, 65]]  # C G Am F
    roots = [36, 43, 45, 41]
    bar = beat * 4
    pattern = [0, 2, 1, 3, 2, 1, 3, 2]
    t = 0.0
    b = 0
    while t < duration + bar:
        ch = prog[b % 4]
        add(bass(midi(roots[b % 4]), beat * 1.8), t, 0, 0.32)
        add(bass(midi(roots[b % 4]), beat * 1.6), t + beat * 2, 0, 0.26)
        for k in range(8):
            note = ch[pattern[k]] + (12 if (b % 2 and k == 7) else 0)
            add(pluck(midi(note)), t + k * beat / 2, 0.35 if k % 2 else -0.35, 0.22 if k % 2 else 0.28)
        for k in range(4):
            if k in (0, 2):
                add(kick(), t + k * beat, 0, 0.55)
        for k in range(8):
            add(shaker(), t + k * beat / 2 + (0.012 if k % 2 else 0), 0.2, 0.18 if k % 2 else 0.1)
        t += bar
        b += 1
    st = np.stack([L, R], 1)[: int(duration * SR)]
    fade = int(0.04 * SR)
    st[:fade] *= np.linspace(0, 1, fade)[:, None]
    st /= max(1e-6, np.abs(st).max()) / 0.8
    sf.write(out, st, SR)


def main(build, assets):
    os.makedirs(assets, exist_ok=True)
    t = json.load(open(os.path.join(build, "timing.json"), encoding="utf-8"))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(build, "voice.wav"), "-ar", str(SR), "-ac", "1",
                    os.path.join(assets, "voice.wav")], check=True)
    tick_roll(os.path.join(assets, "tick.wav"))
    music(os.path.join(assets, "music.wav"), t["duration"])
    print("[audio] voz, tiques e trilha prontos")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
