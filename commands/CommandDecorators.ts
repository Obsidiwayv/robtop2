import { ICommandData } from "../lib/types/Command";

export function putCommandMeta(options: ICommandData) {
    return function(target: any) {
        target.meta = options;
    }
}