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
    private requestLimits: { [key: string]: number } = {};
    private requestTimeout: { [key: string]: number } = {};

    private globalBlocking = false;

    public constructor(private client: RobtopClient) { }

    #setRatelimit(route: string, time: number) {
        const tick = 10;
        const bucketData = {
            calls: 100,
            perInterval: this.requestLimits[route] * time || 60 * 1000,
            maxConcurrent: Infinity,
            tickFrequency: this.requestTimeout[route] ? this.requestTimeout[route] + tick : tick
        };

        if (this.ratelimits[route]) {
            this.ratelimits[route].stop();
            bucketData.tickFrequency = 10 * time;
        }

        return this.ratelimits[route] = BucketQueue(bucketData);
    }

    public async discordRequest<T, R = {}>(method: AxiosRequestMethods, body: IDiscordRequestBody<T>) {
        body.useAuth = true;

        if (!this.ratelimits[body.endpoint]) {
            this.#setRatelimit(body.endpoint, 0).start();
        }
        const tryRequest = async (): Promise<R | undefined> => {
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
                            setTimeout(async () => await tryRequest(), typedData.retry_after * 3);
                        }
                    }
                }).then((res) => {
                    if (!res) return;

                    if (this.requestTimeout[body.endpoint]) {
                        this.requestLimits[body.endpoint] = Number(res.headers["x-ratelimit-reset-after"]) * 3
                            - this.requestTimeout[body.endpoint];
                        this.#setRatelimit(body.endpoint, Number(res.headers["x-ratelimit-reset-after"]) * 6);
                    }

                    this.requestTimeout[body.endpoint] = Math.round(Number(res.headers["x-ratelimit-reset-after"]));
                    return res.data;
                })
            }
        }

        return this.ratelimits[body.endpoint].add(tryRequest);
    }
}

// await axios[method](`${this.API_URL}/${this.API_VERSION}${body.endpoint}`);