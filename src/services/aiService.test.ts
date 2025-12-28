import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { AIService } from './aiService'

// Mock GoogleGenerativeAI
const mockGenerateContent = vi.fn()
const mockStartChat = vi.fn()
const mockSendMessage = vi.fn()

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: mockGenerateContent,
      startChat: mockStartChat
    })
  }))
}))

describe('AIService', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv, GEMINI_API_KEY: 'test-key' }
    mockGenerateContent.mockReset()
    mockStartChat.mockReset()
    mockSendMessage.mockReset()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should generate summary successfully', async () => {
    mockGenerateContent.mockResolvedValue({
      response: Promise.resolve({
        text: () => 'Summary text'
      })
    })

    const result = await AIService.generateSummary('verify text')
    expect(result).toBe('Summary text')
    expect(mockGenerateContent).toHaveBeenCalled()
  })

  it('should chat successfully', async () => {
    mockStartChat.mockReturnValue({
      sendMessage: mockSendMessage
    })

    mockSendMessage.mockResolvedValue({
      response: Promise.resolve({
        text: () => 'Chat response'
      })
    })

    const result = await AIService.chat('context', [], 'msg')
    expect(result).toBe('Chat response')
    expect(mockStartChat).toHaveBeenCalled()
  })

  it('should throw error if API key is missing', async () => {
    process.env.GEMINI_API_KEY = ''
    await expect(AIService.generateSummary('text')).rejects.toThrow('GEMINI_API_KEY is not set')
  })
})
