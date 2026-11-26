# 12 — Performance

Measured on a real bar, firmware 1.5.1.

| What | Measure | How it is kept there |
|---|---|---|
| Start | about 4 s of the firmware's loading screen, then the 1.6 s title | the generated data is plain strings; nothing is computed at start |
| Cage | about 9 frames a second | one ready-made 16×16 frame swapped per tick; frames come from the clock, so a slow frame never slows the draw |
| Ball landing | immediate on the front; one or two back rows rebuilt | a board row is rebuilt only when its key changes |
| New game | the first board shows about 1.5 s after the press; the new-game screen stays until then, and the board replaces it top to bottom in under 0.2 s (the sender parks what leaves before drawing what comes) | five or nine rows built at once; acceptable, could be spread over several ticks |
| Heap | 256 KiB (`heap_size_kib`) | about 38 KB of bitmap text plus the display sender's copies |
| `main.js` | 82 KB (limit 250 KB per file) | licence notices included |
| Package | about 12 MB, 35 s to install over USB | the 203 sounds are the bulk, voice clips in two languages |

Rules that keep it there ([04](04-platform.md)): no pixel work on the bar, strings joined once (`Array.join`) rather than grown with `+=`, at most one draw in flight, unchanged elements never re-sent.
