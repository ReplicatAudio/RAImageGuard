import { readdirSync, createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { extname, resolve } from "node:path";
import { addChecksum } from "./config.js";

const REF_DIR = resolve("ref");

const IMAGE_EXTS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tiff", ".tif", ".avif",
]);

async function hashFile(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  const stream = createReadStream(filePath);

  for await (const chunk of stream) {
    hash.update(chunk as Buffer);
  }

  return hash.digest("hex");
}

async function main() {
  let files: string[];
  try {
    files = readdirSync(REF_DIR);
  } catch {
    console.error(`Directory ./ref does not exist`);
    process.exit(1);
  }

  const imageFiles = files.filter((f) => IMAGE_EXTS.has(extname(f).toLowerCase()));

  if (imageFiles.length === 0) {
    console.log("No image files found in ./ref");
    return;
  }

  let added = 0;
  let skipped = 0;

  for (const file of imageFiles) {
    const filePath = resolve(REF_DIR, file);
    const checksum = await hashFile(filePath);
    if (addChecksum(checksum)) {
      console.log(`  added  ${file}  ${checksum}`);
      added++;
    } else {
      console.log(`  skip   ${file}  (already in list)`);
      skipped++;
    }
  }

  console.log(`\nDone: ${added} added, ${skipped} skipped`);
}

main().catch(console.error);
