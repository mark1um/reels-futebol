"""Voz do reel: Kokoro (ONNX) -> corte de pausas -> tempos exatos de cada palavra.

Uso: python src/voice.py reels/<slug>/reel.json build/<slug>

Os tempos das palavras vêm das durações de fonema que o próprio Kokoro usa para gerar
o áudio (saída extra exposta no modelo), então batem com o som amostra por amostra.
Depois o Whisper transcreve cada trecho e confere se o texto falado bate com o roteiro.
"""
import json, re, sys, os
import numpy as np
import soundfile as sf
import onnxruntime as ort
from kokoro_onnx import Kokoro

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS = os.path.join(ROOT, "models")
SR = 24000
HOP = 600            # amostras por unidade de duração do Kokoro
SPEED = 1.1
GAP = 0.24           # pausa máxima permitida (s)
WIN = 0.03           # janela de análise de silêncio (s)
SILENCE_DB = -48.0   # abaixo disso a janela é silêncio de verdade


def segments(reel):
    """Ordem de fala: gancho 1, gancho 2, cada ponto (say, explain), fechamento."""
    out = [("hook1", reel["hook"][0]), ("hook2", reel["hook"][1])]
    for i, p in enumerate(reel["points"], 1):
        out.append((f"p{i}.say", p["say"]))
        out.append((f"p{i}.explain", p["explain"]))
    out.append(("close", reel["close"]))
    return out


def display_words(text):
    """Palavras como aparecem na tela; *palavra* marca palavra-chave."""
    words = []
    kw_open = False
    for raw in text.split():
        starts = raw.startswith("*")
        if starts:
            kw_open = True
        is_kw = kw_open
        if raw.rstrip(".,;:!?").endswith("*"):
            kw_open = False
        words.append({"w": raw.replace("*", ""), "kw": is_kw})
    return words


PRON = {}


def tts_text(text):
    """Texto falado: sem marcadores e com as pronúncias do campo "pronounce" do roteiro."""
    out = []
    for raw in text.replace("*", "").split():
        core = raw.rstrip(".,;:!?")
        out.append(PRON.get(core, core) + raw[len(core):])
    return " ".join(out)


def main(reel_path, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    reel = json.load(open(reel_path, encoding="utf-8"))
    voice_name = reel.get("voice", "pm_santa")
    PRON.update(reel.get("pronounce", {}))
    kok = Kokoro(os.path.join(MODELS, "kokoro-v1.0.onnx"), os.path.join(MODELS, "voices-v1.0.bin"))
    sess = ort.InferenceSession(os.path.join(MODELS, "kokoro-v1.0-dur.onnx"))
    vocab = kok.tokenizer.vocab if hasattr(kok.tokenizer, "vocab") else None
    style_bank = kok.get_voice_style(voice_name)

    pieces, words = [], []
    cursor = 0  # amostras
    for seg_id, text in segments(reel):
        dws = display_words(text)
        phon = kok.tokenizer.phonemize(tts_text(text), lang="pt-br")
        # mapeia cada caractere de fonema para um token (caracteres fora do vocabulário somem)
        toks, char_tok = [], []
        for ch in phon:
            t = kok.tokenizer.tokenize(ch)
            if t:
                char_tok.append(len(toks))
                toks.extend(t)
            else:
                char_tok.append(None)
        assert len(toks) < 510, f"{seg_id}: trecho longo demais, divida a frase"
        style = np.array(style_bank[len(toks)], dtype=np.float32).reshape(1, 256)
        audio, dur = sess.run(None, {
            "tokens": np.array([[0, *toks, 0]], dtype=np.int64),
            "style": style,
            "speed": np.array([SPEED], dtype=np.float32),
        })
        dur = np.asarray(dur).reshape(-1)
        starts = np.concatenate([[0], np.cumsum(dur)])  # unidade de duração, índice no input (pad=0)

        # palavras fonéticas = trechos entre espaços na string de fonemas
        ph_words, cur = [], []
        for ci, ch in enumerate(phon):
            if ch == " ":
                if cur:
                    ph_words.append(cur)
                cur = []
            elif char_tok[ci] is not None and ch not in ".,;:!?—…\"'":
                cur.append(char_tok[ci])
        if cur:
            ph_words.append(cur)

        # quantas palavras fonéticas cada palavra da tela gera
        counts = []
        for dw in dws:
            p = kok.tokenizer.phonemize(tts_text(re.sub(r"[.,;:!?]", "", dw["w"])), lang="pt-br").strip()
            counts.append(max(1, len([x for x in p.split(" ") if x.strip(".,;:!?")])))
        if sum(counts) != len(ph_words):
            # espeak juntou/separou algo de forma diferente: distribui proporcionalmente
            print(f"[voz] aviso {seg_id}: {sum(counts)} vs {len(ph_words)} palavras fonéticas, ajuste proporcional")
            total = len(ph_words)
            acc, new = 0.0, []
            scale = total / sum(counts)
            for c in counts:
                acc += c * scale
                new.append(acc)
            bounds = [0] + [int(round(x)) for x in new]
            bounds[-1] = total
            groups = [list(range(bounds[i], max(bounds[i] + 1, bounds[i + 1]))) for i in range(len(dws))]
        else:
            groups, k = [], 0
            for c in counts:
                groups.append(list(range(k, k + c)))
                k += c

        for dw, g in zip(dws, groups):
            g = [min(x, len(ph_words) - 1) for x in g]
            first_tok = ph_words[g[0]][0] + 1     # +1 pelo pad inicial
            last_tok = ph_words[g[-1]][-1] + 1
            t0 = starts[first_tok] * HOP
            t1 = starts[last_tok + 1] * HOP
            words.append({"w": dw["w"], "kw": dw["kw"], "seg": seg_id,
                          "s0": cursor + int(t0), "s1": cursor + int(t1)})
        pieces.append(audio.astype(np.float32))
        cursor += len(audio)
        gap = np.zeros(int(GAP * SR * 1.5), dtype=np.float32)  # pausa entre frases (vai ser cortada para 0.24)
        pieces.append(gap)
        cursor += len(gap)

    raw = np.concatenate(pieces)

    # --- corte de pausas: só onde é silêncio de verdade, medido em janelas de 0.03 s
    win = int(WIN * SR)
    nwin = len(raw) // win
    rms = np.array([np.sqrt(np.mean(raw[i * win:(i + 1) * win] ** 2) + 1e-12) for i in range(nwin)])
    db = 20 * np.log10(rms + 1e-12)
    silent = db < SILENCE_DB
    keep = np.ones(len(raw), dtype=bool)
    i = 0
    max_keep = int(round(GAP / WIN))
    while i < nwin:
        if silent[i]:
            j = i
            while j < nwin and silent[j]:
                j += 1
            run = j - i
            limit = 1 if i == 0 else max_keep  # início: quase sem silêncio, para a 1ª palavra cair em ~0
            if run > limit:
                cut_from = (i + limit // 2) * win
                cut_to = (j - (limit - limit // 2)) * win
                keep[cut_from:cut_to] = False
            i = j
        else:
            i += 1
    keep[nwin * win:] = keep[nwin * win - 1] if nwin else True
    new_index = np.cumsum(keep) - 1
    final = raw[keep]
    tail = np.zeros(int(0.7 * SR), dtype=np.float32)  # respiro final para o loop assentar
    final = np.concatenate([final, tail])

    def remap(s):
        s = min(max(s, 0), len(raw) - 1)
        # se a amostra foi cortada, anda até a próxima mantida
        while s < len(raw) - 1 and not keep[s]:
            s += 1
        return int(new_index[s])

    for w in words:
        w["t0"] = round(remap(w["s0"]) / SR, 3)
        w["t1"] = round(remap(max(w["s1"] - 1, w["s0"])) / SR, 3)
        del w["s0"], w["s1"]

    sf.write(os.path.join(out_dir, "voice.wav"), final, SR)
    duration = round(len(final) / SR, 3)

    # --- loudness por quadro (30 fps) para a boca do apresentador
    fps = 30
    hop = SR // fps
    frames = int(np.ceil(len(final) / hop))
    loud = []
    for f in range(frames):
        seg = final[f * hop:(f + 1) * hop]
        r = np.sqrt(np.mean(seg ** 2) + 1e-12) if len(seg) else 1e-6
        loud.append(round(float(20 * np.log10(r + 1e-12)), 1))

    json.dump({"duration": duration, "words": words, "loudness_db": loud, "fps": fps},
              open(os.path.join(out_dir, "timing.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"[voz] {duration:.2f}s, {len(words)} palavras -> {out_dir}/timing.json")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
