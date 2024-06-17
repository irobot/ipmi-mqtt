import { sendCommand } from "@/ipmi/ipmi-util"
import type { IpmiServerConfig } from "@/ipmi/types"
import type { FanSpeedSensor } from "@/types"

export const extractThirdPartyCardsFanOverrideStatus = (output: string) => {
  const match = output.trim().match(/^16 05 00 00 00 05 00 0([0-1]) 00 00/)
  if (!match || match.length < 2) {
    console.log(
      `Unrecognized output from ipmitool raw command: ${output}\n` +
        `This is likely due to the server not being a supported Dell model.`
    )
    return "unknown"
  }

  return match[1] === "1" ? "disabled" : "enabled"
}

/**
 * Checks the status of the third-party cards fan override.
 *
 * Per this thread:
 * https://www.dell.com/community/en/conversations/poweredge-hardware-general/t130-fan-speed-algorithm/647f6905f4ccf8a8de60910d
 * if there are any third-party (unapproved by DELL) cards installed in the server,
 * and the override is enabled, then the automatic fan speed
 * control algorithm is disabled.
 *
 * This means that setting the fan speed control to automatic
 * will have the effect of setting the fan speed to the maximum.
 *
 * In this case, one might want to disable the override by issuing
 * the following raw command:
 * `raw 0x30 0xce 0x00 0x16 0x05 0x00 0x00 0x00 0x05 0x00 0x01 0x00 0x00`
 *
 * The raw command restore the override (default) is as follows:
 * `raw 0x30 0xce 0x00 0x16 0x05 0x00 0x00 0x00 0x05 0x00 0x00 0x00 0x00`
 */
export const getThirdPartyCardsFanOverride = async (
  config: IpmiServerConfig
): Promise<"disabled" | "enabled" | "unknown"> => {
  const output = await sendCommand(
    "raw 0x30 0xce 0x01 0x16 0x05 0x00 0x00 0x00 ",
    config
  )
  const thirdPartyCardsOverrideStatus =
    extractThirdPartyCardsFanOverrideStatus(output)
  console.log(`Third-party fan override: ${thirdPartyCardsOverrideStatus}`)
  return thirdPartyCardsOverrideStatus
}

export const extractFanSpeedSensors = (
  output: string,
  [minFanSpeed, maxFanSpeed]: [number, number]
): FanSpeedSensor[] => {
  const lines = output.split("\n")

  /**
   * Use regex to parse the output of ipmitool sdr type Fan, which looks like this:
   * Fan1 RPM         | 30h | ok  |  7.1 | 4200 RPM
   *
   * Group 1: Fan1 - name
   * Group 2: 30   - id (I assume this is the sensor port number, but I'm not sure)
   * Group 3: 4200 - rpm
   */
  const regex = /^(Fan\d+)\s+RPM\s*\|\s(\d+)h\s.*\|\s(\d+)\sRPM$/
  // Remove lines that don't match the regex.
  const fanLines = lines.filter((line) => regex.test(line))
  if (fanLines.length === 0) {
    throw new Error(
      `Could not parse fan speed from ipmitool sdr type Fan output: ${output}`
    )
  }

  const fanSpeeds = fanLines.map((line): FanSpeedSensor => {
    // match is never undefined due to the filter above.
    const match = line.match(regex)!
    // Again, the filter and the regexp match ensure that
    // name, id and rpm are valid
    const name = match[1]!
    const id = parseInt(match[2]!, 16)
    const rpm = parseInt(match[3]!, 10)
    const range = maxFanSpeed - minFanSpeed
    const percent = Math.round(((rpm - minFanSpeed) / range) * 100)
    const entity = { id, name }
    return {
      entity,
      role: "sensor",
      kind: "fanspeed",
      percent,
      rpm,
    }
  })
  return fanSpeeds
}

export const getFanSpeeds = async (config: IpmiServerConfig) =>
  extractFanSpeedSensors(await sendCommand(`sdr type Fan`, config), [
    config.minFanSpeed,
    config.maxFanSpeed,
  ])
