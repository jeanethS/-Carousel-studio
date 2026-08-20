const mockWorkerClose = jest.fn().mockResolvedValue(undefined);
const mockWorkerOn = jest.fn();
const mockWorkerCtor = jest.fn().mockImplementation(() => ({ close: mockWorkerClose, on: mockWorkerOn }));
jest.mock('bullmq', () => ({ Worker: mockWorkerCtor }));

const mockDisconnect = jest.fn();
jest.mock('ioredis', () => jest.fn().mockImplementation(() => ({ disconnect: mockDisconnect })));

const mockBootstrap = jest.fn().mockResolvedValue(undefined);
jest.mock('./index', () => ({ bootstrapCarouselStudio: mockBootstrap }));

import { TOPICS } from '@brand-os/contracts';
import { CarouselStudioWorker } from './worker';
import type { RoutedJobEvent } from './index';

function makeEvent(): RoutedJobEvent {
  return {
    jobId: 'job1',
    clusterId: 'cluster1',
    topic: 'AI agents',
    platform: 'linkedin',
    hookHeadline: 'Hook',
    slides: [{ slideNumber: 1, headline: 'Cover', bodyText: undefined, dataPoint: undefined, visualCue: undefined }],
    ctaText: 'Save this',
    handleOrProfile: '@jeaneth',
  };
}

describe('CarouselStudioWorker', () => {
  beforeEach(() => {
    mockWorkerCtor.mockClear();
    mockBootstrap.mockClear();
  });

  it('starts a worker on the carousel.jobs queue', () => {
    const worker = new CarouselStudioWorker({ redisUrl: 'redis://mock:6379' });
    worker.start();
    expect(mockWorkerCtor).toHaveBeenCalledWith(TOPICS.CAROUSEL_JOBS, expect.any(Function), expect.any(Object));
  });

  it('calls bootstrapCarouselStudio with the job data', async () => {
    const worker = new CarouselStudioWorker({ redisUrl: 'redis://mock:6379' });
    worker.start();
    const handler = mockWorkerCtor.mock.calls[0]![1] as (job: { data: RoutedJobEvent }) => Promise<void>;
    const event = makeEvent();

    await handler({ data: event });

    expect(mockBootstrap).toHaveBeenCalledWith(event);
  });

  it('shutdown() closes the worker and disconnects redis', async () => {
    const worker = new CarouselStudioWorker({ redisUrl: 'redis://mock:6379' });
    worker.start();
    await worker.shutdown();
    expect(mockWorkerClose).toHaveBeenCalled();
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it("'failed' event callback logs error", () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const worker = new CarouselStudioWorker({ redisUrl: 'redis://mock:6379' });
      worker.start();
      const failedCb = mockWorkerOn.mock.calls.find((c: unknown[]) => c[0] === 'failed')![1] as (job: unknown, err: Error) => void;
      failedCb({ id: 'j1' }, new Error('boom'));
      expect(consoleErrorSpy).toHaveBeenCalledWith('[carousel-studio-worker] job failed id=j1 error=boom');
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
