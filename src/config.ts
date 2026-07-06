import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export type Action = "ban" | "kick";

interface ConfigData {
  checksums: string[];
  action: Action;
}

const CONFIG_PATH = resolve("checksums.json");

const defaults: ConfigData = {
  checksums: [],
  action: "ban",
};

let config: ConfigData;

function load(): ConfigData {
  if (existsSync(CONFIG_PATH)) {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
  }
  return { ...defaults };
}

function save(): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

config = load();

export function getChecksums(): string[] {
  return [...config.checksums];
}

export function addChecksum(checksum: string): boolean {
  const c = checksum.toLowerCase();
  if (config.checksums.includes(c)) return false;
  config.checksums.push(c);
  save();
  return true;
}

export function removeChecksum(checksum: string): boolean {
  const c = checksum.toLowerCase();
  const idx = config.checksums.indexOf(c);
  if (idx === -1) return false;
  config.checksums.splice(idx, 1);
  save();
  return true;
}

export function getAction(): Action {
  return config.action;
}

export function setAction(action: Action): void {
  config.action = action;
  save();
}

export function isWatched(checksum: string): boolean {
  return config.checksums.includes(checksum.toLowerCase());
}
