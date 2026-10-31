import {
  getCookiesBrowser,
  setCookiesBrowser,
  SUPPORTED_BROWSERS,
  SupportedBrowser,
} from "../../core/config";

export function setConfigCommand(key: string, value: string): void {
  if (key !== "cookies") {
    throw new Error(`Unknown configuration setting: ${key}`);
  }

  const browser = value.toLowerCase();

  if (browser === "off") {
    setCookiesBrowser(null);
    console.log("Browser cookies disabled.");
    return;
  }

  if (!SUPPORTED_BROWSERS.includes(browser as SupportedBrowser)) {
    throw new Error(
      `Unsupported browser: ${value}\nSupported browsers: ${SUPPORTED_BROWSERS.join(", ")}`,
    );
  }

  setCookiesBrowser(browser as SupportedBrowser);
  console.log(`Browser cookies enabled (${browser}).`);
  console.log("Restart the LootLog worker for this change to take effect.");
}

export function getConfigCommand(key: string): void {
  if (key !== "cookies") {
    throw new Error(`Unknown configuration setting: ${key}`);
  }

  console.log(getCookiesBrowser());
}
