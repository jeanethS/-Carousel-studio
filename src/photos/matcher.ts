import { GoogleGenerativeAI } from '@google/generative-ai';
import { readdir, stat } from 'fs/promises';
import { join, extname } from 'path';
import { assetsDir } from '../utils/paths';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp']);

export async function findBestPhotoForTopic(topic: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const picturesDir = assetsDir();
  let files: string[];
  try {
    const entries = await readdir(picturesDir);
    files = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(picturesDir, entry);
        const stats = await stat(fullPath);
        return stats.isFile() ? fullPath : null;
      })
    ).then((results) => results.filter((path): path is string => path !== null));
  } catch (error) {
    // If directory doesn't exist or other error, treat as no images
    return null;
  }

  // Filter for image files
  const imageFiles = files.filter((file) => {
    const ext = extname(file).toLowerCase();
    return IMAGE_EXTENSIONS.has(ext);
  });

  if (imageFiles.length === 0) {
    return null;
  }

  let bestPath: string | null = null;
  let bestScore = -1;

  for (const imagePath of imageFiles) {
    try {
      // In a real implementation, we would pass the image to Gemini.
      // For the purpose of this task, we'll simulate by reading the image as base64?
      // However, the Gemini SDK expects a file or base64 encoded image.
      // We'll load the image as base64.
      const { readFile } = await import('fs/promises');
      const imageBuffer = await readFile(imagePath);
      const imageBase64 = imageBuffer.toString('base64');

      // Determine MIME type based on extension
      const ext = extname(imagePath).toLowerCase();
      let mimeType: string;
      switch (ext) {
        case '.jpg':
        case '.jpeg':
          mimeType = 'image/jpeg';
          break;
        case '.png':
          mimeType = 'image/png';
          break;
        case '.webp':
          mimeType = 'image/webp';
          break;
        case '.gif':
          mimeType = 'image/gif';
          break;
        case '.bmp':
          mimeType = 'image/bmp';
          break;
        default:
          mimeType = 'application/octet-stream';
      }

      const result = await model.generateContent([
        `On a scale of 0-100, how well does this image match the topic: "${topic}"? Respond with only a number.`,
        {
          inlineData: {
            data: imageBase64,
            mimeType,
          },
        },
      ]);
      const response = await result.response;
      const text = response.text();
      const score = parseInt(text.trim(), 10);

      if (!isNaN(score) && score >= 65 && score > bestScore) {
        bestScore = score;
        bestPath = imagePath;
      }
    } catch (error) {
      // Log error and continue with other images
      console.error(`Error processing image ${imagePath}:`, error);
      continue;
    }
  }

  return bestScore >= 65 ? bestPath : null;
}
