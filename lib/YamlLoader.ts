import yaml from "yaml";
import fs from "fs";

export interface YamlConfigFile {
    options: {
        token: string;
        version: string;
    };
}

export default function loadYaml(): YamlConfigFile {
    return yaml.parse(fs.readFileSync("./config.yaml", "utf-8"));
}