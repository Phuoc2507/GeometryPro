export function downloadBlob(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = fileName;
  link.href = objectUrl;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Give the browser time to take ownership of the URL before revoking it.
  // Revoking in the same task is racy in Safari and for larger PNG/video blobs.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error(`Cannot encode canvas as ${type}`));
    }, type);
  });
}
