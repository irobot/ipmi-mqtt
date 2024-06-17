import * as IpmiUtil from "@/ipmi/ipmi-util"
import { mockIpmiConfig } from "@/ipmi/test-setup"
import * as FanSensors from "./fan-sensors"

describe("Fan sensors", () => {
  describe("Output transforms", () => {
    describe("extractThirdPartyCardsFanOverrideStatus ", () => {
      test.each([
        ["16 05 00 00 00 05 00 01 00 00", "disabled"],
        ["16 05 00 00 00 05 00 00 00 00", "enabled"],
        ["unrecognized ipmitool output", "unknown"],
      ])("%s", (input, expected) => {
        expect(
          FanSensors.extractThirdPartyCardsFanOverrideStatus(input)
        ).toEqual(expected)
      })
    })

    describe("extractFanSpeedSensors (Parse fan sensor data)", () => {
      test.each([
        [
          "Fan1 RPM         | 30h | ok  |  7.1 | 4200 RPM",
          {
            entity: { id: 48, name: "Fan1" },
            role: "sensor",
            kind: "fanspeed",
            percent: 16,
            rpm: 4200,
          },
        ],
        [
          "Fan2 RPM         | 37h | ok  |  7.1 | 4800 RPM",
          {
            entity: { id: 55, name: "Fan2" },
            role: "sensor",
            kind: "fanspeed",
            percent: 20,
            rpm: 4800,
          },
        ],
      ])("%s", (input, expected) => {
        const minRPM = 1680
        const maxRPM = 17280
        expect(
          FanSensors.extractFanSpeedSensors(input, [minRPM, maxRPM])[0]
        ).toEqual(expected)
      })

      it("should throw on invalid input", () => {
        expect(() =>
          FanSensors.extractFanSpeedSensors(
            "unrecognized ipmitool output",
            [0, 1]
          )
        ).toThrow()
      })
    })
  })
})

jest.mock("../ipmi-util")

describe("Fan sensor API funcs", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  const mockedSendCommand = jest.mocked(IpmiUtil.sendCommand)
  mockedSendCommand.mockResolvedValue(
    "Fan1 RPM         | 30h | ok  |  7.1 | 4200 RPM\n"
  )

  describe("getFanSpeeds", () => {
    it("should call sendCommand", async () => {
      await FanSensors.getFanSpeeds(mockIpmiConfig)
      expect(mockedSendCommand).toHaveBeenCalledTimes(1)
    })
  })

  describe("getThirdPartyCardFanOverrideStatus", () => {
    it("should call sendCommand", async () => {
      await FanSensors.getThirdPartyCardsFanOverride(mockIpmiConfig)
      expect(mockedSendCommand).toHaveBeenCalledTimes(1)
    })
  })
})
