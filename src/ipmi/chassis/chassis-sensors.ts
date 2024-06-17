import { sendCommand } from "@/ipmi/ipmi-util"
import {
  ChassisSensors,
  type ChassisSensorNames,
  type ChassisStatus,
  type IpmiServerConfig,
} from "@/ipmi/types"
import type { ChassisSensor } from "@/types"

export const parseChassisStatus = <Result = ChassisStatus>(
  output: string
): Result => {
  /**
   * Output looks like this:

    System Power         : on
    Power Overload       : false
    Power Interlock      : inactive
    Main Power Fault     : false
    Power Control Fault  : false
    Power Restore Policy : previous
    Last Power Event     :
    Chassis Intrusion    : inactive
    Front-Panel Lockout  : active
    Drive Fault          : false
    Cooling/Fan Fault    : false
    Sleep Button Disable : not allowed
    Diag Button Disable  : allowed
    Reset Button Disable : not allowed
    Power Button Disable : allowed
    Sleep Button Disabled: false
    Diag Button Disabled : true
    Reset Button Disabled: false
    Power Button Disabled: true
   */

  const lines = output.split("\n").map((line) => line.trim())
  // Remove empty lines and lines that start with a space (which are continuations of the previous line).
  const nonEmptyLines = lines.filter((line) => line.length > 0)
  if (nonEmptyLines.length === 0) {
    throw new Error(
      `Could not parse chassis status from ipmitool output: ${output}`
    )
  }

  type KeyValue = readonly [string, string]

  // Split each line into a key-value pair.
  const kv = nonEmptyLines
    .map((line) => {
      const [k, v] = line.split(":", 2).map((item) => item.trim())
      return [k, v] as KeyValue
    })
    .filter(([k, v]) => k !== undefined && v !== undefined)

  const chassisStatus = kv.reduce<Result>((acc, kvPair) => {
    const [key, value] = kvPair
    if (
      !(ChassisSensors as Record<string, readonly string[]>)[key]?.includes(
        value
      )
    ) {
      return acc
    }
    return Object.assign({}, acc, { [key]: value })
  }, {} as Result)

  return chassisStatus
}

/**
 * Parse the output of ipmitool chassis status and return a ChassisStatus object.
 */
export const getChassisStatus = async (
  config: IpmiServerConfig
): Promise<ChassisStatus> => {
  // Parse the output of ipmitool chassis status and return a ChassisStatus object.
  return parseChassisStatus(await sendCommand(`chassis status`, config))
}

export const makeChassisSensor = (
  name: ChassisSensorNames,
  value: string,
  idx: number
): ChassisSensor => {
  const sensor: ChassisSensor = {
    entity: {
      id: idx + 1000,
      name,
    },
    value,
    role: "sensor",
    kind: "chassis",
    validValues: ChassisSensors[name],
  }
  return sensor
}

export const makeChassisSensors = (
  chassisStatus: Partial<ChassisStatus>
): ChassisSensor[] => {
  const chassisSensors: ChassisSensor[] = []

  Object.entries(chassisStatus).forEach(([name, value], idx) => {
    const sensorName = name as ChassisSensorNames
    if (ChassisSensors[sensorName]) {
      chassisSensors.push(makeChassisSensor(sensorName, value, idx))
    }
  })

  return chassisSensors
}

export const getChassisSensors = async (
  config: IpmiServerConfig
): Promise<ChassisSensor[]> =>
  makeChassisSensors(await getChassisStatus(config))
