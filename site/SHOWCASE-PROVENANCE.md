# Showcase screenshot provenance

This maintainer record describes the five unaltered native app captures used by the website. They were captured on 2026-10-03 from the app's local demo on a disposable Android API 35 emulator at 1080 × 2340 and 440 dpi. Each site PNG is byte-identical to its source capture. The phone frames and detail insets are composed in the page; the source files themselves were not redrawn, composited, cropped, or edited.

| Website asset | Source capture | Visible state and limits |
| --- | --- | --- |
| `assets/showcase/youtube-share-review.png` | `01-youtube-share-review.png` | Native YouTube link review dialog. The app labels the destination as a local demo with no TV connected. The Open action was not tapped; this is a review UI, not evidence of playback. |
| `assets/showcase/youtube-manual-controls.png` | `02-youtube-manual-profile.png` | YouTube was chosen manually. The screen says “Demo · chosen by you” and shows the controls available for that app selection. No TV command was sent, and no reported foreground app is set. |
| `assets/showcase/spotify-controls-manual-demo.png` | `07-spotify-player-controls-manual-demo.png` | Spotify was chosen manually and the native screen was naturally scrolled to its player controls. “Demo · chosen by you” and the “Local demo” labels remain visible; no control was tapped. |
| `assets/showcase/saved-tv-room-list-demo.png` | `04-your-tvs-disconnected-samples.png` | The local-demo screen says no TV commands are sent. The living-room and bedroom entries are sample UI fixtures, not paired or saved TVs. |
| `assets/showcase/tv-details-edit-demo.png` | `05-tv-details-disconnected-sample.png` | The name-and-room form for a sample TV is shown with the keyboard dismissed. No field was changed or saved. |

The player-controls capture was taken after natural in-app scrolling; its file has not been modified. The website's small native-detail insets use CSS positioning over the same original PNGs. They do not add a second, synthesized UI state.

## Earlier keyboard capture

`assets/remote-demo-ltr.png` was introduced in published commit `6a4569fe50800204eee71ed60a71fa5402ed0180` as the reviewed demo screen with explicit local-demo context. Its older UI visibly includes a sample Connected label. This redesign preserves its exact bytes, labels it a native sample screen, and makes no claim that its displayed TV was actually paired or that any search played on a TV. Its capture date and source-device details are not independently established by this repository.
