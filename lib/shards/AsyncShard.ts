import Shard from "./Shard";

const closeCodes: { [key: number]: { code: number, message: string } } = {
    4000: {
        code: 1,
        message: "Unknown Error"
    },
    4001: {
        code: 2,
        message: "Uknown Op"
    },
    4004: {
        code: 3,
        message: "Auth Failed"
    },
    4008: {
        code: 4,
        message: "Rate limited"
    },
    4009: {
        code: 5,
        message: "Session timeout"
    },
    4010: {
        code: 6,
        message: "Invalid Shard"
    },
    4011: {
        code: 7,
        message: "Sharding Required"
    },
    4013: {
        code: 8,
        message: "Invalid Intents"
    },
    4014: {
        code: 9,
        message: "Disallowed Intents"
    }
}

export default class AsyncShard {
    constructor(private shard: Shard) {}

    public handleClose(data: { code: number, reason: Buffer }): Promise<string> {
        return new Promise((resolve, reject) => {
            const info = closeCodes[data.code];
            
            if (info) {
                switch (info.code) {
                    case 1:
                        this.shard.disconnect(true);
                        resolve("Try reconnect");
                        break;
                    case 5:
                        this.shard.disconnect(true);
                        resolve("Try reconnect due to Session timeout");
                    default:
                        reject(info.message + "\n" + data.reason.toString());
                }
            }
        });
    }
}