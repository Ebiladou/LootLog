import fs from "node:fs";
import { CONFIG_FILE, ensureDirs } from "./path";

export const SUPPORTED_BROWSERS = [
  "chrome",
  "chromium",
  "firefox",
  "edge",
  "opera",
  "safari",
  "brave",
] as const;

export type SupportedBrowser = (typeof SUPPORTED_BROWSERS)[number];

export interface LootLogConfig {
  cookies: {
    enabled: boolean;
    browser: SupportedBrowser | null;
  };
}

const DEFAULT_CONFIG: LootLogConfig = {
  cookies: {
    enabled: false,
    browser: null,
  },
};

function writeConfig(config: LootLogConfig): void {
  ensureDirs();

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n", {
    encoding: "utf-8",
  });
}

export function loadConfig(): LootLogConfig {
  ensureDirs();

  if (!fs.existsSync(CONFIG_FILE)) {
    writeConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
  } catch {
    throw new Error(`Invalid JSON in configuration file: ${CONFIG_FILE}`);
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Invalid LootLog configuration.");
  }

  const config = parsed as Record<string, unknown>;
  const cookies = config.cookies;

  if (
    typeof cookies !== "object" ||
    cookies === null ||
    Array.isArray(cookies)
  ) {
    throw new Error("Invalid cookies configuration.");
  }

  const cookieConfig = cookies as Record<string, unknown>;

  if (typeof cookieConfig.enabled !== "boolean") {
    throw new Error("cookies.enabled must be a boolean.");
  }

  if (
    cookieConfig.browser !== null &&
    !SUPPORTED_BROWSERS.includes(cookieConfig.browser as SupportedBrowser)
  ) {
    throw new Error("Unsupported browser in LootLog configuration.");
  }

  if (cookieConfig.enabled && cookieConfig.browser === null) {
    throw new Error("A browser must be selected when cookies are enabled.");
  }

  return {
    cookies: {
      enabled: cookieConfig.enabled,
      browser: cookieConfig.browser as SupportedBrowser | null,
    },
  };
}

export function setCookiesBrowser(browser: SupportedBrowser | null): void {
  const config = loadConfig();

  config.cookies.enabled = browser !== null;
  config.cookies.browser = browser;

  writeConfig(config);
}

export function getCookiesBrowser(): string {
  const config = loadConfig();

  if (!config.cookies.enabled) {
    return "Browser cookies are disabled.";
  }

  return `Browser cookies are enabled (${config.cookies.browser}).`;
}
