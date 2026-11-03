# Reel diário de curiosidades de futebol — instruções da execução automática

Este arquivo é o roteiro de trabalho da tarefa agendada. Cada execução começa numa máquina
limpa: siga os passos na ordem, sem pedir aprovação (o dono pediu geração direta).

## 1. Preparar a máquina

```bash
./setup.sh          # (rode de novo se um download falhar) espeak-ng, venv Python, Kokoro ONNX, Whisper (sherpa-onnx), modelos
npm install         # opentype.js e gsap locais
```

Só GitHub e os registros de pacotes são acessíveis; por isso os modelos vêm de releases no
GitHub e o GSAP vai em `assets/vendor/`. O render usa o Chrome headless de `/opt/pw-browsers`
(o `make.sh` encontra sozinho).

## 2. Escolher a curiosidade

- Leia `history.json`: nunca repita um tema nem o fato central de um reel anterior.
- Escolha uma curiosidade de futebol surpreendente e verificável: história das Copas, regras e
  sua origem, equipamento (bolas, chuteiras, uniformes), estádios, recordes, táticas, arbitragem,
  números curiosos. Varie as áreas de um dia para o outro.
- Pesquise na web e confirme **cada número e cada fato em pelo menos 2 fontes independentes**
  (Wikipedia + uma fonte jornalística/oficial). Mito comum ou dado sem confirmação: troque de tema.
- Pode citar nomes de seleções, clubes, jogadores e marcas no texto. Nos desenhos, nada de
  escudos, logotipos ou caricaturas de pessoas reais — só os ícones genéricos da biblioteca.

## 3. Escrever o roteiro

Crie `reels/AAAA-MM-DD-slug/reel.json` (copie o formato de `reels/2026-10-30-telstar/reel.json`).

Regras do texto (narração em PT-BR, voz `pm_santa`):
- `hook[0]`: o problema/a provocação em **menos de 6 palavras**.
- `hook[1]`: promete o retorno.
- 3 a 7 `points`, cada um com `say` (o fato, curto) e `explain` (a explicação que a demo encena).
- `close`: cumpre a promessa do gancho, de preferência ecoando a primeira frase (o vídeo faz loop).
- Total de 75 a 140 palavras, para a voz durar 30-60 s (o make.sh mostra a duração).
- Marque a palavra-chave de cada frase com `*asteriscos*` (vira serifa itálica vermelha).
- Números em algarismos ("1970", "32", "600 mil"); o espeak lê corretamente.
- Evite começar frase com "A" + nome próprio que comece com "T" ou vogal ("A Telstar" soa "Até");
  use "A bola Telstar", "O time do X", etc. Se algo soar mal, use o campo `"pronounce": {"Palavra": "grafia falada"}`.

Campos de cada ponto:
| campo | o que é |
|---|---|
| `name` | rótulo curto em minúsculas, vira `// 01 · name` |
| `title` | duas palavras em CAIXA ALTA: a 1ª em tinta, a 2ª em vermelho |
| `title_at` | palavra do `say` em que o título bate; precisa estar **no começo** do `say` |
| `stat` | `{num, label}` do canto direito (num em vermelho) |
| `card` | `{count_to, format: plain|thousands, label, icon}` — número que conta no cartão |
| `terminal` | linha digitada na barra (até ~30 caracteres) |
| `stamp`, `stamp_at` | carimbo em CAIXA ALTA (1-2 palavras) e a palavra em que cai |
| `demo` | `{type, beats, ...params}` — veja abaixo |

`hook_card`: `{icon, variant, caption, strike_at}`; `hook_chips`: 2-4 `{text, payoff?, at}`;
`close_card`: `{icon, variant, caption, ring_at}` (a legenda do cartão no fim é sempre a do `hook_card`). Para o loop, `hook_card` e `close_card`
devem usar o mesmo ícone (o fim volta ao estado do começo).

Ícones (`src/lib/icons.mjs`): `ball`, `ball-faint`, `plain-ball`, `tv` (variant `faint`/`clear`/`empty`),
`card`/`card-red` (variant `faint` = cartão tracejado "que ainda não existe"),
`satellite`, `globe`, `trophy`, `whistle`, `card`, `card-red`, `goal`, `stopwatch`,
`calendar` (`text`), `pitch`, `boot`, `scoreboard`, `dog` (cachorro genérico),
`parcel` (pacote embrulhado em jornal), `trophy` (variant `faint` = taça sumida, tracejada).
Obs.: sem `variant`, o `hook_card` usa `faint`; para começar com o ícone cheio, use `"variant": "clear"`.

Demos (`src/lib/demos.mjs`) — `beats` apontam para palavras faladas (`"palavra"` ou `"palavra#2"`):

> Atenção: `stamp_at` e os `beats` procuram a palavra **primeiro no `explain` e depois no `say`**;
> `"palavra#2"` conta nessa ordem. Se a palavra aparece nos dois, sem `#n` vale a do `explain`.
> O `title_at` procura só no `say`.
| type | params | beats |
|---|---|---|
| `tv_fade` | — | `fade` |
| `ball_spin` | — | `spin` |
| `orbit_morph` | — | `morph` |
| `grid_multiply` | `n`, `big`, `big_label` | `multiply` |
| `big_number` | `value`, `label`, `format`, `prefix`, `suffix` | — |
| `scoreboard` | `home`, `away`, `a`, `b`, `minute` | `score` |
| `timeline` | `items:[{year,label}]`, `highlight` | `highlight` |
| `bars` | `items:[{label,value}]`, `format`, `highlight` (índice da barra vermelha; padrão: a última) | — |
| `card_flip` | `color` (yellow/red), `text` | `show` |
| `pitch_path` | — | `goal` |
| `icon_pop` | `items:[{icon,label}]` (até 3) | `i0`, `i1`, `i2` |
| `traffic_light` | — (semáforo + cartões amarelo e vermelho) | `yellow`, `red` |

Se nenhuma demo encenar bem o que a voz diz, crie uma nova em `src/lib/demos.mjs` seguindo o
mesmo contrato e registre-a na tabela acima.

## 4. Gerar

```bash
./make.sh AAAA-MM-DD-slug
```

Etapas: voz Kokoro (velocidade 1.1, pausas > 0.24 s cortadas) → conferência Whisper → trilha e
tiques → composições → `hyperframes check` (0 erros) → snapshots → render → mix em -15 LUFS.

- Whisper com `ERRO` num trecho: reescreva a frase e rode de novo.
- Voz fora de 30-60 s: ajuste o tamanho do roteiro.
- **Olhe** `build/<slug>/snapshots/contact-sheet.jpg` antes de entregar: texto cortado,
  sobreposição, demo vazia ou carimbo fora do lugar → corrija (`stamp_pos: {left, top}` move o carimbo) e gere de novo.

Os avisos de contraste do cinza `#8A857E` e do rótulo de 25 px são do estilo pedido; ignore.

## 5. Entregar

1. Envie `out/<slug>.mp4` ao dono com SendUserFile (status `proactive`), com uma legenda curta:
   o tema e as fontes usadas.
2. Acrescente o reel em `history.json` (`date`, `slug`, `topic`, `facts`, `sources`).
3. `git add reels history.json src AUTOMATION.md && git commit -m "reel: <slug>" && git push`.
   Os vídeos não vão para o repositório (ficam fora pelo .gitignore).
