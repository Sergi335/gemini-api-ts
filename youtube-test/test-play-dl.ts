
import play from 'play-dl'
import fs from 'fs'
import path from 'path'

const VIDEO_ID = 'Z0yCMsgtXfA'
const URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`

function log(message: string) {
  console.log(message)
  fs.appendFileSync(path.join(__dirname, 'results_playdl.txt'), message + '\n')
}

async function testPlayDl() {
  log(`\n--- Testing play-dl for ${VIDEO_ID} ---`)
  try {
    log(`[PLAY-DL] Searching stream for ${URL}...`)
    
    // play-dl usually handles deciphering internally
    const stream = await play.video_info(URL)
    log(`[PLAY-DL] Title: ${stream.video_details.title}`)
    
    const audioStream = await play.stream(URL, { quality: 1 }) // quality 1 is usually audio
    
    const filePath = path.join(__dirname, `test_playdl.m4a`)
    const fileStream = fs.createWriteStream(filePath)
    
    audioStream.stream.pipe(fileStream)
    
    await new Promise((resolve, reject) => {
      fileStream.on('finish', () => {
        log(`[PLAY-DL] SUCCESS! Saved to ${filePath}`)
        resolve(true)
      })
      fileStream.on('error', (err) => {
        log(`[PLAY-DL] FAILED on stream: ${err.message}`)
        reject(err)
      })
    })
  } catch (error) {
    log(`[PLAY-DL] FAILED: ${(error as Error).message}`)
  }
}

fs.writeFileSync(path.join(__dirname, 'results_playdl.txt'), 'Starting Play-DL Tests...\n')
testPlayDl().catch(console.error)
