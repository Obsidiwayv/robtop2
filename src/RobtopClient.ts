import EventEmitter from "events";
import TypedEventEmitter from "typed-emitter";
import RobtopLibraryEvents from "../lib/types/Events";
import loadYaml, { YamlConfigFile } from "../lib/YamlLoader";
import { RequestHandler } from "../lib/rest/RequestHandler";
import ShardingManager from "../lib/shards/ShardingManager";

export default class RobtopClient {
    public events: TypedEventEmitter<RobtopLibraryEvents>;
    public config: YamlConfigFile;

    public rest: RequestHandler;

    public shards: ShardingManager;
    public shardCount: number = 0;

    public static API_VERSION = "10";
    public static GATEWAY_VERSION = "10";

    public constructor() {
        this.events = new EventEmitter() as TypedEventEmitter<RobtopLibraryEvents>;
        this.config = loadYaml();

        this.rest = new RequestHandler(this);

        this.shards = new ShardingManager(this);
    }
}