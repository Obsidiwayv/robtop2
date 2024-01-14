import EventEmitter from "events";
import { SimpleEventDispatcher } from "strongly-typed-events";
import RobtopLibraryEvents from "../lib/types/Events";
import loadYaml, { YamlConfigFile } from "../lib/YamlLoader";
import { RequestHandler } from "../lib/rest/RequestHandler";
import ShardingManager from "../lib/shards/ShardingManager";
import {  APIChannel, APIGuild, APIGuildMember, APITextBasedChannel, APIUser, ChannelType, GatewayGuildCreateDispatchData, GatewayGuildUpdateDispatchData } from "discord-api-types/v10";
import CommandBase from "../commands/CommandBase";
import Shard from "../lib/shards/Shard";

export default class RobtopClient extends SimpleEventDispatcher<RobtopLibraryEvents> {
    public config: YamlConfigFile;

    public rest: RequestHandler;

    public shards: ShardingManager;
    public shardCount: number = 0;

    public self!: APIUser;

    public commands = new Map<string, CommandBase>();

    public guilds = new Map<string, GatewayGuildCreateDispatchData | GatewayGuildUpdateDispatchData>();
    public users = new Map<string, APIUser>();
    public guildChannelMap: { 
        [id: string]: { 
            guildID: string, 
            data: APITextBasedChannel<ChannelType.GuildText> 
        } 
    } = {};

    public static API_VERSION = "10";
    public static GATEWAY_VERSION = "10";

    /**
     * GUILDS: 1 << 0
     * 
     * GUILD_MEMBERS: 1 << 1
     * 
     * GUILD_PRESENCES: 1 << 8
     * 
     * GUILD_MESSAGES: 1 << 9
     * 
     * GUILD_MESSAGE_REACTIONS: 1 << 10
     * 
     * MESSAGE_CONTENT 1 << 15
     * 
     * https://discord.com/developers/docs/topics/gateway#list-of-intents
     */
    public static enabledIntents = 1 << 0 | 1 << 1 | 1 << 8 | 1 << 9 | 1 << 10 | 1 << 15 

    public constructor() {
        super();
        
        this.config = loadYaml();

        this.rest = new RequestHandler(this);

        this.shards = new ShardingManager(this);
    }

    get options() {
        return this.config.options;
    }
}