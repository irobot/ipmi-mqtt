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
  rpm: number;
  percent: number;
};

export const getFanSpeed = async (
  config: IpmiServerConfig
): Promise<FanSpeedResult> => {
  const output = await sendCommand(`sdr type Fan`, config);
  const lines = output.split("\n");
  const fan1Line = lines.find((line) => line.includes("Fan1"));
  /**
   * Use regex to parse the output of ipmitool sdr type Fan, which looks like this:
   * Fan1 RPM         | 30h | ok  |  7.1 | 4200 RPM
   */
  const fan1Parsed = fan1Line?.match(/(\d+)\sRPM$/);

  const fan1RPM = fan1Parsed ? parseInt(fan1Parsed[1], 10) : null;
  if (fan1RPM === null || isNaN(fan1RPM)) {
    throw new Error(
      `Could not parse fan speed from ipmitool sdr type Fan output: ${output}`
    );
  }

  const fan1SpeedPercent = Math.round((fan1RPM / config.maxFanSpeed) * 100);
  console.log(fan1SpeedPercent);
  return { rpm: fan1RPM, percent: fan1SpeedPercent };
};

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
