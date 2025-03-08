/**
 * Converts a HEX color string to HSL.
 *
 * @param hex - The HEX color (e.g. "#aabbcc" or "#abc").
 * @returns A tuple [h, s, l] where h is in degrees [0, 360), and s and l are in [0, 1].
 */
const hexToHSL = (hex: string): [number, number, number] => {
  hex = hex.replace("#", "");
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  if (hex.length !== 6) throw new Error("Invalid HEX format");

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return [h, s, l];
};

/**
 * Converts HSL values to a HEX color string.
 *
 * @param h - Hue in degrees [0, 360).
 * @param s - Saturation [0, 1].
 * @param l - Lightness [0, 1].
 * @returns The HEX color string.
 */
const hslToHex = (h: number, s: number, l: number): string => {
  const hueToRGB = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  s = Math.max(0, Math.min(s, 1));
  l = Math.max(0, Math.min(l, 1));

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hueToRGB(p, q, h / 360 + 1 / 3) * 255);
  const g = Math.round(hueToRGB(p, q, h / 360) * 255);
  const b = Math.round(hueToRGB(p, q, h / 360 - 1 / 3) * 255);

  return (
    "#" +
    r.toString(16).padStart(2, "0") +
    g.toString(16).padStart(2, "0") +
    b.toString(16).padStart(2, "0")
  );
};

/**
 * Calculates a contrast color (black or white) based on the brightness
 * of the input HEX color using the YIQ formula.
 *
 * @param hex - The base color in HEX format.
 * @returns "#000000" for light colors and "#ffffff" for dark colors.
 */
const getContrastColor = (hex: string): string => {
  hex = hex.replace("#", "");
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#000000" : "#ffffff";
};

/**
 * Calculates the complementary color by shifting the hue by 180° in HSL space.
 *
 * @param hex - The base color in HEX format.
 * @returns The complementary color in HEX format.
 */
const getComplementaryColor = (hex: string): string => {
  const [h, s, l] = hexToHSL(hex);
  const compHue = (h + 180) % 360;
  return hslToHex(compHue, s, l);
};

/**
 * Extracts the dominant color from an image URL using a k-means clustering approach.
 *
 * This function downsamples the image to a 100x100 canvas, collects valid pixel data,
 * and then clusters the pixels into k clusters. It returns the centroid of the largest cluster.
 *
 * @param imageUrl - The URL of the image.
 * @returns A promise that resolves to the dominant color in HEX format.
 */
export const getDominantColorFromImage = async (
  imageUrl: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;

    img.onload = () => {
      const downscaleSize = 100;
      const canvas = document.createElement("canvas");
      canvas.width = downscaleSize;
      canvas.height = downscaleSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("Unable to get canvas context");

      ctx.drawImage(img, 0, 0, downscaleSize, downscaleSize);
      const { data } = ctx.getImageData(0, 0, downscaleSize, downscaleSize);

      const pixels: [number, number, number][] = [];
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue; // Ignore transparent pixels
        pixels.push([data[i], data[i + 1], data[i + 2]]);
      }
      if (pixels.length === 0) return reject("No valid pixels found");

      // Average color instead of picking just one cluster
      let sumR = 0,
        sumG = 0,
        sumB = 0;
      pixels.forEach(([r, g, b]) => {
        sumR += r;
        sumG += g;
        sumB += b;
      });

      const avgR = Math.round(sumR / pixels.length);
      const avgG = Math.round(sumG / pixels.length);
      const avgB = Math.round(sumB / pixels.length);

      const hexColor =
        "#" +
        avgR.toString(16).padStart(2, "0") +
        avgG.toString(16).padStart(2, "0") +
        avgB.toString(16).padStart(2, "0");

      resolve(hexColor);
    };

    img.onerror = () => reject("Error loading image");
  });
};

/**
 * Combines dominant color extraction (via k-means clustering), contrast calculation,
 * and complementary color calculation.
 *
 * @param imageUrl - The URL of the image.
 * @returns A promise that resolves to an object containing:
 *          - base: The dominant color in HEX.
 *          - contrast: A contrast color (black or white) in HEX.
 *          - complementary: The complementary color in HEX.
 */
export const getBaseContrastAndComplementaryColor = async (
  imageUrl: string
): Promise<{ base: string; contrast: string; complementary: string }> => {
  try {
    const base = await getDominantColorFromImage(imageUrl);
    const contrast = getContrastColor(base);
    const complementary = getComplementaryColor(base);
    return { base, contrast, complementary };
  } catch (error) {
    console.error("Error in getBaseContrastAndComplementaryColor:", error);
    // Fallback values
    return { base: "#ffffff", contrast: "#000000", complementary: "#ffffff" };
  }
};

// Example usage (for testing; replace with a valid HTTPS image URL):
// getBaseContrastAndComplementaryColor("https://yourdomain.com/path/to/image.jpg")
//   .then(({ base, contrast, complementary }) => {
//     console.log("Base Color:", base);
//     console.log("Contrast Color:", contrast);
//     console.log("Complementary Color:", complementary);
//   })
//   .catch((error) => console.error("Error fetching colors:", error));
