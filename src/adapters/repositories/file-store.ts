import { promises as fs } from "node:fs";
import path from "node:path";

export const getDataDir = () =>
  process.env.SIGNALFEED_DATA_DIR ??
  process.env.SIGHTSIGNAL_DATA_DIR ??
  path.join(process.cwd(), ".local");

const ensureFile = async <T>(filePath: string, seed: T[]) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(seed, null, 2), "utf-8");
  }
};

export const readCollection = async <T>(
  filePath: string,
  seed: T[]
): Promise<T[]> => {
  await ensureFile(filePath, seed);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as T[];
    }
  } catch {
    // Fall through to seed rewrite below.
  }

  await fs.writeFile(filePath, JSON.stringify(seed, null, 2), "utf-8");
  return seed;
};

export const writeCollection = async <T>(filePath: string, data: T[]) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
};
