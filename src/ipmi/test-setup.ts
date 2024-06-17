import type { IpmiServerConfig } from "./types"

export const mockIpmiConfig = {
  host: "192.168.1.1",
  user: "ADMIN",
  password: "ADMIN",
  interface: "lanplus",
  maxFanSpeed: 17280,
  minFanSpeed: 1680,
} as const satisfies IpmiServerConfig
