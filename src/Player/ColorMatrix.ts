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
    img.crossOrigin = "Anonymous"; // Ensure proper CORS handling
    img.src = imageUrl;

    img.onload = () => {
      // Downscale image to 100x100 for speed
      const downscaleWidth = 100;
      const downscaleHeight = 100;
      const canvas = document.createElement("canvas");
      canvas.width = downscaleWidth;
      canvas.height = downscaleHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("Unable to get canvas context");

      ctx.drawImage(img, 0, 0, downscaleWidth, downscaleHeight);
      const { data } = ctx.getImageData(0, 0, downscaleWidth, downscaleHeight);

      // Collect valid pixels: ignore nearly transparent and near-white pixels
      const pixels: [number, number, number][] = [];
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha < 128) continue;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r > 250 && g > 250 && b > 250) continue;
        pixels.push([r, g, b]);
      }

      if (pixels.length === 0) return reject("No valid pixels found");

      // K-means clustering parameters
      const k = 3; // Number of clusters
      const maxIterations = 10;

      // Initialize centroids randomly from pixels
      let centroids: [number, number, number][] = [];
      for (let i = 0; i < k; i++) {
        centroids.push(pixels[Math.floor(Math.random() * pixels.length)]);
      }

      let clusters: number[][] = [];
      for (let iter = 0; iter < maxIterations; iter++) {
        // Reset clusters
        clusters = Array.from({ length: k }, () => []);
        // Assign each pixel to the nearest centroid
        pixels.forEach((pixel, idx) => {
          let minDist = Infinity;
          let bestCluster = 0;
          centroids.forEach((centroid, clusterIdx) => {
            const dist = Math.sqrt(
              Math.pow(pixel[0] - centroid[0], 2) +
                Math.pow(pixel[1] - centroid[1], 2) +
                Math.pow(pixel[2] - centroid[2], 2)
            );
            if (dist < minDist) {
              minDist = dist;
              bestCluster = clusterIdx;
            }
          });
          clusters[bestCluster].push(idx);
        });

        // Update centroids based on the clusters
        let converged = true;
        for (let clusterIdx = 0; clusterIdx < k; clusterIdx++) {
          const cluster = clusters[clusterIdx];
          if (cluster.length === 0) continue; // Avoid empty cluster

          let sumR = 0,
            sumG = 0,
            sumB = 0;
          cluster.forEach((idx) => {
            const [r, g, b] = pixels[idx];
            sumR += r;
            sumG += g;
            sumB += b;
          });
          const newCentroid: [number, number, number] = [
            sumR / cluster.length,
            sumG / cluster.length,
            sumB / cluster.length,
          ];
          // Check if the centroid moved significantly
          if (
            Math.abs(newCentroid[0] - centroids[clusterIdx][0]) > 1 ||
            Math.abs(newCentroid[1] - centroids[clusterIdx][1]) > 1 ||
            Math.abs(newCentroid[2] - centroids[clusterIdx][2]) > 1
          ) {
            converged = false;
          }
          centroids[clusterIdx] = newCentroid;
        }
        if (converged) break;
      }

      // Select the largest cluster as the dominant color
      let dominantClusterIndex = 0;
      let maxClusterSize = 0;
      for (let i = 0; i < k; i++) {
        if (clusters[i].length > maxClusterSize) {
          maxClusterSize = clusters[i].length;
          dominantClusterIndex = i;
        }
      }

      const [rDominant, gDominant, bDominant] = centroids[dominantClusterIndex];
      const hexColor =
        "#" +
        Math.round(rDominant).toString(16).padStart(2, "0") +
        Math.round(gDominant).toString(16).padStart(2, "0") +
        Math.round(bDominant).toString(16).padStart(2, "0");

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
