import { describe, expect, it } from 'vitest'
import { LinkAnalyzer } from './linkAnalyzer'

describe('LinkAnalyzer', () => {
  it('should identify YouTube URLs as video', () => {
    expect(LinkAnalyzer.analyze('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('video')
    expect(LinkAnalyzer.analyze('https://youtu.be/dQw4w9WgXcQ')).toBe('video')
  })

  it('should identify Vimeo URLs as video', () => {
    expect(LinkAnalyzer.analyze('https://vimeo.com/123456789')).toBe('video')
  })

  it('should identify Twitch URLs as video', () => {
    expect(LinkAnalyzer.analyze('https://www.twitch.tv/somechannel')).toBe('video')
  })

  it('should identify Medium URLs as article', () => {
    expect(LinkAnalyzer.analyze('https://medium.com/some-publication/some-article')).toBe('article')
  })

  it('should identify Dev.to URLs as article', () => {
    expect(LinkAnalyzer.analyze('https://dev.to/someuser/some-article')).toBe('article')
  })

  it('should identify specific article domains correctly', () => {
    expect(LinkAnalyzer.analyze('https://substack.com/@someuser')).toBe('article')
  })

  it('should identify unknown URLs as general', () => {
    expect(LinkAnalyzer.analyze('https://www.google.com')).toBe('general')
    expect(LinkAnalyzer.analyze('https://mysite.com')).toBe('general')
  })

  it('should identify invalid URLs as general', () => {
    expect(LinkAnalyzer.analyze('invalid-url')).toBe('general')
  })
})
