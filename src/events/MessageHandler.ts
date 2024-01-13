import { GatewayMessageCreateDispatchData } from "discord-api-types/v10";
import RobtopClient from "../RobtopClient";

export default class MessageHandler {
    constructor(private client: RobtopClient, private message: GatewayMessageCreateDispatchData) {}

    public init() {}
}