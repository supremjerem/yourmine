/**
 * Whether a link is a YouTube playlist page (`/playlist?list=ID`).
 *
 * A watch link that merely carries a `list` parameter is a single video, and
 * the backend treats it as one, so it must not be routed to the playlist
 * endpoint. The backend remains the authority on what is valid; this only
 * decides which endpoint to call.
 */
export function isPlaylistUrl(link: string): boolean {
  try {
    const { pathname, searchParams } = new URL(link.trim())
    return pathname.replace(/\/$/, '') === '/playlist' && searchParams.has('list')
  } catch {
    return false
  }
}
