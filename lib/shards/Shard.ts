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

const OpCodes = {
    HEARTBEAT: 1,
    IDENTIFY: 2,
    RESUME: 6,
    HELLO: 10,
};

export default class Shard {
    public ws!: WebSocket;
    private heartbeatInterval?: NodeJS.Timeout;
    #seq: number = 0;
    #session_id: string = "";
    shardID: number = 0;


    private resume_url?: string;

    private logger = new Logger(Shard);

    private asyncShard: AsyncShard = new AsyncShard(this);

    constructor(private client: RobtopClient, private manager: ShardingManager) {
        this.connect(true, false);
    }

    public connect(newWS: boolean = true, reconnecting: boolean) {
        if (newWS) {
            this.ws = new WebSocket(
                `${reconnecting ? this.resume_url : this.manager.WS_URL}/?v=${RobtopClient.GATEWAY_VERSION}&encoding=json`
            );
        }
        this.ws.on("open", this.identify.bind(this));
        this.ws.on("message", this.onPacket.bind(this));
        this.ws.on("close", (code, reason) =>
            this.asyncShard.handleClose({ code, reason })
                .then((message) => {
                    if (message) {
                        this.logger.log("info", message);
                    }
                })
                .catch((message) => this.logger.log("warning", message)));
    }

    public disconnect(reconnect: boolean) {

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        if (reconnect) {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.close(4901, "Robtop2: reconnect");
            }


            if (!this.#seq) {
                this.logger.log("info", "Reconnecting in 5 seconds...");
                setTimeout(() => { this.connect(false, true); }, 5000);
            } else {
                this.logger.log("info", "Reconnecting for resume...");
                this.connect(true, true);
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
            })
        }, interval);
    }

    private onPacket(p: RawData) {
        const packet = JSON.parse(p.toString());
        
        switch (packet.op) {
            case OpCodes.HELLO:
                this.heartbeat((packet as GatewayHello).d.heartbeat_interval);

                if (this.#session_id) {
                    this.resume();
                }
                break;
        }
        const typedPacket = packet as GatewayDispatchPayload;

        switch (typedPacket.t) {
            case GatewayDispatchEvents.Ready:
                this.resume_url = typedPacket.d.resume_gateway_url;
                this.#session_id = typedPacket.d.session_id;
                this.logger.log("info", "I am online!");
                break;
            case GatewayDispatchEvents.GuildCreate:
                for (let member of typedPacket.d.members) {
                    if (member.user) {
                        // We can get the user through guild cache but this is easier...
                        this.client.users.set(member.user.id, member.user);
                    }
                }
                for (let channel of packet.d.channels) {
                    if (channel.type === 2) {
                        const channel_packet = (packet as APITextBasedChannel<ChannelType.GuildText>);
                        this.client.guildChannelMap[channel_packet.id] = { 
                            guildID: typedPacket.d.id, 
                            data: channel_packet
                        };
                    }
                }
                this.client.guilds.set(typedPacket.d.id, typedPacket.d);
                break;
            case GatewayDispatchEvents.ChannelDelete:

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