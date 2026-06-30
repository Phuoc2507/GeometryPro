type BWOptions = {
  /** Treat more pixels as background when luminance is above this threshold. */
  backgroundLuminance?: number;
  /** Edge threshold (0-255-ish). Larger = fewer edges become black. */
  edgeThreshold?: number;
};

/**
 * Converts an ImageData to high-contrast black & white.
 * Goal: keep geometry lines visible even if they're bright on-screen.
 */
export function convertToHighContrastBW(
  imageData: ImageData,
  options: BWOptions = {}
): ImageData {
  const { width, height, data } = imageData;
  const bgLum = options.backgroundLuminance ?? 210;
  const edgeT = options.edgeThreshold ?? 28;

  const lum = new Float32Array(width * height);

  // Precompute luminance
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    lum[p] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  const getLum = (x: number, y: number) => lum[y * width + x];

  // Edge-based + alpha-based classification
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // Treat transparent as background.
      if (a < 40) {
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = 255;
        continue;
      }

      const l = getLum(x, y);

      // Heuristic to drop colorful grid-ish pixels.
      const maxRGB = Math.max(r, g, b);
      const minRGB = Math.min(r, g, b);
      const saturation = maxRGB > 0 ? (maxRGB - minRGB) / maxRGB : 0;
      const isGridLike = saturation > 0.12 && l > 40 && l < 150;

      // Simple edge magnitude (central diff) on luminance.
      const x0 = Math.max(0, x - 1);
      const x1 = Math.min(width - 1, x + 1);
      const y0 = Math.max(0, y - 1);
      const y1 = Math.min(height - 1, y + 1);

      const gx = getLum(x1, y) - getLum(x0, y);
      const gy = getLum(x, y1) - getLum(x, y0);
      const edge = Math.abs(gx) + Math.abs(gy);

      // Keep either dark ink OR strong edges (captures bright lines too).
      const isInk = !isGridLike && (l < bgLum || edge > edgeT);
      const bw = isInk ? 0 : 255;

      data[idx] = bw;
      data[idx + 1] = bw;
      data[idx + 2] = bw;
      data[idx + 3] = 255;
    }
  }

  return imageData;
}
