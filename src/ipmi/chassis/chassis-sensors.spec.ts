import { mockIpmiConfig } from "@/ipmi/test-setup"
import type { ChassisSensorNames, ChassisStatus } from "@/ipmi/types"
import type { ChassisSensor } from "@/types"
import * as IpmiUtil from "src/ipmi/ipmi-util"
import * as ChassisSensors from "./chassis-sensors"

describe("Chassis sensors output transforms", () => {
  describe("parseChassisStatus", () => {
    it("should parse text into key-value pairs", () => {
      const input = `
      System Power         : on
      Power Overload       : false
      Power Interlock      : inactive
      Main Power Fault     : false
      Power Control Fault  : false
      Power Restore Policy : previous
      Last Power Event     :
      Chassis Intrusion    : inactive
      Front-Panel Lockout  : active
    `
      const expected = {
        "System Power": "on",
        "Power Overload": "false",
        "Power Interlock": "inactive",
        "Main Power Fault": "false",
        "Power Control Fault": "false",
        "Chassis Intrusion": "inactive",
        "Front-Panel Lockout": "active",
      }
      expect(ChassisSensors.parseChassisStatus(input)).toEqual(expected)
    })

    it("should throw on invalid input", () => {
      expect(() => ChassisSensors.parseChassisStatus("")).toThrow()
    })
  })

  describe("makeChassisSensor", () => {
    type SensorDataPair = [[ChassisSensorNames, string, number], ChassisSensor]

    const sensorDataPairs: [SensorDataPair, SensorDataPair] = [
      [
        ["System Power", "on", 0],
        {
          entity: { id: 1000, name: "System Power" },
          role: "sensor",
          kind: "chassis",
          validValues: ["on", "off"],
          value: "on",
        },
      ],
      [
        ["Power Overload", "false", 1],
        {
          entity: { id: 1001, name: "Power Overload" },
          role: "sensor",
          kind: "chassis",
          validValues: ["true", "false"],
          value: "false",
        },
      ],
    ]

    it("should return valid sensor data", () => {
      const [input, expected] = sensorDataPairs[0]
      expect(ChassisSensors.makeChassisSensor(...input)).toEqual(expected)
    })

    it("should return valid sensor data", () => {
      const [[[name0, value0], sensor0], [[name1, value1], sensor1]] =
        sensorDataPairs
      const status: Partial<ChassisStatus> = {
        [name0]: value0,
        [name1]: value1,
      }
      const expected = [sensor0, sensor1]
      expect(ChassisSensors.makeChassisSensors(status)).toEqual(expected)
    })
  })
})

jest.mock("@/ipmi/ipmi-util")

describe("Chassis sensor API funcs", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  const mockedSendCommand = jest.mocked(IpmiUtil.sendCommand)

  mockedSendCommand.mockResolvedValue(`
    System Power         : on
    Power Overload       : false
    Power Interlock      : inactive
    Main Power Fault     : false
  `)

  test("getChassisStatus should call sendCommand", async () => {
    await ChassisSensors.getChassisStatus(mockIpmiConfig)
    expect(mockedSendCommand).toHaveBeenCalledTimes(1)
  })

  test("getChassisSensors should call sendCommand", async () => {
    await ChassisSensors.getChassisSensors(mockIpmiConfig)
    expect(mockedSendCommand).toHaveBeenCalledTimes(1)
  })
})
