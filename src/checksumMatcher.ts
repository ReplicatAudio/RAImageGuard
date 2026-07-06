import { createHash } from "node:crypto";

export async function computeImageChecksum(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const hash = createHash("sha256");
  const reader = response.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    hash.update(value);
  }

  return hash.digest("hex");
}
