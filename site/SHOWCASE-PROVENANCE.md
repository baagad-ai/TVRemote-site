# Showcase screenshot provenance

This maintainer record describes the native app captures used by the website.

## Real-device captures (beta.8.1)

Four of the website PNGs come from Baagad's own screen recordings of The Remote 0.1.0-beta.8.1 on a real Android phone, paired with a real TV ("Family Room TV", room "Living room"), recorded on 8 October 2026 (recordings rec4 and rec5). Design cleaned the Android status bar (time, signal and battery icons) and made no edits to app content. The website files are byte-identical to the cleaned stills in `launch-assets/beta8.1/clean/`. The phone frames are composed in the page.

| Website asset | Size | Cleaned source still | Used for | Visible state and limits |
| --- | --- | --- | --- | --- |
| `assets/showcase/remote-home.png` | 1080 × 2340 | `clean/site/hero-C1-1080x2340.png` (same bytes as `controls-C1-1080x2340.png` and `C1-remote-home.png`) | Hero, sticky proof track #1, controls section "Remote" tab | Remote home screen. Family Room TV, Living room, connected. YouTube card, D-pad, Back/Home/Play, volume and the Search YouTube button. |
| `assets/showcase/youtube-search.png` | 1080 × 2340 | `clean/C2-search.png` | Controls section "Search" tab | YouTube search sheet titled "Search YouTube on Family Room TV" with "lofi beats" typed and the phone keyboard open. The still shows the query before it is sent; it is not evidence of a TV result. |
| `assets/showcase/your-tvs.png` | 1080 × 2340 | `clean/C5-your-tvs.png` (full height) | Rooms chapter, sticky proof track #3 | Your TVs sheet: one TV, Family Room TV, Living room, connected; the Add a TV button; Couch mode and Guest mode cards (shipped features, both off). |
| `assets/showcase/pair-name-and-room.png` | 1080 × 1420 | `clean/C6-name-and-room-crop.png` | "Make the names your own" details | The Name and room part of the Pair your TV screen: TV name Family Room TV, Living room chip selected, Pair this TV button. The crop starts below the pairing-code field, so no pairing code is visible. The full-height raw still shows a code and is never used on the site. |

## Earlier emulator capture still in use

`assets/showcase/youtube-share-review.png` (1080 × 2340) is the source capture `01-youtube-share-review.png`, taken on 2026-10-03 from the app's local demo on a disposable Android API 35 emulator at 440 dpi. It is byte-identical to that capture. It shows the native YouTube link review dialog; the app labels the destination as a local demo with no TV connected. The Open action was not tapped; this is a review UI, not evidence of playback. The page's alt text says so. It will be replaced by a real-device capture from a beta.8.2 recording.

## Removed

The emulator demo captures `remote-demo-ltr.png`, `showcase/youtube-manual-controls.png`, `showcase/saved-tv-room-list-demo.png`, `showcase/tv-details-edit-demo.png` and the second-app controls demo were removed on 8 October 2026 when the real captures above replaced them. The second app tab in the controls section was dropped because the app only has a YouTube shortcut; that tab now shows YouTube search.
