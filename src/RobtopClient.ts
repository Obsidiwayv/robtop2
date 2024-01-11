import EventEmitter from "events";
import TypedEventEmitter from "typed-emitter";
import RobtopLibraryEvents from "../lib/types/Events";

export default class RobtopClient {
    public api: TypedEventEmitter<RobtopLibraryEvents>;

    public constructor() {
        this.api = new EventEmitter() as TypedEventEmitter<RobtopLibraryEvents>;
    }
}