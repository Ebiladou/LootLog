import dns from "node:dns";

const dnsPromises = dns.promises;

export type ConnectivityChangeHandler = (connected: boolean) => void;

export class ConnectivityMonitor {
  private readonly checkInterval: number;
  private readonly onChange: ConnectivityChangeHandler;

  private timer: NodeJS.Timeout | null = null;
  private connected: boolean | null = null;

  constructor(
    onChange: ConnectivityChangeHandler,
    checkInterval = 5000
  ) {
    this.onChange = onChange;
    this.checkInterval = checkInterval;
  }

  start(): void {
    if (this.timer !== null) {
      return;
    }

    void this.check();

    this.timer = setInterval(() => {
      void this.check();
    }, this.checkInterval);
  }

  stop(): void {
    if (this.timer === null) {
      return;
    }

    clearInterval(this.timer);
    this.timer = null;
  }

  private async check(): Promise<void> {
    const connected = await this.isConnected();

    if (this.connected === connected) {
      return;
    }

    this.connected = connected;
    this.onChange(connected);
  }

  private async isConnected(): Promise<boolean> {
    try {
      await dnsPromises.resolve4("www.youtube.com");
      return true;
    } catch {
      return false;
    }
  }
}