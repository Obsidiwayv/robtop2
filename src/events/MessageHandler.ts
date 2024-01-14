import { GatewayMessageCreateDispatchData } from "discord-api-types/v10";
import RobtopClient from "../RobtopClient";
import Shard from "../../lib/shards/Shard";

export default class MessageHandler {
    constructor(
        private client: RobtopClient,
        private message: GatewayMessageCreateDispatchData,
        private shard: Shard
    ) {}

    get prefix() {
        return this.client.options.prefix;
    }

    public init() {
        if (this.message.author.bot) return;
        if (!this.message.content.startsWith(this.prefix)) return;

        const args = this.message.content.slice(this.prefix.length).trim().split(" ");
        const slicedArgs = args.slice(1);

        const command = this.client.commands.get(args[0]);

        if (command) {
            command.setContext(
                this.message, 
                this.client, 
                slicedArgs,
                this.shard
            );
            
            command.execute();
        }
    }
}