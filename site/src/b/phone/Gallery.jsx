// The board's 7 gallery screens (§6, board order), drawn in code. Exported to 2x PNG textures for CircularGallery.
import { Phone, RemoteHome } from './ui.jsx';
import { SearchScreen, ShareScreen, YourTVsScreen, PairScreen, GuestRemote } from './screens.jsx';
import { TrackpadStill } from './PhoneLoop.jsx';
export const GALLERY = [
  ['remote-home', 'The remote', () => <RemoteHome />], ['youtube-search', 'YouTube search', SearchScreen], ['youtube-share', 'Share a YouTube link', ShareScreen],
  ['your-tvs-g1', 'Your TVs', YourTVsScreen], ['pair-name-and-room', 'Pair your TV', PairScreen], ['guests-guest-remote', 'Guest remote', GuestRemote], ['trackpad-pad', 'Trackpad', TrackpadStill]];
export default function GalleryScreen({ name = 'remote-home' }) {
  const [, label, Screen] = GALLERY.find(g => g[0] === name) || GALLERY[0];
  return <svg viewBox="0 0 376 796" width="100%" height="100%" role="img" aria-label={label} style={{ display: 'block' }}><Phone width={376} height={796}><Screen /></Phone></svg>;
}
