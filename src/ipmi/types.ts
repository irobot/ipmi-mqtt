import { Entity } from "../types"

export const InterfaceTypes = ["lan", "lanplus", "open"] as const
export type InterfaceType = (typeof InterfaceTypes)[number]

export type IpmiServerConfig = {
  host: string
  user: string
  password: string
  interface: InterfaceType
  maxFanSpeed: number
}

export type TemperatureResult = Entity & {
  /** Temperature in degrees Celsius */
  temperature: number
}

export type FanSpeedResult = Entity & {
  rpm: number
  percent: number
}
