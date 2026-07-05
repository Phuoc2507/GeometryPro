type BWOptions = {
  /** Treat more pixels as background when luminance is above this threshold. */
  backgroundLuminance?: number;
  /** Edge threshold (0-255-ish). Larger = fewer edges become black. */
  edgeThreshold?: number;
};

/**
 * Converts an ImageData to grayscale while boosting contrast.
 * Preserves anti-aliasing (smooth edges) instead of using a hard binary threshold.
 */
export function convertToHighContrastBW(
  imageData: ImageData,
  options: BWOptions = {}
): ImageData {
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Calculate luminance
    let l = 0.299 * r + 0.587 * g + 0.114 * b;

    // Boost contrast to make lines darker and background cleaner,
    // while preserving the intermediate gray values for anti-aliasing.
    if (l < 220) {
      // Darken the lines to make them pop
      l = Math.max(0, l - 50); 
    } else {
      // Clean up off-white backgrounds to pure white
      l = 255; 
    }

    data[i] = l;     // R
    data[i + 1] = l; // G
    data[i + 2] = l; // B
    // Alpha remains unchanged (already blended with white background)
  }

  return imageData;
}
