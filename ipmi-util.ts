import { exec } from "child_process";

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

type FanSpeedResult = {
  id: number
  rpm: number
  percent: number
  name: string
};

export const getFanSpeeds = async (
  config: IpmiServerConfig
): Promise<FanSpeedResult[]> => {
  const output = await sendCommand(`sdr type Fan`, config)
  const lines = output.split("\n")

  /**
   * Use regex to parse the output of ipmitool sdr type Fan, which looks like this:
   * Fan1 RPM         | 30h | ok  |  7.1 | 4200 RPM
   */
  const regex = /^(Fan(\d+))\s+RPM.*\|\s(\d+)\sRPM$/
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
    const id = parseInt(match[2], 10);
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
