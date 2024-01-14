import CommandBase from "./commands/CommandBase";
import RobtopClient from "./src/RobtopClient";
import FS from "fs";

const client = new RobtopClient();

client.shards.create();

FS.readdirSync("./build/commands/").forEach((folder) => {
    if (!folder.startsWith("Command")) {
        FS.readdirSync(`./build/commands/${folder}/`).forEach((file) => {
            const commandClass = require(`./commands/${folder}/${file}`);
            const command = new commandClass();
            for (const name of commandClass.meta.names) {
                client.commands.set(name, command);
            }
        });
    }
})