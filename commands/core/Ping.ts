import CommandBase from "../CommandBase";
import { putCommandMeta } from "../CommandDecorators";

@putCommandMeta({ names: ["ping"] })
class Ping extends CommandBase {
    public execute() {
        const now = Date.now();
        
        this.createMessage("Ping?").then((msg) => {
            const diff = (Date.now() - now);
            const shard_latency = this.shard.last_heartbeat === 0 
                ? "No heartbeat yet"
                : `${this.shard.latency}ms`; 

            this.editMessage(msg, {
                content: `Message Latency - \`${diff}ms\`\nShard Latency - \`${shard_latency}\``
            });
        })
    }
}

export = Ping;