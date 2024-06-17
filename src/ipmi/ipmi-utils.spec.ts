import type {
  ChassisSensor,
  DeviceInfo,
  FanSpeedSensor,
  Sensor,
  TemperatureSensor,
} from "@/types"
import { type ChildProcess } from "child_process"
import * as IpmiUtil from "./ipmi-util"
import { execAsync } from "./node-util"
import type {
  CollectDeviceDataTemplateType,
  IpmiServerConfig,
  IpmiToolConfig,
} from "./types"

const fakeIpmiToolConfig = {
  host: "0.0.0.0",
  user: "grapes",
  password: "kale",
  interface: "lan",
} as const satisfies IpmiToolConfig

type PromiseWithChild<T> = Promise<T> & { child: ChildProcess }

// Mock execAsync so as to not actually call into the OS
jest.mock("./node-util")
const mockedExecAsync = jest.mocked(execAsync)
mockedExecAsync.mockImplementation((command, _options) => {
  const promise = new Promise((resolve, reject) => {
    if (command.endsWith("DoFail")) {
      reject({ stdout: null, stderr: "error" })
    } else if (command.endsWith("NoStdout")) {
      resolve({ stdout: "", stderr: null })
    } else {
      resolve({ stdout: "ok", stderr: null })
    }
  })
  return promise as PromiseWithChild<{ stdout: string; stderr: string }>
})

describe("IPMI Util", () => {
  afterEach(() => jest.clearAllMocks())

  describe("formatCommand", () => {
    it("should format correctly", () => {
      const correctCommand = `ipmitool -I lan -H 0.0.0.0 -U grapes -P kale kukumba`
      expect(IpmiUtil.formatCommand("kukumba", fakeIpmiToolConfig)).toEqual(
        correctCommand
      )
    })
  })

  describe("sendCommand", () => {
    it("should return a promise", () => {
      expect(IpmiUtil.sendCommand("", fakeIpmiToolConfig)).toBeInstanceOf(
        Promise
      )
    })

    it("should call exec", async () => {
      await IpmiUtil.sendCommand("", fakeIpmiToolConfig)
      expect(execAsync).toHaveBeenCalledTimes(1)
    })

    it("should resolve if execution is successful", async () => {
      expect(await IpmiUtil.sendCommand("", fakeIpmiToolConfig)).toEqual("ok")
    })

    it("should resolve with ok on succes but no stdout", async () => {
      expect(
        await IpmiUtil.sendCommand("NoStdout", fakeIpmiToolConfig)
      ).toEqual("ok")
    })

    it("should reject if execution fails", async () => {
      await expect(
        IpmiUtil.sendCommand("DoFail", fakeIpmiToolConfig)
      ).rejects.toMatchObject({ stderr: "error" })
    })
  })

  describe("setAutoFanControl", () => {
    it("should call exec with correct ipmitool command", async () => {
      await IpmiUtil.setAutoFanControl(fakeIpmiToolConfig)
      expect(mockedExecAsync).toHaveBeenCalledWith(
        IpmiUtil.formatCommand("raw 0x30 0x30 0x01 0x01", fakeIpmiToolConfig)
      )
    })
  })

  describe("setFanSpeedPercent", () => {
    it("should call exec with correct ipmitool commands", async () => {
      await IpmiUtil.setFanSpeedPercent(67, fakeIpmiToolConfig)
      const expectedCommands = [
        IpmiUtil.formatCommand("raw 0x30 0x30 0x01 0x00", fakeIpmiToolConfig),
        IpmiUtil.formatCommand(
          "raw 0x30 0x30 0x02 0xff 0x43",
          fakeIpmiToolConfig
        ),
      ]

      expect(mockedExecAsync).toHaveBeenNthCalledWith(1, expectedCommands[0])
      expect(mockedExecAsync).toHaveBeenNthCalledWith(2, expectedCommands[1])
    })

    it("should reject if percent value is invalid", async () => {
      await expect(
        IpmiUtil.setFanSpeedPercent(-50, fakeIpmiToolConfig)
      ).rejects.toBeInstanceOf(Error)
      await expect(
        IpmiUtil.setFanSpeedPercent(101, fakeIpmiToolConfig)
      ).rejects.toBeInstanceOf(Error)
    })
  })

  const fruPrintOutput = `
    FRU Device Description : Builtin FRU Device (ID 0)
    Board Mfg Date        : Tue Jul 04 13:37:42 2017
    Board Mfg             : DELL
    Board Product         : Super Mega Hyper Server
    Board Serial          : S1234567890
    Board Part Number     : PART1234567890
    Product Manufacturer  : DELL
    Product Name          : Super Mega Hyper Server
    Product Version       : 01
    Product Serial        : BARCODE1234567890\n
  `

  describe("parseDeviceInfo", () => {
    it("should parse the output correctly", () => {
      expect(IpmiUtil.parseDeviceInfo(fruPrintOutput)).toEqual<
        Omit<DeviceInfo, "deviceUrl">
      >({
        manufacturer: "DELL",
        serialNumber: "BARCODE1234567890",
        productName: "Super Mega Hyper Server",
      })
    })

    it("should throw if no section containing (ID 0) is found", () => {
      expect(() => IpmiUtil.parseDeviceInfo("")).toThrow()
    })

    it("should not throw if Manufacturer, Name, Serial are all present", () => {
      const goodOutput = `
        Something            : (ID 0)
        Product Manufacturer : DELL
        Product Name         : Super Mega Hyper Server
        Product Serial       : BARCODE1234567890\n
      `
      expect(() => IpmiUtil.parseDeviceInfo(goodOutput)).not.toThrow()
    })

    it("should throw if Product Manufacturer is missing", () => {
      const badOutput = `
        Something            : (ID 0)
        Product Name         : Super Mega Hyper Server
        Product Serial       : BARCODE1234567890\n
      `
      expect(() => IpmiUtil.parseDeviceInfo(badOutput)).toThrow()
    })

    it("should throw if Product Name is missing", () => {
      const badOutput = `
        Something            : (ID 0)
        Product Manufacturer : DELL
        Product Serial       : BARCODE1234567890\n
      `
      expect(() => IpmiUtil.parseDeviceInfo(badOutput)).toThrow()
    })

    it("should throw if Product Serial is missing", () => {
      const badOutput = `
        Something            : (ID 0)
        Product Manufacturer : DELL
        Product Name         : Super Mega Hyper Server\n
      `
      expect(() => IpmiUtil.parseDeviceInfo(badOutput)).toThrow()
    })
  })

  describe("getDeviceInfo", () => {
    it("should call exec with correct ipmitool command", async () => {
      const expectedCommands = [
        IpmiUtil.formatCommand("fru print", fakeIpmiToolConfig),
        IpmiUtil.formatCommand("mc getsysinfo delloem_url", fakeIpmiToolConfig),
      ]
      mockedExecAsync
        .mockResolvedValueOnce({ stdout: fruPrintOutput, stderr: "" })
        .mockResolvedValueOnce({
          stdout: "http://myhomelab.internal",
          stderr: "",
        })

      const deviceInfo = await IpmiUtil.getDeviceInfo(fakeIpmiToolConfig)
      expect(mockedExecAsync).toHaveBeenNthCalledWith(1, expectedCommands[0])
      expect(mockedExecAsync).toHaveBeenNthCalledWith(2, expectedCommands[1])
      expect(deviceInfo).toEqual({
        manufacturer: "DELL",
        serialNumber: "BARCODE1234567890",
        productName: "Super Mega Hyper Server",
        deviceUrl: "http://myhomelab.internal",
      })
    })

    it("should not try to obtain deviceUrl if manufacturer is not DELL", async () => {
      const goodOutput = `
        Something            : (ID 0)
        Product Manufacturer : IBM
        Product Name         : Super Mega Hyper Server
        Product Serial       : BARCODE1234567890\n
      `
      const expectedCommand = IpmiUtil.formatCommand(
        "fru print",
        fakeIpmiToolConfig
      )

      mockedExecAsync.mockResolvedValueOnce({ stdout: goodOutput, stderr: "" })
      const deviceInfo = await IpmiUtil.getDeviceInfo(fakeIpmiToolConfig)
      expect(mockedExecAsync).toHaveBeenNthCalledWith(1, expectedCommand)
      expect(mockedExecAsync).toHaveBeenCalledTimes(1)
      expect(deviceInfo.deviceUrl).toBe("")
    })
  })

  describe("collectDeviceData", () => {
    const fakeDeviceInfo: DeviceInfo = {
      manufacturer: "DELL",
      serialNumber: "BARCODE1234567890",
      productName: "Super Mega Hyper Server",
      deviceUrl: "http://myhomelab.internal",
    }

    const temperatures: TemperatureSensor[] = [
      {
        entity: { id: 14, name: "Temp" },
        role: "sensor",
        kind: "temperature",
        temperature: 45,
      },
      {
        entity: { id: 15, name: "Temp" },
        role: "sensor",
        kind: "temperature",
        temperature: 50,
      },
    ]

    const fans: FanSpeedSensor[] = []
    const chassisSensors: ChassisSensor[] = []

    const fakeFormatSensors = (sensor: Sensor[]) =>
      `Fake sensor ${sensor[0]?.entity.name}`

    const CollectDeviceDataTemplate: CollectDeviceDataTemplateType = [
      [async () => fakeDeviceInfo, () => "", "\nGetting device info..."],
      [async () => "enabled" as const, undefined, ""],
      [async () => temperatures, fakeFormatSensors, ""],
      [async () => fans, fakeFormatSensors, ""],
      [async () => chassisSensors, fakeFormatSensors, ""],
    ] as const

    const fakeIpmiServerConfig: IpmiServerConfig = {
      ...fakeIpmiToolConfig,
      maxFanSpeed: 100,
      minFanSpeed: 0,
    }

    it("should collect device data in the expected format", async () => {
      const expected = {
        deviceInfo: fakeDeviceInfo,
        components: [
          ...temperatures,
          {
            entity: {
              id: 959,
              name: "All Fans",
            },
            role: "controllable",
            kind: "fan",
          },
        ],
      }

      const result = await IpmiUtil.collectDeviceData(
        fakeIpmiServerConfig,
        "Fake warning about third-party PCIe cards fan speed override",
        CollectDeviceDataTemplate
      )

      expect(result).toEqual(expected)
    })
  })
})
