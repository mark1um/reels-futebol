#!/usr/bin/env bash
# Gera um reel completo a partir de reels/<slug>/reel.json
# Uso: ./make.sh <slug> [--draft]
set -euo pipefail
cd "$(dirname "$0")"
SLUG="$1"; QUALITY="${2:-}"
REEL="reels/$SLUG/reel.json"; BUILD="build/$SLUG"; OUT="out"
[ -f "$REEL" ] || { echo "roteiro não encontrado: $REEL"; exit 1; }
. .venv/bin/activate
mkdir -p "$BUILD" "$OUT" assets/reel
if [ -z "${HYPERFRAMES_BROWSER_PATH:-}" ]; then
  HS=$(ls -d /opt/pw-browsers/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell 2>/dev/null | tail -1 || true)
  [ -n "$HS" ] && export HYPERFRAMES_BROWSER_PATH="$HS"
fi

echo "== 1/6 voz"
python src/voice.py "$REEL" "$BUILD"
echo "== 2/6 conferência com Whisper"
python src/verify_voice.py "$BUILD" 2> >(grep -v -E "resampler|_rate:" >&2)
echo "== 3/6 áudio (tiques, trilha)"
python src/audio_gen.py "$BUILD" assets/reel
echo "== 4/6 composições"
node src/build.mjs "$REEL" "$BUILD"
echo "== 5/6 check"
npx --yes hyperframes@0.8.221 check > "$BUILD/check.txt" 2>&1 || true
ERRS=$(grep -E "^\s+[0-9]+ error\(s\)" "$BUILD/check.txt" | awk '{s+=$1} END {print s+0}')
grep -E "✗ [a-z_]+:" "$BUILD/check.txt" | grep -v contrast | head -20 || true
echo "[check] erros: $ERRS (avisos de contraste do cinza #8A857E e texto de 25px são do estilo pedido)"
[ "$ERRS" = "0" ] || { echo "check com erros, veja $BUILD/check.txt"; exit 1; }
SNAPS=$(node -e 'console.log(require("./'"$BUILD"'/plan.json").snapshots.join(","))')
rm -rf "$BUILD/snapshots"
npx --yes hyperframes@0.8.221 snapshot --at "$SNAPS" --no-end -o "$BUILD/snapshots" >/dev/null 2>&1 || echo "[snapshot] falhou"
echo "[snapshot] $BUILD/snapshots/contact-sheet.jpg"
echo "== 6/6 render + mix -15 LUFS"
Q=delivery; [ "$QUALITY" = "--draft" ] && Q=draft
npx --yes hyperframes@0.8.221 render -q "$Q" -o "$BUILD/raw.mp4"
# normalização em duas passadas para ~-15 LUFS, vídeo copiado sem reencode
STATS=$(ffmpeg -hide_banner -i "$BUILD/raw.mp4" -af loudnorm=I=-15:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
mi=$(echo "$STATS" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log(`measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}`)})')
ffmpeg -v error -y -i "$BUILD/raw.mp4" -c:v copy -af "loudnorm=I=-15:TP=-1.5:LRA=11:$mi:linear=true,aresample=48000" -c:a aac -b:a 192k -movflags +faststart "$OUT/$SLUG.mp4"
ffmpeg -hide_banner -i "$OUT/$SLUG.mp4" -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1
echo "pronto: $OUT/$SLUG.mp4"
