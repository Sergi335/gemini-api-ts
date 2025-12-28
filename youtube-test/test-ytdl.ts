
import ytdl from '@distube/ytdl-core'
import fs from 'fs'
import path from 'path'

const VIDEO_ID = 'Z0yCMsgtXfA'
const URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`

function log(message: string) {
  console.log(message)
  fs.appendFileSync(path.join(__dirname, 'results_ytdl.txt'), message + '\n')
}

async function testYtdl() {
  log(`\n--- Testing @distube/ytdl-core for ${VIDEO_ID} ---`)
  try {
    const filePath = path.join(__dirname, `test_ytdl.m4a`)
    const fileStream = fs.createWriteStream(filePath)

    log(`[YTDL] Starting download for ${URL}...`)
    
    await new Promise((resolve, reject) => {
      ytdl(URL, { 
        filter: 'audioonly',
        quality: 'highestaudio'
      })
      .pipe(fileStream)
      .on('finish', () => {
        log(`[YTDL] SUCCESS! Saved to ${filePath}`)
        resolve(true)
      })
      .on('error', (err) => {
        log(`[YTDL] FAILED: ${err.message}`)
        reject(err)
      })
    })
  } catch (error) {
    // console.error already logged in .on('error')
  }
}

fs.writeFileSync(path.join(__dirname, 'results_ytdl.txt'), 'Starting YTDL Tests...\n')
testYtdl().catch(console.error)
