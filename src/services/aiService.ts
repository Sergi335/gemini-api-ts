/* eslint-disable @typescript-eslint/no-extraneous-class */
import { GoogleGenAI } from '@google/genai'
import { YOUTUBE_SUMMARY_PROMPT } from '../prompts'

interface ChatMessage { role: 'user' | 'model', content: string }

export class AIService {
  private static async collectStream (
    stream: AsyncIterable<{ text?: string }>,
    onChunk: (chunk: string) => void | Promise<void>,
    emptyErrorMessage: string
  ): Promise<string> {
    let fullText = ''

    for await (const chunk of stream) {
      const text = typeof chunk.text === 'string' ? chunk.text : ''
      if (text === '') continue

      fullText += text
      await onChunk(text)
    }

    if (fullText === '') {
      throw new Error(emptyErrorMessage)
    }

    return fullText
  }

  private static getAI (): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY
    if (typeof apiKey !== 'string' || apiKey === '') {
      throw new Error('GEMINI_API_KEY is not set')
    }

    return new GoogleGenAI({ apiKey })
  }

  private static getModelName (): string {
    return process.env.GEMINI_MODEL ?? 'gemini-2.0-flash-exp'
  }

  private static buildChatContents (context: string, history: ChatMessage[], message: string): Array<Record<string, unknown>> {
    return [
      {
        role: 'user',
        parts: [{ text: `Here is the context for our conversation:\n\n${context}` }]
      },
      {
        role: 'model',
        parts: [{ text: 'Understood. I will answer questions based on this context.' }]
      },
      ...history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      })),
      {
        role: 'user',
        parts: [{ text: message }]
      }
    ]
  }

  private static buildVideoChatContents (url: string, history: ChatMessage[], message: string): Array<Record<string, unknown>> {
    return [
      {
        role: 'user',
        parts: [
          {
            fileData: {
              fileUri: url
            }
          },
          { text: 'Here is a video for context. Please answer questions based on it.' }
        ]
      },
      {
        role: 'model',
        parts: [{ text: 'Understood. I will answer questions based on this video.' }]
      },
      ...history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      })),
      {
        role: 'user',
        parts: [{ text: message }]
      }
    ]
  }

  static async generateSummaryStream (text: string, onChunk: (chunk: string) => void | Promise<void>): Promise<string> {
    try {
      console.log(`[AIService] Streaming summary for text (length: ${text.length})...`)
      const ai = this.getAI()
      const prompt = `Por favor, proporciona un resumen en español, punto por punto (usando viñetas), del siguiente texto:\n\n${text}`

      const response = await ai.models.generateContentStream({
        model: this.getModelName(),
        contents: [{ text: prompt }]
      })

      const summary = await this.collectStream(response, onChunk, 'Failed to generate summary')
      console.log(`[AIService] Summary stream completed successfully (length: ${summary.length}).`)
      return summary
    } catch (error) {
      console.error('Error in AIService:', error)
      if (error instanceof Error && error.message === 'GEMINI_API_KEY is not set') {
        throw error
      }
      throw new Error('Failed to perform AI operation')
    }
  }

  static async summarizeVideoStream (url: string, onChunk: (chunk: string) => void | Promise<void>): Promise<string> {
    try {
      console.log(`[AIService] Streaming summary for video: ${url}...`)
      const ai = this.getAI()
      const contents = [
        {
          fileData: {
            fileUri: url
          }
        },
        { text: YOUTUBE_SUMMARY_PROMPT }
      ]

      const response = await ai.models.generateContentStream({
        model: this.getModelName(),
        contents
      })

      const summary = await this.collectStream(response, onChunk, 'Failed to generate video summary')
      console.log(`[AIService] Video summary stream completed successfully (length: ${summary.length}).`)
      return summary
    } catch (error) {
      console.error('Error in AIService:', error)
      if (error instanceof Error && error.message === 'GEMINI_API_KEY is not set') {
        throw error
      }
      throw new Error('Failed to perform AI operation')
    }
  }

  static async chatStream (context: string, history: ChatMessage[], message: string, onChunk: (chunk: string) => void | Promise<void>): Promise<string> {
    try {
      const ai = this.getAI()
      const contents = this.buildChatContents(context, history, message)

      console.log(`[AIService] Streaming chat message. History length: ${history.length} messages.`)
      const response = await ai.models.generateContentStream({
        model: this.getModelName(),
        contents
      })

      const answer = await this.collectStream(response, onChunk, 'Failed to chat')
      console.log(`[AIService] Chat stream completed (length: ${answer.length}).`)
      return answer
    } catch (error) {
      console.error('Error in AIService:', error)
      if (error instanceof Error && error.message === 'GEMINI_API_KEY is not set') {
        throw error
      }
      throw new Error('Failed to perform AI operation')
    }
  }

  static async chatWithVideoStream (url: string, history: ChatMessage[], message: string, onChunk: (chunk: string) => void | Promise<void>): Promise<string> {
    try {
      const ai = this.getAI()
      const contents = this.buildVideoChatContents(url, history, message)

      console.log(`[AIService] Streaming chat message with video context. History length: ${history.length} messages.`)
      const response = await ai.models.generateContentStream({
        model: this.getModelName(),
        contents
      })

      const answer = await this.collectStream(response, onChunk, 'Failed to chat with video')
      console.log(`[AIService] Video chat stream completed (length: ${answer.length}).`)
      return answer
    } catch (error) {
      console.error('Error in AIService:', error)
      if (error instanceof Error && error.message === 'GEMINI_API_KEY is not set') {
        throw error
      }
      throw new Error('Failed to perform AI operation. Note: Gemini API only supports public YouTube videos.')
    }
  }
}
