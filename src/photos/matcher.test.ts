import { findBestPhotoForTopic } from './matcher';
import { join } from 'path';

// Mock the GoogleGenerativeAI module
jest.mock('@google/generative-ai');

// Mock fs/promises
jest.mock('fs/promises');
const { readdir, stat, readFile } = require('fs/promises');

describe('findBestPhotoForTopic', () => {
  const topic = 'test topic';
  const watchedUploadsDir = join(process.cwd(), 'assets');

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY='***';
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  it('returns null when no images in directory', async () => {
    readdir.mockResolvedValueOnce([]);

    const result = await findBestPhotoForTopic(topic);
    expect(result).toBeNull();
  });

  it('returns null when no image files (non-image files only)', async () => {
    readdir.mockResolvedValueOnce(['document.txt', 'data.csv']);
    stat.mockImplementation(() => Promise.resolve({ isFile: () => true }));

    const result = await findBestPhotoForTopic(topic);
    expect(result).toBeNull();
  });

  it('returns the path of the highest scoring image when score >=65', async () => {
    const image1 = join(watchedUploadsDir, 'image1.jpg');
    const image2 = join(watchedUploadsDir, 'image2.png');
    readdir.mockResolvedValueOnce(['image1.jpg', 'image2.png']);
    stat.mockImplementation(() => Promise.resolve({ isFile: () => true }));

    readFile.mockResolvedValueOnce(Buffer.from('fake image data 1'));
    readFile.mockResolvedValueOnce(Buffer.from('fake image data 2'));

    // Mock the GoogleGenerativeAI
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const mockGenerateContent = jest.fn();
    mockGenerateContent
      .mockResolvedValueOnce({
        response: {
          text: () => '70',
        },
      }) // for image1
      .mockResolvedValueOnce({
        response: {
          text: () => '80',
        },
      }); // for image2

    GoogleGenerativeAI.mockImplementation(() => {
      return {
        getGenerativeModel: () => ({
          generateContent: mockGenerateContent,
        }),
      };
    });

    const result = await findBestPhotoForTopic(topic);
    expect(result).toBe(image2); // higher score
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('returns null when all scores are below 65', async () => {
    const image1 = join(watchedUploadsDir, 'image1.jpg');
    readdir.mockResolvedValueOnce(['image1.jpg']);
    stat.mockImplementation(() => Promise.resolve({ isFile: () => true }));
    readFile.mockResolvedValueOnce(Buffer.from('fake image data'));

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const mockGenerateContent = jest.fn();
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => '60',
      },
    });

    GoogleGenerativeAI.mockImplementation(() => {
      return {
        getGenerativeModel: () => ({
          generateContent: mockGenerateContent,
        }),
      };
    });

    const result = await findBestPhotoForTopic(topic);
    expect(result).toBeNull();
  });

  it('handles errors during image processing and continues', async () => {
    const image1 = join(watchedUploadsDir, 'image1.jpg');
    const image2 = join(watchedUploadsDir, 'image2.png');
    readdir.mockResolvedValueOnce(['image1.jpg', 'image2.png']);
    stat.mockImplementation(() => Promise.resolve({ isFile: () => true }));

    // First image throws an error on readFile
    readFile.mockRejectedValueOnce(new Error('Read error'));
    // Second image succeeds
    readFile.mockResolvedValueOnce(Buffer.from('fake image data 2'));

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const mockGenerateContent = jest.fn();
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => '70',
      },
    });

    GoogleGenerativeAI.mockImplementation(() => {
      return {
        getGenerativeModel: () => ({
          generateContent: mockGenerateContent,
        }),
      };
    });

    const result = await findBestPhotoForTopic(topic);
    expect(result).toBe(image2);
    expect(readFile).toHaveBeenCalledTimes(2);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1); // only for the second image
  });

  it('returns null when Gemini API throws an error', async () => {
    const image1 = join(watchedUploadsDir, 'image1.jpg');
    readdir.mockResolvedValueOnce(['image1.jpg']);
    stat.mockImplementation(() => Promise.resolve({ isFile: () => true }));
    readFile.mockResolvedValueOnce(Buffer.from('fake image data'));

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const mockGenerateContent = jest.fn();
    mockGenerateContent.mockRejectedValueOnce(new Error('API error'));

    GoogleGenerativeAI.mockImplementation(() => {
      return {
        getGenerativeModel: () => ({
          generateContent: mockGenerateContent,
        }),
      };
    });

    const result = await findBestPhotoForTopic(topic);
    expect(result).toBeNull();
  });
});
