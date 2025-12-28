/* eslint-disable @typescript-eslint/no-extraneous-class */
import { Content, GoogleGenerativeAI } from '@google/generative-ai'

export class AIService {
  private static getModel (): any {
    const apiKey = process.env.GEMINI_API_KEY
    if (typeof apiKey !== 'string' || apiKey === '') {
      throw new Error('GEMINI_API_KEY is not set')
    }
    const genAI = new GoogleGenerativeAI(apiKey)
    return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  }

  static async generateSummary (text: string): Promise<string> {
    try {
      console.log(`[AIService] Generating summary for text (length: ${text.length})...`)
      const model = this.getModel()
      const prompt = `Please provide a concise summary of the following text:\n\n${text}`
      const result = await model.generateContent(prompt)
      const response = await result.response
      const summary = String(response.text())
      console.log(`[AIService] Summary generated successfully (length: ${summary.length}).`)
      return summary
    } catch (error) {
      console.error('Error generating summary:', error)
      throw new Error('Failed to generate summary')
    }
  }

  static async chat (context: string, history: Array<{ role: 'user' | 'model', content: string }>, message: string): Promise<string> {
    try {
      const model = this.getModel()

      // Convert internal history format to Gemini format
      const chatHistory: Content[] = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }))

      const chat = model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: `Here is the context for our conversation:\n\n${context}` }]
          },
          {
            role: 'model',
            parts: [{ text: 'Understood. I will answer questions based on this context.' }]
          },
          ...chatHistory
        ]
      })

      console.log(`[AIService] Sending chat message. History length: ${history.length} messages.`)
      const result = await chat.sendMessage(message)
      const response = await result.response
      const answer = String(response.text())
      console.log(`[AIService] Chat response received (length: ${answer.length}).`)
      return answer
    } catch (error) {
      console.error('Error in chat:', error)
      throw new Error('Failed to chat')
    }
  }
}
