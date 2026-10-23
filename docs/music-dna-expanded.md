# Music DNA: broader tastes, languages and listener learning

2026-10-22. Local implementation; no public deployment or production model promotion.

The owner requested broader taste coverage, songs in Spanish, Russian, Turkish and other languages, better musical development, and feedback that can improve the model. Favorites remain the only required input. Existing saved lists and earlier recordings are preserved.

## Behavior

- A shared catalogue policy now covers 25 musical families: heavy rock/metal, alternative/rock, pop, indie, jazz, blues, R&B/soul, hip-hop/rap, country, reggae, dance/EDM, electronic/synth-pop, chill/ambient, lo-fi, classical/orchestral, funk/disco, Latin, reggaeton, flamenco, Afrobeats, amapiano, Arabic traditions/pop, South Asian traditions/film, regional folk and experimental music. These are broad families, not a claim to reproduce every subgenre faithfully. Original catalogue labels still reach the planner. Unknown styles fail explicitly instead of silently becoming pop.
- The singer receives its actual language code, replacing the hardcoded English setting. The optional selector offers the 50 language codes supported by the pinned singer. Automatic choice counts identified favorite-song languages and makes one seeded weighted draw per request, with English as the explicit fallback when every language is unknown. Language and genre are independent: Spanish metal remains metal. Mixed-language lists choose one coherent language; simultaneous multilingual lyrics are not promised.
- Plans describe groove, texture, harmonic color, vocal delivery and arrangement. Named artists guide taste interpretation but are excluded from production descriptions; no source recording is fetched or copied. Nonempty sections, distinct developed verses, a returning chorus with more than one unique line, bridge and sung ending are checked. Four bounded planner attempts may repair malformed plans; lyric failures use a focused rewrite that preserves the validated musical direction, rather than repeatedly copying a bad full plan; the existing two-performance audio retry remains bounded.
- Script-aware lyric checks accept non-Latin scripts and count characters for languages that do not normally separate words with spaces. Production directions remain English. Script matching does not certify language, grammar, pronunciation or musical quality.
- Each checked song offers “Would you listen again?” and optional positive/negative tags. Separate, initially unchecked choices control personal adaptation and shared model training. Feedback is bound to the exact generated plan/audio and an anonymous browser token. Positive and negative personal feedback can guide the next songs in that musical family; explicit language selections narrow it further. Deleting or withdrawing feedback excludes it from new use. **Feedback settings → Delete all my feedback** also removes ratings on songs that have left the two-song recent history. Mutations for the same browser cannot overlap, so an in-flight save must finish before a bulk withdrawal is accepted.

## Local training, with explicit consent

`scripts/train_dna_feedback.py` creates local QLoRA research adapters for the **song planner**, not the acoustic singer. It does not claim to improve voice realism by changing singer weights. Positive, training-consented, style-checked original Jamloom songs can enter supervised training. Negative ratings remain personal guidance and are counted separately; they are not incorrectly treated as positive targets. Original favorite lists, artist names from the list, and provider recordings are not used as training prompts or audio datasets. Training examples contain generated musical traits and original generated song plans.

The minimum is 24 distinct positively rated outputs, six distinct favorite-list groups, three genre families and two languages, with at least 16 training and four held-out examples. This is a conservative collection threshold, not a statistical quality guarantee. All variants/languages of the same normalized favorite list remain in the same split. Identical audio is deduplicated. Examples exceeding the 4,096-token budget stop the run rather than silently losing their endings.

Saving/deleting feedback refreshes the queue and can start an eligible local run while compute is idle. The shared singer lock prevents competing training and audio jobs. If busy, the queue records `waiting_for_idle_compute`; it is retried after a website song finishes, on the next feedback update, or by the explicit command below. External evaluation commands do not schedule a retry. Local training shares the Mac with song generation, so a bounded training run can temporarily make new generation unavailable. A completed candidate for identical source feedback is reused. Training targets conform to the same song-plan schema as the generator. A generic reference represents the generated musical direction; the original favorite names and per-favorite metadata are excluded from the training messages. Every target is validated before collection. The bounded run checks the pinned base weights, measures baseline held-out loss, trains 100 steps on four layers, and measures held-out loss with the adapter. Loss alone cannot authorize promotion.

Consent is rechecked during each phase. Changed/deleted feedback stops an active run and invalidates/deletes affected research adapters on refresh. Private temporary training datasets are removed. Research candidates never replace the serving model automatically; production learned-AI and listening gates still apply.

```sh
.venv-singer/bin/python scripts/train_dna_feedback.py --auto
.venv-singer/bin/python scripts/train_dna_feedback.py --train
```

Current genuine queue: **0 consented positive songs; waiting for feedback**. No real-feedback model training or promotion is claimed. Technical fixture tests do not create ratings in the real queue.

## Completed technical evaluation

| Check | Result |
|---|---|
| Site tests | **PASS:** 61 tests, including consent separation, listener isolation, concurrent-write rejection, bulk withdrawal and feedback-to-next-job binding |
| Python checks | **PASS:** 26 tests across Music DNA and the shared singer, including bounded lyric repair, language/genre validation, grouped holdouts, consent withdrawal, context limits and training failure cleanup |
| Build and browser | **PASS:** production build, typecheck, bundle audit; Chromium/WebKit at 1280, 390 and 320 px; feedback save/reload/delete, bulk withdrawal, failure recovery and scoped accessibility checks |
| Genre planning | **PASS:** 26 final plans cover all 25 families; original failures retained. The remaining 20 family fixtures are planning tests, not audio/listening results |
| Multilingual audio | **PASS, technical:** six 120-second stereo renders, checked audio hashes, style screening, current script/structure validation, browser playback/seeking/download and no autoplay |
| Linguistic / musical quality | **PARTIAL:** language diagnostics support Spanish, Turkish, Japanese, Arabic and Russian sung windows. Hindi is inconclusive. Native grammar, phrasing, pronunciation and enjoyment are **NOT RUN**; script/structure checks do not establish natural wording |
| Feedback learning | **PASS, plumbing/schema checks; NOT RUN, actual learning:** the real queue has zero eligible ratings. Training examples are accepted by the serving planner schema; isolated synthetic fixtures test orchestration without creating human judgments |

The initial Russian audio was rejected. Several multilingual drafts failed lyric/evidence/length checks; the first Japanese take was rejected by the style screen. Targeted lyric repair, explicit limits, English production descriptions and conservative evidence-label recovery resolved the technical failures. Country needed a larger bounded arrangement-description field. These attempts remain in [evaluation history](evidence/music-dna-expanded/evaluation-attempts.json); [final coverage and hashes](evidence/music-dna-expanded/coverage.json) describe the successful results. This is not a blanket claim of musical quality.

[Open the six review samples](http://127.0.0.1:4247/music-dna?song=e46c2b419c054cd79311bd9deecf1258&song=4caf5b05203048a3b61bb22cd4d2ce9c&song=c7944cb9bef241a3857be663ee5c8e53&song=0f7c7e87a20645ce8f52e6de86988fe4&song=4a81d32f68b14b09956d9d82cdabba53&song=3f868ec96fdd4f8089ce5225befefc8c). These are labelled examples made from the evaluation lists; they do not replace the user's saved favorites. Use the feedback under each player. Shared training remains optional.

| Language | Example | Style windows |
|---|---|---|
| Spanish | La Sombra del Camino | 3/4 |
| Russian | Город без сигарет | 3/4 |
| Turkish | Saatte Bitti | 3/4 |
| Japanese | 夜の向こうへ | 4/4 |
| Arabic | أرض المطر | 3/4 |
| Hindi | Raat Ke Awaam | 4/4 |

## Evidence and limits

The committed evidence directory is `docs/evidence/music-dna-expanded/`. Raw generated songs, original failed attempts, private drafts and analysis remain under ignored `renders/music-dna-songs/` and `renders/music-dna-expanded-20261022/`.

The reproducible evaluation cases cover every implemented family and six priority languages. Any automatic speech-language diagnostic is explicitly separate from listening acceptance. The small speech recognizer can hallucinate or repeat syllables over music and is not used to certify singers.

```sh
python3 -m unittest discover -s tests -p 'test_*dna*.py'
.venv-singer/bin/python -m unittest discover -s tests -p 'test_sing*.py'
# From apps/site with Node 22:
npm test
npm run build
node tests/dna-feedback-browser.mjs
node tests/taste-browser.mjs
node tests/taste-recovery-browser.mjs
# Idle local model execution; no provider audio or paid compute:
.venv-singer/bin/python scripts/evaluate_dna.py --cases all --output /tmp/dna-plans
```

**NOT RUN:** broad native-speaker listening, calibrated quality across all 50 languages/every subgenre, learning benefit from real opted-in feedback, production model promotion, hosted generation/feedback release. Earlier owner acceptance applies to the previously reviewed rock example only.

Implementation references: [language settings](../assets/manifests/dna-languages.json), [genre policy](../assets/manifests/dna-directions.json), [evaluation cases](../assets/manifests/dna-evaluation.json), [training pipeline](../scripts/train_dna_feedback.py). The pinned singer language inventory comes from its [official source revision](https://github.com/ace-step/ACE-Step-1.5/blob/ca1e85fe9430179831e6bc6be790c332190a3866/acestep/constants.py); local adapter execution follows the installed [MLX-LM LoRA workflow](https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/LORA.md).


## One song, weighted language and approximate country — 2026-10-22

The owner clarified that every click should produce one song, with language variety proportional to the favorite list. Approximate country may boost a language **only if it already occurs in a mixed-language list**. An English-only list stays English in Türkiye or Russia. A manual singing-language choice always wins and skips country lookup and language classification.

The local planner first classifies each favorite's actual sung language (bounded to two schema-checked attempts). It is instructed not to infer language from nationality, title spelling or genre. Unknown, instrumental, ambiguous and unsupported entries do not vote. Artist-only entries use a predominant singing language only when known. This remains model interpretation, not verified reference-audio analysis.

Each known favorite contributes one vote. The selected country adds a 1.5 multiplier to matching languages in a mixed list, then weights are normalized. Thus 2 Turkish + 3 English favorites mean 40%/60% without a location boost, or 50%/50% in Türkiye. A fresh random job seed selects one language; the choice is enforced through all lyric repairs and performance retries. This is a probability distribution, not a fixed alternating schedule or exact short-run quota. Unknown/unmapped countries leave the original weights unchanged; no regional language is inserted into the list.

Only the two-letter country code is retained with the request. The helper reads Vercel's country header only in a Vercel environment. The existing loopback-only Mac preview can resolve its own public egress through Country.is with a 1.5-second timeout; that lookup is never used to locate a remote hosted server. Missing, invalid, rate-limited or failed lookups return no country. Provider IP fields are discarded. An explicit language avoids the lookup entirely. UI and privacy copy describe the preference and override. Existing hosting restrictions remain enforced.

Provider contracts checked against [Vercel request headers](https://vercel.com/docs/headers/request-headers#x-vercel-ip-country) and [Country.is usage](https://country.is/). Context7 tools were unavailable in this session, so official documentation was used. The optional regional policy is a product preference, not an ethnicity, citizenship or exhaustive demographic classification.

Validation and reproducible evidence:

- **PASS:** 20 DNA Python tests, including 10,000 seeded mixed-language draws, strict evidence validation, English-only invariance in Türkiye/Russia, regional probabilities, one-output plans, and retries that cannot switch languages.
- **PASS:** 62 site tests, production build/typecheck and bundle audit. Tests cover trusted/ignored country headers, local-only lookup, provider errors, country-only storage, job concurrency and existing audio integrity checks.
- **PASS:** real local planner produced one Turkish plan for the mixed list in Türkiye and one English plan for the English-only list in Türkiye. Exact counts/probabilities and job IDs are in [planner evidence](evidence/music-dna-language-choice/plans.json). Earlier pre-region plans also demonstrated both English and Turkish from the same mixed list; those are retained in the evidence as historical checks.
- **PASS:** actual local country lookup returned a two-letter code without saving or logging the IP. Hosted geolocation remains **NOT RUN**; no deployment occurred.
- Browser results are recorded in [UI evidence](evidence/music-dna-language-choice/browser.json). The in-app Browser skill was read, but its execution tool was unavailable after discovery. The existing isolated Chromium/WebKit test suite provided fallback validation; it uses transport/audio fixtures, not real model output.
- **NOT RUN:** new audio render/listening acceptance for these plan-only tests, broad catalogue language accuracy, hosted generation or production model promotion. Previous six multilingual audio examples remain intact.

Commands: `python3 -m unittest discover -s tests -p 'test_*dna*.py'`; in `apps/site`, `npm test`, `npm run build`, `npm run audit:bundle`, `node tests/taste-browser.mjs`, and `node tests/taste-recovery-browser.mjs`. Local preview: <http://127.0.0.1:4247/music-dna>.
