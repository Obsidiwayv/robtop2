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
            add<T>(fn: ((...args: any) => T), args?: [any]): Promise<T>;
            start(): IBucketAPI;
            stop(): IBucketAPI;
            getState(key?: (keyof IBucketData)): IBucketData | string;
        }
    }
}