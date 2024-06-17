import { sendCommand } from "@/ipmi/ipmi-util"
import type { IpmiServerConfig } from "@/ipmi/types"
import type { Entity, TemperatureSensor } from "@/types"

export const parseTemperatureData = (output: string): TemperatureSensor[] => {
  const lines = output.split("\n")

  /**
   * Use regex to parse the output of ipmitool sdr type Temp, which looks like this:
   * Inlet Temp       | 04h | ok  |  7.1 | 21 degrees C
   * Exhaust Temp     | 01h | ok  |  7.1 | 38 degrees C
   * Temp             | 0Eh | ok  |  3.1 | 45 degrees C
   * Temp             | 0Fh | ok  |  3.2 | 50 degrees C
   *
   * Group 1: Inlet Temp - name
   * Group 2: 04         - id (I assume this is the sensor port number, but I'm not sure)
   * Group 3: 21         - temperature in Celsius
   */
  const regex = /^(.*)\s*\|\s([\dABCDEF]+)h\s.*\|\s(\d+)\sdegrees C$/
  // Remove lines that don't match the regex.
  const fanLines = lines.filter((line) => regex.test(line))
  if (fanLines.length === 0) {
    throw new Error(
      `Could not parse temperature data from ipmitool sdr type Temp output: ${output}`
    )
  }

  const temperatures = fanLines.map((line): TemperatureSensor => {
    // match is never undefined due to the filter above.
    const match = line.match(regex)!
    // Once again, the filter and the regexp match ensure that
    // name, id and temperature are valid
    const name = match[1]!.trim()
    const id = parseInt(match[2]!, 16)
    const temperature = parseInt(match[3]!, 10)
    const entity: Entity = { id, name }
    return {
      entity,
      role: "sensor",
      kind: "temperature",
      temperature,
    }
  })

  return temperatures
}

export const getTemperatures = async (
  config: IpmiServerConfig
): Promise<TemperatureSensor[]> => {
  const output = await sendCommand(`sdr type Temperature`, config)
  return parseTemperatureData(output)
}
