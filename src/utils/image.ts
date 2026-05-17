export function compressImage(
  file: File,
  maxDim = 1600,
  quality = 0.85,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const { naturalWidth: w, naturalHeight: h } = img
      const scale = Math.min(1, maxDim / Math.max(w, h))
      const cw = Math.max(1, Math.round(w * scale))
      const ch = Math.max(1, Math.round(h * scale))

      const canvas = document.createElement('canvas')
      canvas.width = cw
      canvas.height = ch
      canvas.getContext('2d')!.drawImage(img, 0, 0, cw, ch)

      canvas.toBlob(
        blob =>
          blob
            ? resolve(blob)
            : reject(new Error('Kompresja obrazu nie powiodła się')),
        'image/jpeg',
        quality,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Nie można wczytać obrazu'))
    }

    img.src = objectUrl
  })
}
