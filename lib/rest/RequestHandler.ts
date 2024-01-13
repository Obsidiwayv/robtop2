import axios, { AxiosRequestConfig } from "axios";
import BucketQueue from "bucket-queue";
import FormData from "form-data";

import RobtopClient from "../../src/RobtopClient";
import { Files } from "../types/Requests";
import { RESTRateLimit } from "discord-api-types/v10";

export interface IDiscordRequestBody<T> {
    endpoint: string;
    files?: Array<Files>;
    json?: T;
    useAuth?: boolean;
}

export type AxiosRequestMethods = "get" | "post" | "put" | "patch" | "delete";

export class RequestHandler {
    public API_URL = "https://discord.com/api";

    private ratelimits: { [key: string]: BucketQueue.IBucketAPI } = {};
    private requestTimeout: { [key: string]: number } = {};

    private globalBlocking = false;

    public constructor(private client: RobtopClient) { }

    #setRatelimit(route: string, params: BucketQueue.IBucketParams = {}) {
        const tick = 10;
        const bucketData = Object.assign({
            calls: 100,
            perInterval: 60 * 1000,
            maxConcurrent: Infinity,
            tickFrequency: tick
        }, params);

        if (this.ratelimits[route]) {
            this.ratelimits[route].stop();
            delete this.ratelimits[route];

            bucketData.tickFrequency = tick + this.requestTimeout[route];
        }

        return this.ratelimits[route] = BucketQueue(bucketData);
    }

    public async discordRequest<T, R = {}>(method: AxiosRequestMethods, body: IDiscordRequestBody<T>) {
        body.useAuth = true;

        if (!this.ratelimits[body.endpoint]) {
            this.#setRatelimit(body.endpoint).start();
        }
        const tryRequest = async (): Promise<R | undefined> => {

            return new Promise((resolve, reject) => {
                if (!this.globalBlocking) {
                    let headers: { [key: string]: string } = {};
    
                    if (body.useAuth) {
                        headers["Authorization"] = `Bot ${this.client.config.options.token}`;
                    }
    
                    headers["User-Agent"] = `DiscordBot (Robtop2, ${this.client.config.options.version})`;
    
                    const axiosOptions: AxiosRequestConfig = { 
                        url: `${this.API_URL}/v${RobtopClient.API_VERSION}${body.endpoint}`,
                        method: method.toUpperCase(),
                        headers,
                    };
    
                    if (body.files) {
                        axiosOptions.data = new FormData();
                        for (const [i, f] of body.files.entries()) {
                            if (f.contents && f.name) {
                                axiosOptions.data.append(`files[${i}]`, f.contents, f.name);
                            }
                        }
                        if (body.json) {
                            axiosOptions.data.append("payload_json", JSON.stringify(body.json));
                        }
                        headers["content-type"] = "multipart/form-data";
                    } else if (body.json) {
                        axiosOptions.data = JSON.stringify(body.json);
                        headers["content-type"] = "application/json";
                    };
    
                    return axios.request<R>(axiosOptions).catch(reason => {
                        // we hit a ratelimit
                        if (reason.response.status === 429) {
                            // Typescript is a pain
                            const typedData = reason.response.data as RESTRateLimit;
    
                            if (reason.response.headers["x-ratelimit-global"]) {
                                this.globalBlocking = true;
                                setTimeout(() => { this.globalBlocking = false; }, typedData.retry_after * 3);
                            } else {
                                setTimeout(async () => { 
                                    this.ratelimits[body.endpoint].stop(); 
                                    reject(typedData.retry_after);
                                }, 
                                typedData.retry_after * 3);
                            }
                        }
                    }).then((res) => {
                        if (!res) return;
    
                        this.requestTimeout[body.endpoint] = Math.round(Number(res.headers["x-ratelimit-reset-after"]));
                        resolve(res.data);
                    })
                }
            });
        }

        return this.ratelimits[body.endpoint].add(tryRequest)
            .catch((retry: number) => {
                setTimeout(() => { this.ratelimits[body.endpoint].start(); tryRequest(); }, retry / 2);
            })
            .then(async (data) => { return await data });
    }
}

// await axios[method](`${this.API_URL}/${this.API_VERSION}${body.endpoint}`);