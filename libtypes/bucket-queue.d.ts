declare module 'bucket-queue' {

    function BucketQueue(qData?: BucketQueue.IBucketParams): BucketQueue.IBucketAPI;

    export = BucketQueue;

    module BucketQueue {
        interface IBucketParams {
            calls?: number;
            perInterval?: number,
            maxConcurrent?: number,
            tickFrequency?: number;
        }

        interface IBucketData {
            concurrent: number;
            bucketCount: number,
            queueCount: number;
            waiting: boolean;
        }

        interface IBucketAPI {
            _tick(elapsed: number): any;
            add<T>(fn: (() => T), args: [any]): Promise<T>;
            start(): IBucketParams;
            stop(): IBucketParams;
            getState(key?: (keyof IBucketData)): IBucketData | string;
        }
    }
}