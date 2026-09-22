/** Hands the browser a file to save under the given name. */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Safari and older Firefox start the blob download asynchronously, so
  // revoking the object URL in the same task can cancel it before the
  // browser has read the data. Deferring to the next task gives it time.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
