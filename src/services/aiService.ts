/* eslint-disable @typescript-eslint/no-extraneous-class */
import { GoogleGenAI } from '@google/genai'

export class AIService {
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

  static async generateSummary (text: string): Promise<string> {
    try {
      console.log(`[AIService] Generating summary for text (length: ${text.length})...`)
      const ai = this.getAI()
      const prompt = `Por favor, proporciona un resumen en español, punto por punto (usando viñetas), del siguiente texto:\n\n${text}`

      const response = await ai.models.generateContent({
        model: this.getModelName(),
        contents: [{ text: prompt }]
      })

      if (response.text === undefined) {
        throw new Error('Failed to generate summary')
      }
      const summary = String(response.text)
      console.log(`[AIService] Summary generated successfully (length: ${summary.length}).`)
      return summary
    } catch (error) {
      console.error('Error in AIService:', error)
      if (error instanceof Error && error.message === 'GEMINI_API_KEY is not set') {
        throw error
      }
      throw new Error('Failed to perform AI operation')
    }
  }

  static async summarizeVideo (url: string): Promise<string> {
    try {
      console.log(`[AIService] Generating summary for video: ${url}...`)
      const ai = this.getAI()
      const contents = [
        {
          fileData: {
            fileUri: url
          }
        },
        { text: 'Por favor, proporciona un resumen en español, punto por punto (usando viñetas), de este vídeo de YouTube.' }
      ]

      const response = await ai.models.generateContent({
        model: this.getModelName(),
        contents
      })

      if (response.text === undefined) {
        throw new Error('Failed to generate video summary')
      }
      const summary = String(response.text)
      console.log(`[AIService] Video summary generated successfully (length: ${summary.length}).`)
      return summary
    } catch (error) {
      console.error('Error in AIService:', error)
      if (error instanceof Error && error.message === 'GEMINI_API_KEY is not set') {
        throw error
      }
      throw new Error('Failed to perform AI operation')
    }
  }

  static async chat (context: string, history: Array<{ role: 'user' | 'model', content: string }>, message: string): Promise<string> {
    try {
      const ai = this.getAI()

      // Build chat history in new format
      const contents = [
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

      console.log(`[AIService] Sending chat message. History length: ${history.length} messages.`)
      const response = await ai.models.generateContent({
        model: this.getModelName(),
        contents
      })

      if (response.text === undefined) {
        throw new Error('Failed to chat')
      }
      const answer = String(response.text)
      console.log(`[AIService] Chat response received (length: ${answer.length}).`)
      return answer
    } catch (error) {
      console.error('Error in AIService:', error)
      if (error instanceof Error && error.message === 'GEMINI_API_KEY is not set') {
        throw error
      }
      throw new Error('Failed to perform AI operation')
    }
  }

  static async chatWithVideo (url: string, history: Array<{ role: 'user' | 'model', content: string }>, message: string): Promise<string> {
    try {
      const ai = this.getAI()

      // Build chat history with video context in new format
      const contents = [
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

      console.log(`[AIService] Sending chat message with video context. History length: ${history.length} messages.`)
      const response = await ai.models.generateContent({
        model: this.getModelName(),
        contents
      })

      if (response.text === undefined) {
        throw new Error('Failed to chat with video')
      }
      const answer = String(response.text)
      console.log(`[AIService] Chat response received (length: ${answer.length}).`)
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
