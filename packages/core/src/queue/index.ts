/**
 * Omni Queue - Background job processing
 * 
 * Provides a unified API for dispatching and processing background jobs
 * with support for multiple backends (in-memory, Redis, database, etc.)
 */

// Types
export interface QueueConfig {
    driver: 'memory' | 'redis' | 'database';
    defaultQueue?: string;
    concurrency?: number;
    redis?: {
        host: string;
        port: number;
        password?: string;
        db?: number;
    };
}

export interface JobOptions {
    queue?: string;
    delay?: number;       // Delay in ms before processing
    priority?: number;    // Higher = processed first
    attempts?: number;    // Max retry attempts
    backoff?: number;     // Backoff delay between retries in ms
    timeout?: number;     // Max execution time in ms
}

export interface Job<T = any> {
    id: string;
    name: string;
    data: T;
    queue: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    attempts: number;
    maxAttempts: number;
    createdAt: Date;
    processedAt?: Date;
    completedAt?: Date;
    failedAt?: Date;
    error?: string;
}

export type JobHandler<T = any> = (job: Job<T>) => Promise<void>;

// Job registry
const jobHandlers = new Map<string, JobHandler>();
const pendingJobs: Job[] = [];

let queueConfig: QueueConfig = {
    driver: 'memory',
    defaultQueue: 'default',
    concurrency: 1,
};

/**
 * Configure the queue system
 */
export function configureQueue(config: QueueConfig): void {
    queueConfig = { ...queueConfig, ...config };
}

/**
 * Define a job handler
 */
export function defineJob<T = any>(name: string, handler: JobHandler<T>): void {
    jobHandlers.set(name, handler as JobHandler);
}

/**
 * Dispatch a job to the queue
 */
export async function dispatch<T = any>(
    name: string,
    data: T,
    options: JobOptions = {}
): Promise<Job<T>> {
    const job: Job<T> = {
        id: crypto.randomUUID(),
        name,
        data,
        queue: options.queue || queueConfig.defaultQueue || 'default',
        status: 'pending',
        attempts: 0,
        maxAttempts: options.attempts || 3,
        createdAt: new Date(),
    };

    if (queueConfig.driver === 'memory') {
        pendingJobs.push(job as Job);
        console.log(`📋 [Queue] Job dispatched: ${name} (${job.id})`);

        // Process immediately in memory mode (with optional delay)
        if (options.delay) {
            setTimeout(() => processJob(job as Job), options.delay);
        } else {
            // Process on next tick to allow synchronous code to complete
            queueMicrotask(() => processJob(job as Job));
        }
    } else {
        // TODO: Implement Redis/database drivers
        console.warn(`📋 [Queue] Driver '${queueConfig.driver}' not yet implemented.`);
    }

    return job;
}

/**
 * Process a single job (internal)
 */
async function processJob(job: Job): Promise<void> {
    const handler = jobHandlers.get(job.name);

    if (!handler) {
        console.error(`📋 [Queue] No handler registered for job: ${job.name}`);
        job.status = 'failed';
        job.error = `No handler for job: ${job.name}`;
        return;
    }

    job.status = 'processing';
    job.processedAt = new Date();
    job.attempts++;

    try {
        await handler(job);
        job.status = 'completed';
        job.completedAt = new Date();
        console.log(`✅ [Queue] Job completed: ${job.name} (${job.id})`);
    } catch (error) {
        if (job.attempts < job.maxAttempts) {
            job.status = 'pending';
            console.warn(`⚠️ [Queue] Job failed, retrying (${job.attempts}/${job.maxAttempts}): ${job.name}`);
            setTimeout(() => processJob(job), 1000 * job.attempts); // exponential backoff
        } else {
            job.status = 'failed';
            job.failedAt = new Date();
            job.error = error instanceof Error ? error.message : String(error);
            console.error(`❌ [Queue] Job failed permanently: ${job.name} (${job.id}): ${job.error}`);
        }
    }
}

/**
 * Get the current queue status
 */
export function getQueueStatus(): { pending: number; processing: number; completed: number; failed: number } {
    return {
        pending: pendingJobs.filter(j => j.status === 'pending').length,
        processing: pendingJobs.filter(j => j.status === 'processing').length,
        completed: pendingJobs.filter(j => j.status === 'completed').length,
        failed: pendingJobs.filter(j => j.status === 'failed').length,
    };
}
