import axios from "axios";
import BucketQueue from "bucket-queue";

import RobtopClient from "../../src/RobtopClient";

export interface IDiscordRequestBody {
    endpoint: `/${string}`;
}

export type AxiosRequestMethods = "get" | "post" | "put" | "patch" | "delete";

export class RequestHandler {
    public API_URL = "https://discord.com/api";
    public API_VERSION = "10";
    
    private ratelimits: { [key: string]: BucketQueue.IBucketAPI } = {};

    public constructor(private client: RobtopClient) {}

    public async discordRequest(method: AxiosRequestMethods, body: IDiscordRequestBody) {
        if (!this.ratelimits[body.endpoint]) {
            this.ratelimits[body.endpoint] = BucketQueue();
        }
        function tryRequest(handler: RequestHandler) {
            return async () => {
                await axios[method](`${handler.API_URL}/${handler.API_VERSION}${body.endpoint}`);
            }
        }
    }
}

// await axios[method](`${this.API_URL}/${this.API_VERSION}${body.endpoint}`);