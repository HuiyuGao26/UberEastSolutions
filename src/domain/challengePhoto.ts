import type { ChallengePhoto } from './types'

const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_EDGE = 1280
const MAX_STORED_CHARACTERS = 700_000

/** Validate and resize one photo before storing it alongside a local challenge. */
export async function prepareChallengePhoto(file: File): Promise<ChallengePhoto> {
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    throw new Error('Choose a JPEG or PNG photo.')
  }
  if (file.size > MAX_FILE_BYTES) throw new Error('Choose a photo no larger than 5 MB.')

  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    try {
      await image.decode()
    } catch {
      throw new Error('This photo could not be opened. Choose another JPEG or PNG photo.')
    }
    const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Photo preview is unavailable. Please try another browser.')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    for (const quality of [0.8, 0.65, 0.5, 0.35]) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      if (dataUrl.startsWith('data:image/jpeg;') && dataUrl.length <= MAX_STORED_CHARACTERS) {
        return { name: file.name, dataUrl }
      }
    }
    throw new Error('This photo is too detailed to save. Choose a smaller photo.')
  } finally {
    URL.revokeObjectURL(url)
  }
}
