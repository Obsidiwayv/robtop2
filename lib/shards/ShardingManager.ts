import { RESTGetAPIGatewayBotResult } from "discord-api-types/v10";
import RobtopClient from "../../src/RobtopClient";
import DiscordGatewayError from "../errors/DiscordGatewayError";
import Shard from "./Shard";
import Routes from "../rest/Routes";

export default class ShardingManager extends Map<number, Shard> {
    public WS_URL?: string = undefined;

    public constructor(private client: RobtopClient) {
        super();
    }

    public async create() {
        const data = await this.client.rest.discordRequest<{}, RESTGetAPIGatewayBotResult>("get", {
            endpoint: Routes.GATEWAY_BOT
        });
        
        if (!data) {
            throw new DiscordGatewayError("Cannot auto-shard due to lack of discord data.");
        }

        this.WS_URL = data.url;
        this.client.shardCount = data.shards;

        for (let s = 0; s < data.shards; s++) {
            this.set(s, new Shard(this.client, this));
        }
    }
}