# Playables certification checklist - Teeter (technical readiness, NOT an approval)

PASS = implemented and verified by the automated harness against a strict ytgame mock + static validator.
VERIFY = implemented, but can only be confirmed in the real YouTube environment / on real devices.
OPEN = needs something from you.

| # | Requirement | Status |
|---|---|---|
| 1 | SDK loads before game code (`<script src="https://www.youtube.com/game_api/v1">` is first script; game.js last) | PASS (package.py + runtime order test) |
| 2 | firstFrameReady after the splash has painted, before gameReady | PASS (mock) / VERIFY in Test Suite |
| 3 | gameReady only once the menu is interactive and the splash is removed | PASS (mock asserts splash gone) / VERIFY |
| 4 | Cloud load implemented (`loadData`, 3 retries) | PASS |
| 5 | Cloud save implemented (`saveData`) | PASS |
| 6 | Save waits for load; none if load failed | PASS (strict mock: 0 violations) |
| 7 | Saves at milestones: run end, stage clear, daily clear, purchases, unlocks, achievements/quests, chests/relics, level-up, pause | PASS |
| 8 | Save schema versioned (`{v:1,sv:{...}}`) | PASS |
| 9 | Old saves supported (legacy teeter2/3 shape, future versions best-effort) | PASS |
| 10 | No alternative persistent storage (no localStorage/sessionStorage/IndexedDB/cookies) | PASS (static + runtime hooks) |
| 11 | onPause implemented | PASS |
| 12 | onResume implemented | PASS |
| 13 | Complete pause (loop, physics, timers, audio, input, saves queue) | PASS |
| 14 | Progress saved on pause | PASS |
| 15 | YouTube audio state respected (isAudioEnabled + onAudioEnabledChange) | PASS (mock) / VERIFY |
| 16 | No competing global mute button (HUD SFX button removed; Settings switch is granular and cannot un-mute) | PASS |
| 17 | Touch input | PASS (emulated touch) / VERIFY on devices |
| 18 | Mouse input | PASS |
| 19 | Keyboard input | PASS |
| 20 | Escape compliant (closes modals/back; preventDefault never called on it) | PASS |
| 21 | Responsive across aspect ratios (tested 9:32 ... 32:9, 200x200) | PASS |
| 22 | State preserved on resize (run never restarts) | PASS |
| 23 | No orientation/posture lock | PASS |
| 24 | No external links | PASS |
| 25 | No sharing UI | PASS |
| 26 | No extra user agreement / personal-data prompts / QR / clipboard | PASS |
| 27 | No Playables-control lookalikes | VERIFY (pause "II" button is top-right; confirm it does not collide with YouTube's overlay on the dev link) |
| 28 | No in-game quit/exit UI (QUIT renamed HOME; it returns to the game's own menu) | PASS / VERIFY with reviewer |
| 29 | Final content completion communicated (CAMPAIGN COMPLETE + "no more stages" + map banner) | PASS |
| 30 | No external network calls (only the SDK script); Google Fonts removed | PASS (runtime + CSP run) |
| 31 | Packaged assets use relative paths | PASS |
| 32 | File names compliant | PASS |
| 33 | Package size compliant (2 files, 93 KB raw / 37 KB zipped) | PASS |
| 34 | Saved game size compliant (~1 KB vs 64 KiB flush / 500 KiB / 3 MiB) | PASS |
| 35 | Startup performance (0.4 s locally with simulated SDK) | PASS locally / VERIFY with real SDK + network |
| 36 | No severe runtime errors (123 assertions x3 runs, fuzz of all stages/contracts/daily/bosses) | PASS |
| 37 | Mobile performance tested | NOT TESTED (no real devices here) |
| 38 | Original display font (Lilita One) bundled locally | OPEN (could not be downloaded; fallback font in use) |
| 39 | Store metadata + thumbnails | OPEN (portal; drafts in metadata/) |
