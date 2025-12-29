import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { AIService } from './aiService'

// Mock GoogleGenAI
const mockGenerateContent = vi.fn()

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent
    }
  }))
}))

describe('AIService', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv, GEMINI_API_KEY: 'test-key' }
    mockGenerateContent.mockReset()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should generate summary successfully', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'Summary text'
    })

    const result = await AIService.generateSummary('verify text')
    expect(result).toBe('Summary text')
    expect(mockGenerateContent).toHaveBeenCalled()
  })

  it('should summarize video successfully', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'Video summary'
    })

    const result = await AIService.summarizeVideo('https://youtube.com/watch?v=test')
    expect(result).toBe('Video summary')
    expect(mockGenerateContent).toHaveBeenCalled()
  })

  it('should chat successfully', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'Chat response'
    })

    const result = await AIService.chat('context', [], 'msg')
    expect(result).toBe('Chat response')
    expect(mockGenerateContent).toHaveBeenCalled()
  })

  it('should chat with video successfully', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'Video chat response'
    })

    const result = await AIService.chatWithVideo('https://youtube.com/watch?v=test', [], 'msg')
    expect(result).toBe('Video chat response')
    expect(mockGenerateContent).toHaveBeenCalled()
  })

  it('should throw error if API key is missing', async () => {
    process.env.GEMINI_API_KEY = ''
    await expect(AIService.generateSummary('text')).rejects.toThrow('GEMINI_API_KEY is not set')
  })
})
