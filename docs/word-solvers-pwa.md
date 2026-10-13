# Word solver apps

Word Unscrambler and WWF Solver are separately installable PWAs. Each root-level
`.webmanifest` defines a stable ID, canonical start URL, narrow solver URL prefix
scope, standalone display, theme, and its own icons. The prefix includes the
extensionless page, `.html` page, and Unscrambler word routes. Both use the existing
root-scoped `crossword-offline-sw.js`; no competing service worker is introduced.

Installed app windows open directly in Focus Mode. The existing toggle and Escape
key can exit Focus Mode for the current session; a new launch defaults to Focus
Mode again. Normal browser visits retain the usual layout.

Installation does not download all dictionaries. Enable **Offline Mode** in each
solver to download its complete package. That package includes the install script,
manifest, icons, engine, search worker, both dictionary sources, and local
definitions. Existing packages must be downloaded again after the PWA update;
the solver package version has been advanced to prevent claiming an older package
is complete. Browser storage can be cleared or evicted, requiring another download.
When a newer package is detected, **Update offline files** opens the existing
download confirmation. Unchanged data is reused, the previous package is retained
on failure, and the button disappears after a successful update. Detection occurs
when the current solver code loads online; there is no background update polling.

The Install button appears when the browser supplies `beforeinstallprompt`.
Other browsers show installation guidance; iOS users get Share / Add to Home
Screen instructions. Installed windows hide the install action. No new analytics
or install tracking is added.

## Manual release checks

On HTTPS or localhost, open each solver and install it. Confirm distinct names and
icons, separate installed entries, standalone launches, and the correct start page.
Enable Offline Mode in each, wait for completion, close both apps, disconnect,
and reopen. Test a rack search, scoring, dictionary switching, and local definitions.
Reconnect and verify updated assets load without deleting the other solver's package.
Check iOS Add to Home Screen separately; OS installation cannot be covered by Node tests.

## Generated artwork

Built-in imagegen created both icons. Production PNGs are in `assets/images/pwa/`:
180px Apple touch icons, 192px and 512px ordinary icons, and padded 512px maskable
icons. Maskable variants add safe-area padding to preserve the tile artwork.

### Word Unscrambler prompt

Use case: logo-brand. Create a square full-bleed PWA icon for MonkeyTactics Word Unscrambler. Deep teal background #115e59 to all edges, no outer rounded-square border. Cream rounded letter tiles: three slightly scattered tiles above resolving into a tidy row of three tiles below, a small subtle downward arrow between. Letters C A T on the orderly row, A T C above. Bold dark teal lettering. Tasteful minimal dimensional illustration, soft short shadows, crisp large shapes readable at small sizes. Keep all meaningful artwork inside central 70% of square for maskable app icons. No app name, no watermark, no extra decorations.

### WWF Solver prompt

Use case: logo-brand. Create a square full-bleed PWA icon for MonkeyTactics WWF Solver, a word game helper. Warm purple background #6b3fa0 to all edges, no outer rounded square. Three large cream rounded letter tiles arranged in an L crossing on a subtle small board: W top left, O below W, R to right of O. Small score numbers 4, 1, 1 at bottom right of corresponding tiles. Dark purple bold lettering. Minimal dimensional illustration, soft short shadows, crisp large shapes matching a premium cream letter-tile app icon. Keep artwork inside central 65% for maskable icons. No official game logo, no app name, no watermark, no extra decorations.
