import { exec } from "child_process";
import { FanSpeedResult, TemperatureResult } from "./types";

export const InterfaceTypes = ["lan", "lanplus", "open"] as const;
export type InterfaceType = (typeof InterfaceTypes)[number];

export type IpmiServerConfig = {
  host: string;
  user: string;
  password: string;
  interface: InterfaceType;
  maxFanSpeed: number;
};

export const sendCommand = async (
  command: string,
  config: IpmiServerConfig
): Promise<string> => {
  const cmd = `ipmitool -I ${config.interface} -H ${config.host} -U ${config.user} -P ${config.password} ${command}`;
  return await new Promise((resolve, reject) =>
    exec(cmd, (err, stdout) => {
      if (err) {
        console.error(`Error sending ipmi command ${command}`, err);
        reject(err);
      } else {
        resolve(stdout || "ok");
      }
    })
  );
};

export const getTemperatures = async (
  config: IpmiServerConfig
): Promise<TemperatureResult[]> => {
  const output = await sendCommand(`sdr type Temp`, config)
  const lines = output.split("\n")

  /**
   * Use regex to parse the output of ipmitool sdr type Fan, which looks like this:
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
      `Could not parse fan speed from ipmitool sdr type Fan output: ${output}`
    );
  }

  const temperatures = fanLines.map((line) => {
    // match is never undefined due to the filter above.
    const match = line.match(regex)!
    console.log(JSON.stringify(match))
    const name = match[1]
    const id = parseInt(match[2], 16);
    const temperature = parseInt(match[3], 10)
    return { id, name, temperature }
  })

  return temperatures
}

export const getFanSpeeds = async (
  config: IpmiServerConfig
): Promise<FanSpeedResult[]> => {
  const output = await sendCommand(`sdr type Fan`, config)
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
    );
  }

  const fanSpeeds = fanLines.map((line) => {
    // match is never undefined due to the filter above.
    const match = line.match(regex)!
    const name = match[1]
    const id = parseInt(match[2], 16);
    const rpm = parseInt(match[3], 10)
    const percent = Math.round((rpm / config.maxFanSpeed) * 100);
    return { id, name, rpm, percent }
  })

  return fanSpeeds
}

export const setFanSpeedPercent = async (
  speedPercent: number,
  config: IpmiServerConfig
) => {
  if (isNaN(speedPercent) || speedPercent < 0 || speedPercent > 100) {
    const err = `speedPercent out of range [0,100]. Got ${speedPercent}`;
    throw new Error(err);
  }

  const speedHex = speedPercent.toString(16);

  await sendCommand("raw 0x30 0x30 0x01 0x00", config);
  await sendCommand(`raw 0x30 0x30 0x02 0xff 0x${speedHex}`, config);
  console.log(`Set fan speed to ${speedPercent}%`);
};
