import { passesDeduplicationCheck, bootstrapCarouselStudio } from './index';
import { execFile } from 'child_process';

jest.mock('child_process');

const execFileMock = execFile as unknown as jest.Mock;

describe('passesDeduplicationCheck', () => {
  const clusterId = 'test-cluster-001';
  const fingerprint = 'abc123hash';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when the Python service reports duplicate: true', async () => {
    execFileMock.mockImplementation((_cmd, _args, cb: (err: Error | null, stdout: string) => void) => {
      cb(null, JSON.stringify({ duplicate: true }));
    });

    const result = await passesDeduplicationCheck(clusterId, fingerprint);
    expect(result).toBe(false);
  });

  it('returns true when the Python service reports duplicate: false', async () => {
    execFileMock.mockImplementation((_cmd, _args, cb: (err: Error | null, stdout: string) => void) => {
      cb(null, JSON.stringify({ duplicate: false }));
    });

    const result = await passesDeduplicationCheck(clusterId, fingerprint);
    expect(result).toBe(true);
  });

  it('calls execFile with python and the correct arguments', async () => {
    execFileMock.mockImplementation((_cmd, _args, cb: (err: Error | null, stdout: string) => void) => {
      cb(null, JSON.stringify({ duplicate: false }));
    });

    await passesDeduplicationCheck(clusterId, fingerprint);

    expect(execFileMock).toHaveBeenCalledWith(
      'python',
      ['path/to/dedup_service.py', clusterId, fingerprint],
      expect.any(Function)
    );
  });

  it('rejects when execFile encounters an error', async () => {
    execFileMock.mockImplementation((_cmd, _args, cb: (err: Error | null, stdout: string) => void) => {
      cb(new Error('Python process crashed'), '');
    });

    await expect(passesDeduplicationCheck(clusterId, fingerprint)).rejects.toThrow('Python process crashed');
  });

  it('rejects when stdout is not valid JSON', async () => {
    execFileMock.mockImplementation((_cmd, _args, cb: (err: Error | null, stdout: string) => void) => {
      cb(null, 'not-json');
    });

    await expect(passesDeduplicationCheck(clusterId, fingerprint)).rejects.toThrow();
  });
});

describe('bootstrapCarouselStudio boundary validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects an invalid payload (bad platform) before any I/O', async () => {
    const invalid = {
      jobId: 'x',
      clusterId: 'c',
      topic: 't',
      platform: 'tiktok', // unsupported
      hookHeadline: 'h',
      slides: [{ slideNumber: 1, headline: 's' }],
      ctaText: 'c',
      handleOrProfile: '@x',
    };
    await expect(bootstrapCarouselStudio(invalid as never)).rejects.toThrow();
    // Validation runs first — dedup must NOT have been reached.
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it('rejects an empty slides array before any I/O', async () => {
    const invalid = {
      jobId: 'x',
      clusterId: 'c',
      topic: 't',
      platform: 'instagram',
      hookHeadline: 'h',
      slides: [],
      ctaText: 'c',
      handleOrProfile: '@x',
    };
    await expect(bootstrapCarouselStudio(invalid as never)).rejects.toThrow();
    expect(execFileMock).not.toHaveBeenCalled();
  });
});
