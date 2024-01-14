import { APIMessage, GatewayMessageCreateDispatchData, RESTPostAPIChannelMessageJSONBody } from "discord-api-types/v10";
import RobtopClient from "../src/RobtopClient";
import Logger from "../src/Logger";
import { APICustomContent } from "../lib/types/Content";
import Routes from "../lib/rest/Routes";
import Shard from "../lib/shards/Shard";
import Colors from "../colors.json";

export default class CommandBase {
    public ctx!: GatewayMessageCreateDispatchData;
    public client!: RobtopClient;
    public args!: string[];
    // for easy use
    public shard!: Shard;

    public logger: Logger = new Logger(this.constructor);

    public setContext(
        data: GatewayMessageCreateDispatchData,
        client: RobtopClient,
        args: string[],
        shard: Shard
    ) {
        this.ctx = data;
        this.client = client;
        this.args = args;
        this.shard = shard;
    }

    public editMessage(data: APIMessage, content: APICustomContent): Promise<boolean> {
        return new Promise(async (resolve) => {
            try {
                await this.client.rest.discordRequest("patch", {
                    endpoint: Routes.EDIT_MESSAGE(data.channel_id, data.id), 
                    json: content 
                });
            } catch(e) {
                this.logger.log("warning", `Tried editing own message...\n${e}`);
            }
        });
    }

    public createMessage(content: APICustomContent | string, channelID?: string): Promise<APIMessage> {
        return new Promise(async (resolve) => {
            try {
                let json: APICustomContent = {};
                if (typeof content === "string") {
                    json.content = content;
                } else {
                    if (content.embeds) {
                        content.embeds.forEach((val) => {
                            if (typeof val.color === "string") {
                                const color = Colors[val.color];

                                val.color = parseInt(`0x${color.slice(1)}`);
                            }
                        })
                    }
                    json = content;
                }
                const result = await this.client.rest.discordRequest<typeof json, APIMessage>("post", {
                    endpoint: Routes.POST_MESSAGE(channelID ?? this.ctx.channel_id),
                    json 
                });
                if (!result) {
                    return;
                }
                resolve(result);
            } catch(e) {
                this.logger.log("warning", "cannot send messsage...\n" + e);
            }
        })
    }

    public execute() {}
}