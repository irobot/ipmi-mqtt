import { IpmiServerConfig } from "../ipmi/types";

export const tick = (
  intervalMs: number,
  config: IpmiServerConfig,
  task: (config: IpmiServerConfig) => Promise<void>
) => {
  if (intervalMs === 0) {
    // Disable periodic task if interval is set to 0
    return
  }
  setTimeout(async () => {
    await task(config);
    tick(intervalMs, config, task);
  }, intervalMs);
};
