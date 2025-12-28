import { describe, expect, it, vi } from 'vitest'
import { YoutubeTranscript } from 'youtube-transcript'
import { YouTubeService } from './youtubeService'

// Mock YoutubeTranscript
vi.mock('youtube-transcript', () => ({
  YoutubeTranscript: {
    fetchTranscript: vi.fn()
  }
}))

describe('YouTubeService', () => {
  it('should fetch and join transcript successfully', async () => {
    const mockTranscript = [
      { text: 'Hello', duration: 1, offset: 0 },
      { text: 'world', duration: 1, offset: 1 }
    ]
    vi.mocked(YoutubeTranscript.fetchTranscript).mockResolvedValue(mockTranscript)

    const result = await YouTubeService.getTranscript('https://www.youtube.com/watch?v=123')
    expect(result).toBe('Hello world')
  })

  it('should throw error when fetch fails', async () => {
    vi.mocked(YoutubeTranscript.fetchTranscript).mockRejectedValue(new Error('Fetch failed'))

    await expect(YouTubeService.getTranscript('bad-url')).rejects.toThrow('Failed to fetch transcript')
  })
})
