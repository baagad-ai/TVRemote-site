# Showcase screenshot provenance

This maintainer record describes the native app captures used by the website.

## Real-device captures (beta.8.1)

Four of the website PNGs come from Baagad's own screen recordings of The Remote 0.1.0-beta.8.1 on a real Android phone, paired with a real TV ("Living Room TV", room "Living room"), recorded on 8 October 2026 (recordings rec4 and rec5). Design cleaned the Android status bar (time, signal and battery icons) and made no edits to app content. The website files are byte-identical to the cleaned stills in `launch-assets/beta8.1/clean/`. The phone frames are composed in the page.

| Website asset | Size | Cleaned source still | Used for | Visible state and limits |
| --- | --- | --- | --- | --- |
| `assets/showcase/remote-home.png` | 1080 × 2340 | `clean/site/hero-C1-1080x2340.png` (same bytes as `controls-C1-1080x2340.png` and `C1-remote-home.png`) | Hero, sticky proof track #1, controls section "Remote" tab | Remote home screen. Living Room TV, Living room, connected. YouTube card, D-pad, Back/Home/Play, volume and the Search YouTube button. |
| `assets/showcase/youtube-search.png` | 1080 × 2340 | `clean/C2-search.png` | Controls section "Search" tab | YouTube search sheet titled "Search YouTube on Living Room TV" with "lofi beats" typed and the phone keyboard open. The still shows the query before it is sent; it is not evidence of a TV result. |
| `assets/showcase/your-tvs.png` | 1080 × 2340 | `clean/C5-your-tvs.png` (full height) | Rooms chapter, sticky proof track #3 | Your TVs sheet: one TV, Living Room TV, Living room, connected; the Add a TV button; Couch mode and Guest mode cards (shipped features, both off). |
| `assets/showcase/pair-name-and-room.png` | 1080 × 1420 | `clean/C6-name-and-room-crop.png` | "Make the names your own" details | The Name and room part of the Pair your TV screen: TV name Living Room TV, Living room chip selected, Pair this TV button. The crop starts below the pairing-code field, so no pairing code is visible. The full-height raw still shows a code and is never used on the site. |

## Real-device capture (beta.8.2)

`assets/showcase/youtube-share.png` (1080 × 2340) is from Baagad's own screenshot of The Remote 0.1.0-beta.8.2 on the same real phone, taken on 8 October 2026. Design cleaned the Android status bar and redrew only the TV and room names in the app's own type (TV "Living Room TV", room "Living room"); the source is `launch-assets/beta8.2/clean/site/generic/youtube-share.png`.

| Website asset | Size | Cleaned source still | Used for | Visible state and limits |
| --- | --- | --- | --- | --- |
| `assets/showcase/youtube-share.png` | 1080 × 2340 | `beta8.2/clean/site/generic/youtube-share.png` (names redrawn from `share-C4-1080x2340.png`) | Share chapter, sticky proof track #2 (with three CSS highlight boxes) | "Shared to The Remote" / "Open YouTube video?" sheet: a youtube.com/watch link card, "Choose a TV. Nothing sends until you confirm.", Living Room TV (Living room · Connected) selected, "TV still needs to confirm playback.", Discard and Open on Living room buttons. It shows the review step before Open; it is not evidence of playback. |

The highlight boxes are page CSS drawn over the unmodified PNG (link card, selected TV card, Open on Living room button); they are not part of the image.

No demo, sample or emulator images remain on the website.

## Removed

The emulator demo captures `remote-demo-ltr.png`, `showcase/youtube-manual-controls.png`, `showcase/saved-tv-room-list-demo.png`, `showcase/tv-details-edit-demo.png` and the second-app controls demo were removed on 8 October 2026 when the real captures above replaced them. The emulator share capture `showcase/youtube-share-review.png` (local demo, no TV connected) was removed the same day when the beta.8.2 share screenshot replaced it. The second app tab in the controls section was dropped because the app only has a YouTube shortcut; that tab now shows YouTube search.


## Generic TV names (9 October 2026)

At Baagad's request, no real TV or room names appear on the site. Design redrew only the name text in all five showcase PNGs, in the app's own type, so every TV reads "Living Room TV" and every room "Living room". Nothing else in the screens was changed. Sources: `launch-assets/beta8.2/clean/site/generic/`.
