import { describe, expect, it } from 'vitest'
import { isPlaylistUrl } from './youtubeUrl'

describe('isPlaylistUrl', () => {
  it.each([
    'https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf',
    'https://youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf',
    'https://music.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf',
    'https://www.youtube.com/playlist/?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf',
    '  https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf  '
  ])('should recognise %s as a playlist', (link) => {
    expect(isPlaylistUrl(link)).toBe(true)
  })

  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/playlist',
    'not a url',
    ''
  ])('should not treat %j as a playlist', (link) => {
    expect(isPlaylistUrl(link)).toBe(false)
  })
})
