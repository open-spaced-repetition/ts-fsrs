# ts-fsrs v6 — 英語ナレーションと画面テキストのタイムライン

ts-fsrs v6 — English Voiceover and On-Screen Text Timeline

対象：最終版の en-US ナレーション動画（99.75 秒）。

Video: Final en-US voiceover version (99.75 seconds).

時間の単位：秒 / Time unit: seconds

## 説明 / Notes

注：ナレーションの時間は、音声クリップを動画に配置した位置の開始・終了時刻です。クリップに含まれる前後の無音を含み、単語ごとのタイムスタンプではありません。

Note: Voiceover times show where each audio clip starts and ends in the video, including any leading and trailing silence in the clip. These are not word-level timestamps.

画面テキストの時間は、アニメーションで表示されてから消えるまでのおおよその範囲です。フェードイン・フェードアウトを含み、各区間を確認する際の目安として使えます。

On-screen times indicate the approximate appearance-to-disappearance range, including fades. Use them as a guide when checking each section.

「そのまま読み上げていない」は、画面に表示された文言全体をその表示区間内にそのまま読んでいないことを指します。関連する概念がナレーションに含まれる場合はあります。

“Not read verbatim” means the full wording shown on screen is not spoken exactly as displayed during that interval. Related ideas may still be mentioned in the voiceover.

数値は連続的に変化するため、一覧では動的な項目としてまとめています。スラッシュ / は画面上の改行を表します。

Readouts change continuously, so the list groups them as dynamic fields. A slash / denotes a line break on screen.

## 1. ナレーション / Voiceover

15 区間 / 15 segments

| 時間（秒） / Time (s) | ナレーション / Voiceover | 字幕表示終了（秒） / Subtitle ends (s) |
|---|---|---|
| 0.75–4.25 | Write it down. When will you recall it again? | 4.88 |
| 6.75–11.12 | Before computers, people followed rules with cards and dates. | 11.15 |
| 12.30–16.52 | Then SuperMemo-2 brought ratings and intervals into computation. | 16.60 |
| 19.00–22.62 | A model describes memory, and how it changes. | 22.70 |
| 22.95–27.70 | A review updates memory state. The model estimates recall probability. | 27.75 |
| 37.40–42.37 | ts-fsrs version six. Beyond one algorithm. | 42.77 |
| 47.92–53.03 | Model updates memory state. Scheduler coordinates reviews. | 53.12 |
| 53.37–59.75 | Middleware applies scheduling policies. Chrono handles time values and arithmetic. | 59.85 |
| 61.35–64.40 | Define your own model with defineModel. | 65.35 |
| 66.95–70.26 | Review logs become organized training data. | 70.35 |
| 70.60–75.98 | Train on past reviews. Evaluate on reviews not used for training. | 76.22 |
| 76.47–79.25 | Use the trained weights for scheduling. | 79.47 |
| 82.02–85.40 | Compose the supported parts into your own approach. | 85.52 |
| 86.67–90.58 | Create custom models and middleware, then test them. | 90.67 |
| 92.12–96.39 | Beyond one algorithm. Build more possibilities. | 96.75 |

## 2. 画面上でそのまま読み上げていないテキスト / On-screen text not read verbatim

| 表示時間（秒） / Display time (s) | 画面テキスト / On-screen text |
|---|---|
| 2.77–5.95 | A<br>Q<br>Reviews spaced over time / strengthen long-term memory.<br>What is spaced repetition?<br>When is the / next review? |
| 6.05–11.78 | From cards / to computation<br>Rules, carried by hand. |
| 6.35–11.78 | Later<br>Review again<br>Today |
| 11.85–17.93 | 0<br>1<br>6 days<br>7<br>A rating. / A next interval.<br>Next interval<br>q = 4<br>Review rating<br>SM-2 1987 |
| 18.05–29.57 | 0<br>0%<br>100%<br>12<br>20<br>28<br>36<br>50%<br>6<br>90%<br>Elapsed days<br>FSRS-7<br>Retrievability<br>Reviews |
| 18.05–28.60 | Memory, / made visible. |
| 18.07–29.52 | * Model state examples |
| 18.83–26.98 | ≈ [dynamic retrievability percentage]<br>Elapsed days · [dynamic day value] |
| 18.83–22.95 | Base interval from review (90%) ≈ 4.78 days |
| 18.83–29.57 | Good / Remembered |
| 22.95–24.65 | Base interval from review (90%) ≈ 28.10 days |
| 24.65–26.98 | Base interval from review (90%) ≈ 0.05 days |
| 24.68–29.57 | Again / Forgotten |
| 29.07–33.70 | FSRS-7 / R(t)<br>Model state examples |
| 29.08–33.68 | Depth arranges examples; it is not a measured axis. |
| 33.32–35.47 | 0<br>0%<br>100%<br>12<br>20<br>28<br>36<br>50%<br>6<br>90%<br>Again / Forgotten<br>Elapsed days<br>FSRS-7<br>Good / Remembered<br>Retrievability<br>Reviews |
| 33.35–35.43 | * Model state examples |
| 34.07–35.47 | Memory, / made visible. |
| 36.05–43.95 | A composable SRS framework |
| 44.07–66.00 | Choose a model. / Add scheduling policies. |
| 47.33–60.70 | Memory state and base intervals<br>Model / FSRS-7 |
| 47.33–66.00 | review({ card, grade }) |
| 49.00–66.00 | card + revlog<br>Scheduling output |
| 49.82–66.00 | Chrono Time values and arithmetic<br>defineScheduler({ model, chrono }).use(...policies) |
| 60.62–66.00 | Custom Model<br>Extension example |
| 61.22–66.00 | Define a model / with defineModel. |
| 66.08–81.20 | Process illustration |
| 66.12–81.20 | Organize<br>Review history. / Trained weights. |
| 70.75–81.20 | FSRS-6 / FSRS-7 |
| 76.65–81.20 | config.weights<br>Custom models need compatible trainers. |
| 81.32–91.32 | Built-in support<br>FSRS-3 · 4 · 4.5 · 5 · 6 · 7<br>More ways / to build. |
| 85.85–91.32 | An extension point, not a finished learning app.<br>Custom Model<br>Extension example |
| 91.42–92.85 | A<br>Q<br>Reviews spaced over time / strengthen long-term memory.<br>What is spaced repetition? |
| 93.07–99.75 | 2026.10.28 RELEASE<br>A composable SRS framework<br>github.com/open-spaced-repetition/ts-fsrs<br>ts-fsrs v6 |

## 3. 表記・発音の対応とミュートについて / Written forms, pronunciation, and muted narration

画面表記の SM-2 はナレーションで SuperMemo-2（SuperMemo two）と読みます。ts-fsrs v6 は ts-fsrs version six と読みます。

The on-screen SM-2 is spoken as SuperMemo-2 (SuperMemo two). ts-fsrs v6 is spoken as ts-fsrs version six.

29.70–33.20 秒の memory.space のナレーションはミュートされています。「Model examples, arranged in depth.」は再生されず、下部の字幕にも表示されません。

At 29.70–33.20 s, the memory.space voiceover is muted. “Model examples, arranged in depth.” is neither played nor shown as a bottom subtitle.

画面の「Depth arranges examples; it is not a measured axis.」は約 29.08–33.68 秒に表示されますが、読み上げられません。

“Depth arranges examples; it is not a measured axis.” remains on screen at approximately 29.08–33.68 s but is not read aloud.
