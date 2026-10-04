# Teeter - YouTube Playables build

A Playables-ready conversion of the standalone `Teeter (4).html`. Gameplay, physics, slabs, bosses, campaign, daily
challenge, quests, shop, relics, skins and visuals are the original code (92% of original source lines are byte-identical;
Slabs, Warning cues and Boss hazards are untouched). The standalone file was not modified.

> Technically prepared for Playables testing. It is NOT certified or approved by YouTube; that happens in the
> Developer Portal review.

## Layout
    index.html        SDK <script> first, loading splash, CSS            (the only HTML file)
    game.js           the whole game + Playables platform layer
    fonts/            put LilitaOne-Regular.woff2 here (see fonts/README-font.txt)
    assets/           empty on purpose: the game has no image/audio files (all art is canvas, all sound is synthesised)
    metadata/         draft store-listing text (NOT uploaded in the zip)
    tools/            package.py (validate + zip), test_playables.py (headless test harness), audit/ (derivation record)

## Test locally
    cd Teeter-Playables && python3 -m http.server 8000      # open http://localhost:8000
Outside YouTube the SDK is a no-op (`ytgame.IN_PLAYABLES_ENV` is false), so the game runs but **does not persist progress**
(by design: no localStorage fallback). Real verification needs the Playables Test Suite / Developer Portal dev link.

Automated checks (needs `pip install playwright` + Chromium): `python3 tools/test_playables.py` - 120+ assertions against a
STRICT `ytgame` mock that records any SDK-rule violation (saveData before loadData, gameReady with splash up, ...).
The mock is injected by the test runner only; nothing fake ships in the package.

## Build the upload
    python3 tools/package.py            # validates + writes dist/Teeter-Playables.zip
    python3 tools/package.py --font     # same, bundling fonts/LilitaOne-Regular.woff2 (recommended)
Upload the zip in the Playables Developer Portal ("Upload the Playable bundle assets in ZIP format"), add metadata and
thumbnails there, then use the Dev Link + Test Suite on desktop, Android, iOS before "Submit for Certification".

## Cloud save schema (v1)
    { "v": 1, "sv": { coins, best, xp, skin, own[], up[], net, camp[], relics[], hat, ach[], done[], stars, perf, streak,
                      landings, jumps, bestCombo, collapses, earned, quakes, heavy, bigFall, bosses, cc, gld, chests,
                      g, time, bestY, dstreak, dlast, d{}, dm{}, wk{}, mute, shk, hap, cb, tut } }
~1 KB. Loading: JSON parse -> `migrate` (accepts v1, future versions best-effort, and version-less legacy Teeter saves) ->
`sanitize` (whitelist + clamp every field; unknown/corrupt values fall back to defaults). Saving is disabled until
`loadData` succeeds; if load fails the session runs without saving rather than risk overwriting cloud data.
Language is intentionally not saved (SDK guidance). Runtime state (current run, tower, timers) is never saved.

## Known behaviours worth knowing
* Pause: `onPause` stops the RAF loop entirely, silences/suspends audio, flushes a save, and puts a running game on the
  existing PAUSED menu, so the player never resumes mid-air. `onResume` restarts the single loop.
* Audio: YouTube mute always wins. The Settings "Sound effects" switch is a granular on/off that can only silence, never un-mute.
* Escape: closes/back on menus and toggles the pause menu in a run; `preventDefault()` is never called on it.
* Score: `sendScore({value: SV.best})`, best height in levels, sent only after that value was saved to the cloud.
