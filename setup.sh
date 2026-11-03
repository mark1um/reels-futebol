#!/usr/bin/env bash
# Prepara uma máquina limpa: dependências do sistema, Python, modelos de voz e transcrição.
# Seguro para rodar de novo: pula o que já existe.
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v espeak-ng >/dev/null; then
  (apt-get update -q && apt-get install -y -q espeak-ng) >/dev/null 2>&1 || sudo apt-get install -y -q espeak-ng
fi
command -v ffmpeg >/dev/null || (apt-get install -y -q ffmpeg >/dev/null 2>&1)

if [ ! -x .venv/bin/python ]; then
  uv venv -q -p 3.12 .venv 2>/dev/null || python3.12 -m venv .venv
fi
. .venv/bin/activate
(uv pip install -q kokoro-onnx soundfile numpy onnx sherpa-onnx 2>/dev/null) || pip install -q kokoro-onnx soundfile numpy onnx sherpa-onnx

mkdir -p models
REL=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
[ -f models/kokoro-v1.0.onnx ] || curl -sSfL -o models/kokoro-v1.0.onnx $REL/kokoro-v1.0.onnx
[ -f models/voices-v1.0.bin ] || curl -sSfL -o models/voices-v1.0.bin $REL/voices-v1.0.bin
if [ ! -f models/kokoro-v1.0-dur.onnx ]; then
  python - <<'EOF'
import onnx
m = onnx.load('models/kokoro-v1.0.onnx')
m.graph.output.append(onnx.helper.make_tensor_value_info('/encoder/Gather_output_0', onnx.TensorProto.INT64, None))
onnx.save(m, 'models/kokoro-v1.0-dur.onnx')
EOF
fi
# Baixa para arquivo (com retry) e confere o encoder: um download cortado deixava a pasta pela metade.
W=models/sherpa-onnx-whisper-small
if [ ! -f $W/small-encoder.int8.onnx ] || [ ! -f $W/small-decoder.int8.onnx ] || [ ! -f $W/small-tokens.txt ]; then
  rm -rf $W
  curl -sSfL --retry 5 --retry-all-errors -C - -o models/whisper-small.tar.bz2 \
    https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-small.tar.bz2
  tar xjf models/whisper-small.tar.bz2 -C models && rm -f models/whisper-small.tar.bz2
fi
npx --yes hyperframes@0.8.221 telemetry disable >/dev/null 2>&1 || true
echo "setup ok"
