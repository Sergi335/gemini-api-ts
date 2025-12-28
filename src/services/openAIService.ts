/* eslint-disable @typescript-eslint/no-extraneous-class */
import OpenAI from 'openai'
import fs from 'fs'

export class OpenAIService {
  private static getClient (): OpenAI {
    const apiKey = process.env.OPENAI_API_KEY
    if (typeof apiKey !== 'string' || apiKey === '') {
      throw new Error('OPENAI_API_KEY is not set')
    }
    return new OpenAI({ apiKey })
  }

  static async transcribe (filePath: string): Promise<string> {
    try {
      console.log(`[OpenAIService] Transcribing file: ${filePath}`)
      const openai = this.getClient()

      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: 'whisper-1'
      })

      console.log(`[OpenAIService] Transcription complete. Length: ${String(transcription.text.length)} characters.`)
      return transcription.text
    } catch (error) {
      console.error('[OpenAIService] Error transcribing audio:', error)
      throw new Error(`Failed to transcribe audio: ${(error as Error).message}`)
    }
  }
}
