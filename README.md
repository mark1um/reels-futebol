# Reels de curiosidades de futebol

Reels verticais (1080x1920, 30-60 s) gerados inteiramente em código: roteiro → voz Kokoro (PT-BR, voz Santa)
→ tempos exatos por palavra → cenas HyperFrames/GSAP em papel creme com apresentador de cartoon → trilha
composta em código + SFX → MP4 em -15 LUFS.

```bash
./setup.sh && npm install
./make.sh 2026-10-30-telstar          # gera out/2026-10-30-telstar.mp4
./make.sh 2026-10-30-telstar --draft  # prévia rápida
```

- `reels/<slug>/reel.json` — o roteiro de cada reel
- `src/voice.py` — Kokoro + corte de pausas + tempos por palavra (durações de fonema do próprio modelo)
- `src/verify_voice.py` — Whisper confere se o falado bate com o roteiro
- `src/audio_gen.py` — trilha, rolamento de tique
- `src/build.mjs` + `src/lib/` — cenas, legendas, apresentador, limpezas, efeitos sonoros
- `AUTOMATION.md` — passo a passo da execução diária agendada
- SFX: biblioteca Pixabay incluída no HyperFrames (`assets/sfx/CREDITS.md`)
