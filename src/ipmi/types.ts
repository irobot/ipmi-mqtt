import type { DeviceInfo, Sensor, SensorComponent } from "@/types"

export const InterfaceTypes = ["lan", "lanplus", "open"] as const
export type InterfaceType = (typeof InterfaceTypes)[number]

export type IpmiToolConfig = {
  host: string
  user: string
  password: string
  interface: InterfaceType
}

export type IpmiServerConfig = IpmiToolConfig & {
  maxFanSpeed: number
  minFanSpeed: number
}

const IsAllowed = ["allowed", "not allowed"] as const
const InactiveOrActive = ["inactive", "active"] as const
const TrueOrFalse = ["true", "false"] as const
const OnOrOff = ["on", "off"] as const

type IsAllowed = (typeof IsAllowed)[number]
type InactiveOrActive = (typeof InactiveOrActive)[number]
type TrueOrFalse = (typeof TrueOrFalse)[number]
type OnOrOff = (typeof OnOrOff)[number]

export type ValidChassisSensorValues =
  | IsAllowed
  | InactiveOrActive
  | OnOrOff
  | TrueOrFalse

export const ChassisSensors = {
  "System Power": OnOrOff,
  "Power Overload": TrueOrFalse,
  "Power Interlock": InactiveOrActive,
  "Main Power Fault": TrueOrFalse,
  "Power Control Fault": TrueOrFalse,
  "Chassis Intrusion": InactiveOrActive,
  "Front-Panel Lockout": InactiveOrActive,
  "Drive Fault": TrueOrFalse,
  "Cooling/Fan Fault": TrueOrFalse,
  "Sleep Button Disable": IsAllowed,
  "Diag Button Disable": IsAllowed,
  "Reset Button Disable": IsAllowed,
  "Power Button Disable": IsAllowed,
  "Sleep Button Disabled": TrueOrFalse,
  "Diag Button Disabled": TrueOrFalse,
  "Reset Button Disabled": TrueOrFalse,
  "Power Button Disabled": TrueOrFalse,
} as const

export type ChassisSensorNames = keyof typeof ChassisSensors

export type ChassisStatus = {
  [key in ChassisSensorNames]: (typeof ChassisSensors)[key][number]
}

export type CollectSensorsFn = (
  cfg: IpmiServerConfig
) => Promise<SensorComponent[]>

export type GetDeviceInfoFn = (
  config: IpmiToolConfig,
  deviceNameOverride?: string | undefined
) => Promise<DeviceInfo>

export type FormatDeviceInfoFn = (
  deviceInfo: Omit<DeviceInfo, "deviceUrl">
) => string

export type GetOverrideStateFn = (
  config: IpmiServerConfig
) => Promise<"disabled" | "enabled" | "unknown">

export type FormatSensorInfoFn = (sensorInfos: Sensor[]) => string

export type CollectDeviceDataTemplateType = [
  [GetDeviceInfoFn, FormatDeviceInfoFn, string],
  [GetOverrideStateFn, undefined, string],
  [CollectSensorsFn, FormatSensorInfoFn, string],
  [CollectSensorsFn, FormatSensorInfoFn, string],
  [CollectSensorsFn, FormatSensorInfoFn, string]
]
