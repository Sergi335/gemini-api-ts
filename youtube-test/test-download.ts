import { Innertube, UniversalCache } from 'youtubei.js'
import fs from 'fs'
import path from 'path'

const VIDEO_ID = 'Z0yCMsgtXfA' // The new test video


function log(message: string) {
  console.log(message)
  fs.appendFileSync(path.join(__dirname, 'results.txt'), message + '\n')
}

async function testClient(clientName: any) {
  log(`\n--- Testing Client: ${clientName} ---`)
  try {
    const innertube = await Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true
    })

    log(`[${clientName}] Fetching info...`)
    const info = await innertube.getInfo(VIDEO_ID, { client: clientName })
    log(`[${clientName}] Title: ${String(info.basic_info.title)}`)

    log(`[${clientName}] Attempting download...`)
    const stream = await info.download({
      type: 'audio',
      quality: 'best',
      format: 'mp4'
    })

    const filePath = path.join(__dirname, `test_${clientName}.m4a`)
    const fileStream = fs.createWriteStream(filePath)

    for await (const chunk of stream) {
      fileStream.write(chunk)
    }
    fileStream.end()

    log(`[${clientName}] SUCCESS! Saved to ${filePath}`)
  } catch (error) {
    log(`[${clientName}] FAILED: ${(error as Error).message}`)
  }
}

async function runTests() {
  fs.writeFileSync(path.join(__dirname, 'results.txt'), `Starting Tests for ${VIDEO_ID}...\n`)
  await testClient('IOS')
  await testClient('ANDROID')
  await testClient('WEB')
  await testClient('YTMUSIC')
}

runTests().catch(console.error)
