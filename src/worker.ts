import { Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { TOPICS } from '@brand-os/contracts';
import { bootstrapCarouselStudio, type RoutedJobEvent } from './index';

export interface CarouselStudioWorkerOptions {
  redisUrl: string;
}

export class CarouselStudioWorker {
  private connection: IORedis;
  private worker: Worker | null = null;

  constructor(opts: CarouselStudioWorkerOptions) {
    this.connection = new IORedis(opts.redisUrl, { maxRetriesPerRequest: null });
  }

  start(): void {
    this.worker = new Worker(
      TOPICS.CAROUSEL_JOBS,
      (job: Job) => bootstrapCarouselStudio(job.data as RoutedJobEvent),
      { connection: this.connection },
    );
    this.worker.on('failed', (job, err) => {
      console.error(`[carousel-studio-worker] job failed id=${job?.id ?? 'unknown'} error=${err.message}`);
    });
  }

  async shutdown(): Promise<void> {
    if (this.worker !== null) {
      await this.worker.close();
    }
    this.connection.disconnect();
  }
}

if (require.main === module) {
  const worker = new CarouselStudioWorker({ redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379' });
  worker.start();
}
