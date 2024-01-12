import WebSocket, { RawData } from "ws";
import RobtopClient from "../../src/RobtopClient";
import ShardingManager from "./ShardingManager";
import { GatewayIdentify } from "discord-api-types/v10";

const OpCodes = {
    HEARTBEAT: 1,
    IDENTIFY: 2,
    HELLO: 10,
};

export default class Shard {
    public ws: WebSocket;
    private heartbeatInterval?: NodeJS.Timeout;
    #seq: number | null = null;
    shardID: number = 0;

    constructor(private client: RobtopClient, private manager: ShardingManager) {
        this.ws = new WebSocket(`${manager.WS_URL}/?v=${RobtopClient.GATEWAY_VERSION}&encoding=json`);
        this.ws.on("open", this.identify.bind(this));
    }

    public spawn(id: number) {
        this.shardID = id;
    }

    public send<T>(data: T) {
        this.ws.send(JSON.stringify(data));
    }

    private onPacket(p: RawData) {
        const packet = JSON.parse(p.toString());

        switch (packet.op) {
            case OpCodes.HELLO:
                this.heartbeatInterval = setInterval(() => {
                    this.send({
                        d: OpCodes.HEARTBEAT,
                        op: this.#seq
                    })
                }, packet.d.heartbeat_interval);
                break;
        }
    }

    private identify() {
        this.send<GatewayIdentify>({
            op: OpCodes.IDENTIFY,
            d: {
                token: this.client.config.options.token,
                shard: [this.shardID, this.client.shardCount],
                intents: 0,
                properties: {
                    os: process.platform,
                    browser: "Firefox",
                    device: "Ubuntu"
                }
            }
        });
    }
}