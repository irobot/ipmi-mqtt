import { formatDeviceInfo, formatSensorInfo } from "@/lib/pretty-print"
import type { DeviceData, DeviceInfo, EntityComponent } from "@/types"
import { getChassisSensors } from "./chassis/chassis-sensors"
import { getFanSpeeds, getThirdPartyCardsFanOverride } from "./fan/fan-sensors"
import { execAsync } from "./node-util"
import { getTemperatures } from "./temperature/temperature-sensors"
import type {
  CollectDeviceDataTemplateType,
  IpmiServerConfig,
  IpmiToolConfig,
} from "./types"

export const formatCommand = (command: string, config: IpmiToolConfig) =>
  `ipmitool -I ${config.interface} -H ${config.host} -U ${config.user} -P ${config.password} ${command}`

export const sendCommand = async (
  command: string,
  config: IpmiToolConfig
): Promise<string> => {
  const cmd = formatCommand(command, config)
  const { stdout } = await execAsync(cmd)
  return stdout || "ok"
}

export const setAutoFanControl = async (config: IpmiToolConfig) => {
  await sendCommand("raw 0x30 0x30 0x01 0x01", config)
  console.log(`Set automatic fan speed control`)
}

export const setFanSpeedPercent = async (
  speedPercent: number,
  config: IpmiToolConfig
) => {
  if (isNaN(speedPercent) || speedPercent < 0 || speedPercent > 100) {
    const err = `speedPercent out of range [0,100]. Got ${speedPercent}`
    throw new Error(err)
  }

  const speedHex = speedPercent.toString(16)

  await sendCommand("raw 0x30 0x30 0x01 0x00", config)
  await sendCommand(`raw 0x30 0x30 0x02 0xff 0x${speedHex}`, config)
  console.log(`Set fan speed to ${speedPercent}%`)
}

export const parseDeviceInfo = (
  output: string,
  deviceNameOverride?: string | undefined
): Omit<DeviceInfo, "deviceUrl"> => {
  const sections = output.split("\n\n")
  const mainSection = sections.find((section) => section.includes("(ID 0)"))
  if (!mainSection) {
    throw new Error(
      `Could not find device info in ipmitool fru print output: ${output}`
    )
  }
  const lines = mainSection.trimStart().split("\n")
  const kv = lines
    .map((line) => line.split(":"))
    .reduce((acc: Record<string, string>, [key, value]) => {
      const k = key?.trim()
      const v = value?.trim()
      if (k && v) {
        acc[k] = v
      }
      return acc
    }, {})

  const manufacturer = kv["Product Manufacturer"]
  const serialNumber = kv["Product Serial"]
  const productName = deviceNameOverride ?? kv["Product Name"]

  if (!manufacturer || !serialNumber || !productName) {
    throw new Error(
      "Could not parse device info from ipmitool fru print output"
    )
  }

  return {
    manufacturer,
    serialNumber,
    productName,
  }
}

/**
 * Collect information about the device, including the manufacturer and model.
 */
export const getDeviceInfo = async (
  config: IpmiToolConfig,
  deviceNameOverride?: string | undefined
): Promise<DeviceInfo> => {
  const output = await sendCommand("fru print", config)
  const info = parseDeviceInfo(output, deviceNameOverride)
  const isDell = info.manufacturer.toUpperCase() === "DELL"
  const deviceUrl = isDell
    ? (await sendCommand("mc getsysinfo delloem_url", config)) ?? ""
    : ""

  return { ...info, deviceUrl }
}

/**
 * Controllable fan entity.
 * Represents the command to set the speed (%) of all fans simultaneously.
 * */
const AllFansSpeedPercentageControl: EntityComponent[] = [
  {
    entity: { id: 959, name: "All Fans" },
    role: "controllable",
    kind: "fan",
  },
]

const ThirdPartyCardsFanOverrideWarning =
  `The third party cards fan override is enabled.\n` +
  `Setting fan speed control to Automatic will cause the fan speed to be set 100%\n` +
  `Consider disabling the third party cards fan override if you are using a Dell\n` +
  `server with third party PCIe cards.\n\n` +
  `To disable the third party cards fan override run:\n\n` +
  `ipmitool raw 0x30 0xce 0x00 0x16 0x05 0x00 0x00 0x00 0x05 0x00 0x01 0x00 0x00\n`

const CollectDeviceDataTemplate: CollectDeviceDataTemplateType = [
  [getDeviceInfo, formatDeviceInfo, "\nGetting device info..."],
  [getThirdPartyCardsFanOverride, undefined, ThirdPartyCardsFanOverrideWarning],
  [getTemperatures, formatSensorInfo, "Getting temperature sensors..."],
  [getFanSpeeds, formatSensorInfo, "\nGetting fan sensors..."],
  [getChassisSensors, formatSensorInfo, "\n\nGetting chassis sensors..."],
] as const

/**
 *  Collect general information about the device, and available sensors
 */
export const collectDeviceData = async (
  config: IpmiServerConfig,
  deviceNameOverride?: string | undefined,
  deviceDataTemplate = CollectDeviceDataTemplate
): Promise<DeviceData> => {
  const [deviceTemplate, checkOverride, ...sensorTemplate] = deviceDataTemplate

  const [collector, formatter, message] = deviceTemplate
  console.log(message)
  const deviceInfo = await collector(config, deviceNameOverride)
  console.log(formatter(deviceInfo))

  const components: EntityComponent[] = []
  for (const [collector, formatter, message] of sensorTemplate) {
    console.log(message)
    const sensors = await collector(config)
    console.log(formatter(sensors))
    components.push(...sensors)
  }

  if (deviceInfo.manufacturer.toUpperCase() === "DELL") {
    const [collector, _formatter, message] = checkOverride
    const thirdPartyCardsFanOverride = await collector(config)
    if (thirdPartyCardsFanOverride === "enabled") {
      console.warn(message)
    }
  }

  return {
    deviceInfo,
    components: [...components, ...AllFansSpeedPercentageControl],
  }
}
