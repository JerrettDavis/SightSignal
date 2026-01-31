import { promises as fs } from "node:fs";
import path from "node:path";

const e2eDataDir = path.join(process.cwd(), ".local", "e2e");

const globalTeardown = async () => {
  await fs.rm(e2eDataDir, { recursive: true, force: true });
};

export default globalTeardown;
