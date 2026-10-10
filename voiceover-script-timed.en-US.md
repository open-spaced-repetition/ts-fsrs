# ts-fsrs v6 — 英語ナレーションと画面テキストのタイムライン

ts-fsrs v6 — English Voiceover and On-Screen Text Timeline

対象：最終版の en-US ナレーション動画（107.80 秒）。

Video: Final en-US voiceover version (107.80 seconds).

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
| 0.75–4.29 | How long can you recall things if all you do is write them down? | 6.35 |
| 7.70–13.00 | Before computers, people memorized cards by following rules with math and dates. | 13.20 |
| 14.35–18.92 | Then SuperMemo-2 brought ratings and intervals into the computer realm. | 19.35 |
| 21.15–24.43 | A model describes how your memory degrades over time. | 25.35 |
| 25.60–33.88 | When you review a card, its memory state is updated. The model then uses this state to predict recall probability for the future. | 35.10 |
| 44.75–48.96 | ts-fsrs version six. Fully customizable. | 48.97 |
| 54.12–59.48 | The model updates a card's memory state. The scheduler calculates review times. | 59.72 |
| 59.97–65.76 | Middleware applies scheduling policies. Chrono handles time values and arithmetic. | 65.77 |
| 67.27–69.71 | Define your own model with defineModel. | 71.27 |
| 72.87–76.44 | Transform your review logs into organized training data. | 76.57 |
| 76.82–83.25 | Train the model on past reviews. Evaluate it on separate reviews not used for training. | 83.25 |
| 83.50–85.69 | Use the trained weights for scheduling. | 86.50 |
| 88.05–92.28 | Mix and match the supported components into your own custom approach. | 92.75 |
| 93.90–97.56 | You can even create completely custom models and middleware. | 98.10 |
| 99.55–104.51 | A fully customizable approach. Build with more than just one algorithm. | 104.55 |

## 2. 画面上でそのまま読み上げていないテキスト / On-screen text not read verbatim

| 表示時間（秒） / Display time (s) | 画面テキスト / On-screen text |
|---|---|
| 2.77–6.90 | A<br>Q<br>Reviews spaced over time are designed / to strengthen long-term memory.<br>What is spaced repetition?<br>When is the / next review? |
| 7.00–13.83 | From cards / to the computer realm<br>Rules, carried out by hand. |
| 7.30–13.83 | Later<br>Review again<br>Today |
| 13.90–20.08 | 0<br>1<br>6 days<br>7<br>A rating. / A next interval.<br>Next interval<br>q = 4<br>Review rating<br>SM-2 1987 |
| 20.20–35.95 | Memory, / made visible. |
| 20.20–36.92 | 0<br>0%<br>100%<br>12<br>20<br>28<br>36<br>50%<br>6<br>90%<br>Elapsed days<br>FSRS-7<br>Retrievability<br>Reviews |
| 20.22–36.87 | * Memory state examples per model |
| 20.98–25.60 | Base interval from review (90%) ≈ 4.78 days |
| 20.98–35.33 | ≈ [dynamic retrievability percentage]<br>Elapsed days · [dynamic day value] |
| 20.98–36.92 | Good / Remembered |
| 25.60–27.30 | Base interval from review (90%) ≈ 28.10 days |
| 27.30–35.33 | Base interval from review (90%) ≈ 0.05 days |
| 27.33–36.92 | Again / Forgotten |
| 36.42–41.05 | FSRS-7 / R(t)<br>Memory state examples |
| 36.43–41.03 | Depth delineates between examples; it is not a measured axis. |
| 40.67–42.82 | 0<br>0%<br>100%<br>12<br>20<br>28<br>36<br>50%<br>6<br>90%<br>Again / Forgotten<br>Elapsed days<br>FSRS-7<br>Good / Remembered<br>Retrievability<br>Reviews |
| 40.70–42.78 | * Memory state examples per model |
| 41.42–42.82 | Memory, / made visible. |
| 43.40–50.15 | A customizable SRS framework |
| 50.27–71.92 | Choose a model. / Add scheduling policies. |
| 53.53–66.62 | Memory state and base intervals<br>Model / FSRS-7 |
| 53.53–71.92 | Coordinates reviews<br>review({ card, grade }) |
| 55.20–71.92 | card + revlog<br>Scheduling output |
| 56.02–71.92 | Chrono Time values and arithmetic<br>defineScheduler({ model, chrono }).use(...policies) |
| 66.53–71.92 | Custom Model<br>Extension example |
| 67.13–71.92 | Define a model / with defineModel. |
| 72.00–87.23 | Process illustration |
| 72.03–87.23 | Organize<br>Review history. / Trained weights. |
| 76.97–87.23 | FSRS-6 / FSRS-7 |
| 83.68–87.23 | config.weights<br>Custom models need compatible trainers. |
| 87.35–98.75 | Built-in support<br>FSRS-3 · 4 · 4.5 · 5 · 6 · 7<br>More ways / to build. |
| 93.08–98.75 | An extension point, not a finished learning app.<br>Custom Model<br>Extension example |
| 98.85–100.28 | A<br>Q<br>Reviews spaced over time are designed / to strengthen long-term memory.<br>What is spaced repetition? |
| 100.50–107.80 | 2026.10.28 RELEASE<br>A customizable SRS framework<br>github.com/open-spaced-repetition/ts-fsrs<br>ts-fsrs v6 |

## 3. 表記・発音の対応とミュートについて / Written forms, pronunciation, and muted narration

画面表記の SM-2 は SuperMemo-2（SuperMemo two）と読みます。ts-fsrs は英語で TS / FSRS の2グループを続けて読みます。

The on-screen SM-2 is pronounced SuperMemo-2 (SuperMemo two). ts-fsrs is spoken as two connected English groups, TS / FSRS.

37.05–40.55 秒の memory.space ナレーションはミュートされ、下部字幕にも表示されません。

At 37.05–40.55 s, the memory.space narration is muted and omitted from the bottom subtitles.

画面の「Depth delineates between examples; it is not a measured axis.」は約 36.43–41.03 秒に表示されますが、読み上げられません。

“Depth delineates between examples; it is not a measured axis.” appears at approximately 36.43–41.03 s but is not read aloud.
