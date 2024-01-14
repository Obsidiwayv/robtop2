import WebSocket, { RawData } from "ws";
import RobtopClient from "../../src/RobtopClient";
import ShardingManager from "./ShardingManager";
import Logger from "../../src/Logger";
import AsyncShard from "./AsyncShard";

import {
    APITextBasedChannel,
    ActivityType,
    ChannelType,
    GatewayDispatchEvents,
    GatewayDispatchPayload,
    GatewayHello,
    GatewayIdentify,
    GatewayResume,
    PresenceUpdateStatus
} from "discord-api-types/v10";
import MessageHandler from "../../src/events/MessageHandler";

const OpCodes = {
    HEARTBEAT: 1,
    IDENTIFY: 2,
    RESUME: 6,
    RECONNECT: 7,
    HELLO: 10,
    HEARTBEAT_ACK: 11
};

export default class Shard {
    public ws!: WebSocket;
    private heartbeatInterval?: NodeJS.Timeout;
    #seq: number = 0;
    #session_id: string = "";
    shardID: number = 0;
    latency: number = 0;
    last_heartbeat: number = 0

    private resume_url?: string;

    private logger = new Logger(Shard);

    private asyncShard: AsyncShard = new AsyncShard(this);

    constructor(private client: RobtopClient, private manager: ShardingManager) {
        this.connect();
    }

    public connect(reconnecting = false) {
        this.ws = new WebSocket(
            `${reconnecting ? this.resume_url : this.manager.WS_URL}/?v=${RobtopClient.GATEWAY_VERSION}&encoding=json`
        );
        this.ws.on("open", this.identify.bind(this));
        this.ws.on("message", this.onPacket.bind(this));
        this.ws.on("close", (code, reason) => {
            console.log(code, reason.toString());
            this.asyncShard.handleClose({ code, reason })
                .then((message) => {
                    if (message) {
                        this.logger.log("info", message);
                    }
                })
                .catch((message) => this.logger.log("warning", message));
        });
    }

    public disconnect(reconnect: boolean) {

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        if (reconnect) {
            if (this.ws) {
                this.ws.close(4901, "Robtop2: reconnect");
            }


            if (!this.#seq) {
                this.logger.log("info", "Reconnecting in 5 seconds...");
                setTimeout(() => { this.connect(true); }, 5000);
            } else {
                this.logger.log("info", "Reconnecting for resume...");
                this.connect(false);
            }
        } else {
            this.ws.terminate();
        }
    }

    public spawn(id: number) {
        this.shardID = id;
    }

    public send<T>(data: T) {
        this.ws.send(JSON.stringify(data));
    }

    private resume() {
        this.send<GatewayResume>({
            op: OpCodes.RESUME,
            d: {
                seq: this.#seq,
                session_id: this.#session_id,
                token: this.client.config.options.token
            }
        })
    }

    private heartbeat(interval: number) {
        this.heartbeatInterval = setInterval(() => {
            this.send({
                op: OpCodes.HEARTBEAT,
                d: null
            });
            this.last_heartbeat = Date.now();
        }, interval);
    }

    private onPacket(p: RawData) {
        const packet = JSON.parse(p.toString());

        console.log(packet)

        switch (packet.op) {
            case OpCodes.HELLO:
                this.heartbeat((packet as GatewayHello).d.heartbeat_interval);

                if (this.#session_id) {
                    this.resume();
                }
                break;
            case OpCodes.HEARTBEAT_ACK:
                this.latency = Date.now() - this.last_heartbeat;
                break;
            case OpCodes.RECONNECT:
                this.logger.log("info", "The server requested to reconnect...");
                this.disconnect(true);
                break;
        }
        const typedPacket = packet as GatewayDispatchPayload;

        switch (typedPacket.t) {
            case GatewayDispatchEvents.Ready:
                this.resume_url = typedPacket.d.resume_gateway_url;
                this.#session_id = typedPacket.d.session_id;
                this.client.self = typedPacket.d.user;
                this.logger.log("info", "I am online!");
                break;
            case GatewayDispatchEvents.GuildCreate:
                for (let member of typedPacket.d.members) {
                    if (member.user) {
                        // We can get the user through guild cache but this is easier...
                        this.client.users.set(member.user.id, member.user);
                    }
                }
                for (let channel of typedPacket.d.channels) {
                    if (channel.type === ChannelType.GuildText) {
                        this.client.guildChannelMap[channel.id] = {
                            guildID: typedPacket.d.id,
                            data: channel
                        };
                    }
                }
                this.client.guilds.set(typedPacket.d.id, typedPacket.d);
                break;
            case GatewayDispatchEvents.MessageCreate:
                new MessageHandler(this.client, typedPacket.d, this).init();
                break;
            case GatewayDispatchEvents.GuildDelete:
                this.client.guilds.delete(typedPacket.d.id);
                break;
            case GatewayDispatchEvents.GuildUpdate:
                this.client.guilds.set(typedPacket.d.id, typedPacket.d);
                break;
            case GatewayDispatchEvents.ChannelDelete:
                delete this.client.guildChannelMap[typedPacket.d.id];
                break;
            case GatewayDispatchEvents.ChannelUpdate:
                if (typedPacket.d.type === ChannelType.GuildText) {
                    this.client.guildChannelMap[typedPacket.d.id].data = typedPacket.d;
                }
                break;
            case GatewayDispatchEvents.ChannelCreate:
                if (typedPacket.d.type === ChannelType.GuildText) {
                    this.client.guildChannelMap[typedPacket.d.id] = {
                        guildID: typedPacket.d.guild_id || "",
                        data: typedPacket.d
                    }
                }
        }
    }

    private identify() {
        this.send<GatewayIdentify>({
            op: OpCodes.IDENTIFY,
            d: {
                token: this.client.config.options.token,
                shard: [this.shardID, this.client.shardCount],
                intents: RobtopClient.enabledIntents,
                properties: {
                    os: "android",
                    browser: "Discord Android",
                    device: "Samsung Galaxy S24"
                },
                presence: {
                    since: Date.now(),
                    afk: false,
                    status: PresenceUpdateStatus.Online,
                    activities: [{
                        name: "Geometry Dash",
                        type: ActivityType.Playing
                    }]
                }
            }
        });
    }
}