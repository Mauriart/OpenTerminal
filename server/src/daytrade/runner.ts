import { spawn } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** Only the vendored skill scripts. No user-controlled paths, no shell. */
const SCRIPT_RE = /^trader-[a-z]+\/[a-z0-9_]+\.py$/;

export class DaytradeError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: string
  ) {
    super(message);
  }
}

export function packRoot(): string {
  const fromEnv = process.env.DAYTRADER_PACK;
  if (fromEnv) {
    const abs = resolve(fromEnv);
    if (!existsSync(join(abs, "LICENSE")) || !existsSync(join(abs, "trader-exit", "exit.py"))) {
      throw new DaytradeError(500, "daytrade pack missing");
    }
    return abs;
  }
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, "../../../vendor/day-trader-skill"),
    resolve(here, "../../vendor/day-trader-skill"),
    resolve(here, "../vendor/day-trader-skill"),
  ];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, "LICENSE")) && existsSync(join(candidate, "trader-exit", "exit.py"))) {
      return candidate;
    }
  }
  throw new DaytradeError(500, "daytrade pack missing");
}

export function resolveScript(rel: string): string {
  if (!SCRIPT_RE.test(rel)) throw new DaytradeError(400, "script not allowed");
  const root = realpathSync(packRoot());
  const full = realpathSync(join(root, rel));
  if (full !== root && !full.startsWith(root + sep)) throw new DaytradeError(400, "script not allowed");
  return full;
}

export type ToolResult = {
  code: number;
  stdout: string;
  stderr: string;
  json: unknown | null;
};

function parseJson(stdout: string): unknown | null {
  const text = stdout.trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const start = text.search(/[[{]/);
    if (start < 0) return null;
    try {
      return JSON.parse(text.slice(start));
    } catch {
      return null;
    }
  }
}

/**
 * Run one vendored script. `shell` is never enabled, so arguments cannot be
 * interpolated by a shell. The child environment is a whitelist: the SEC
 * user-agent is forwarded when set, and API keys are not.
 */
export function runTool(
  rel: string,
  args: string[],
  opts?: { cwd?: string; timeoutMs?: number }
): Promise<ToolResult> {
  for (const arg of args) {
    if (typeof arg !== "string" || arg.includes("\0")) throw new DaytradeError(400, "invalid argument");
  }
  const script = resolveScript(rel);
  const timeout = opts?.timeoutMs ?? 45_000;
  const python = process.env.PYTHON ?? "python3";

  return new Promise((resolvePromise, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };
    const child = spawn(python, [script, ...args], {
      cwd: opts?.cwd,
      shell: false,
      timeout,
      env: {
        PATH: process.env.PATH ?? "/usr/bin:/bin",
        LANG: "C.UTF-8",
        HOME: process.env.HOME ?? "/tmp",
        ...(process.env.SEC_USER_AGENT ? { SEC_USER_AGENT: process.env.SEC_USER_AGENT } : {}),
      },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      if (stdout.length > 8_000_000) child.kill("SIGKILL");
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
      if (stderr.length > 200_000) child.kill("SIGKILL");
    });
    child.on("error", (err: NodeJS.ErrnoException) => {
      finish(() => reject(err));
    });
    child.on("close", (code) => {
      finish(() => {
        resolvePromise({ code: code ?? 1, stdout, stderr, json: parseJson(stdout) });
      });
    });
  });
}

export function clip(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 400);
}

export async function toolJson<T>(rel: string, args: string[], opts?: { cwd?: string; timeoutMs?: number }): Promise<T> {
  let result: ToolResult;
  try {
    result = await runTool(rel, args, opts);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") throw new DaytradeError(503, "python3 is required for the day-trade pack");
    const message = err instanceof Error ? err.message : String(err);
    if (/timeout|ETIMEDOUT|SIGTERM/i.test(message)) throw new DaytradeError(504, "daytrade tool timed out");
    throw new DaytradeError(502, "daytrade tool failed", clip(message));
  }
  if (result.json === null) {
    throw new DaytradeError(502, "daytrade tool failed", clip(result.stderr || result.stdout));
  }
  return result.json as T;
}
