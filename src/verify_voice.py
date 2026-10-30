"""Confere a voz com o Whisper: transcreve cada frase no arquivo final e compara com o roteiro.

Também confere os tempos: cada palavra precisa começar onde há som (não em silêncio).
Uso: python src/verify_voice.py build/<slug>
Sai com código 1 se algum trecho divergir demais.
"""
import json, os, re, sys, unicodedata, difflib
import numpy as np
import soundfile as sf
import sherpa_onnx

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = os.path.join(ROOT, "models", "sherpa-onnx-whisper-small")
NUM = {"12": "doze", "20": "vinte", "32": "trinta e dois"}


def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9 ]", " ", s).split()


def main(build):
    t = json.load(open(os.path.join(build, "timing.json"), encoding="utf-8"))
    audio, sr = sf.read(os.path.join(build, "voice.wav"), dtype="float32")
    rec = sherpa_onnx.OfflineRecognizer.from_whisper(
        encoder=W + "/small-encoder.int8.onnx", decoder=W + "/small-decoder.int8.onnx",
        tokens=W + "/small-tokens.txt", language="pt", task="transcribe", num_threads=2)
    segs = {}
    for w in t["words"]:
        segs.setdefault(w["seg"], []).append(w)
    bad = 0
    report = []
    for seg, ws in segs.items():
        a0 = max(0, int((ws[0]["t0"] - 0.05) * sr))
        a1 = min(len(audio), int((ws[-1]["t1"] + 0.08) * sr))
        st = rec.create_stream()
        st.accept_waveform(sr, audio[a0:a1])
        rec.decode_stream(st)
        heard = st.result.text.strip()
        want = " ".join(w["w"] for w in ws)
        ratio = difflib.SequenceMatcher(None, norm(want), norm(heard)).ratio()
        ok = ratio >= 0.7
        bad += 0 if ok else 1
        report.append({"seg": seg, "roteiro": want, "whisper": heard, "similaridade": round(ratio, 2), "ok": ok})
        print(f"[whisper] {'ok ' if ok else 'ERRO'} {ratio:.2f} {seg}: {heard}")
    # palavra começando em silêncio total = tempo errado
    loud = t["loudness_db"]
    fps = t["fps"]
    silent_starts = []
    for w in t["words"]:
        f = int(w["t0"] * fps)
        window = loud[f:f + 4]
        if window and max(window) < -45:
            silent_starts.append(w["w"])
    if silent_starts:
        print("[tempos] aviso, palavras começando em silêncio:", silent_starts)
    json.dump(report, open(os.path.join(build, "whisper_check.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main(sys.argv[1])
