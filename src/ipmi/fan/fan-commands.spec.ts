import {
  disableThirdPartyCardsFanOverride,
  restoreThirdPartyCardsFanOverride,
} from "@/ipmi/fan/fan-commands"
import * as FanSensors from "@/ipmi/fan/fan-sensors"
import * as IpmiUtil from "@/ipmi/ipmi-util"
import { mockIpmiConfig } from "@/ipmi/test-setup"

jest.mock("./fan-sensors")
jest.mock("../ipmi-util")

const mockedGetOverride = jest.mocked(FanSensors.getThirdPartyCardsFanOverride)
const mockedSendCommand = jest.mocked(IpmiUtil.sendCommand)

describe("Fan commands", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("disableThirdPartyCardsFanOverride", () => {
    it("should call getThirdPartyCardsFanOverride", async () => {
      mockedGetOverride.mockResolvedValue("enabled")
      await disableThirdPartyCardsFanOverride(mockIpmiConfig)
      expect(mockedGetOverride).toHaveBeenCalledTimes(1)
    })

    it("should not call sendCommand when disabled", async () => {
      mockedGetOverride.mockResolvedValue("disabled")
      await disableThirdPartyCardsFanOverride(mockIpmiConfig)
      expect(mockedSendCommand).toHaveBeenCalledTimes(0)
    })

    it("should call sendCommand when enabled", async () => {
      mockedGetOverride.mockResolvedValue("enabled")
      await disableThirdPartyCardsFanOverride(mockIpmiConfig)
      expect(mockedSendCommand).toHaveBeenCalledTimes(1)
    })
  })

  describe("restoreThirdPartyCardsFanOverride", () => {
    test("should call getThirdPartyCardsFanOverride", async () => {
      mockedGetOverride.mockResolvedValue("enabled")
      await restoreThirdPartyCardsFanOverride(mockIpmiConfig)
      expect(mockedGetOverride).toHaveBeenCalledTimes(1)
    })

    test("should not call sendCommand when enabled", async () => {
      mockedGetOverride.mockResolvedValue("enabled")
      await restoreThirdPartyCardsFanOverride(mockIpmiConfig)
      expect(mockedSendCommand).toHaveBeenCalledTimes(0)
    })

    test("should call sendCommand when disabled", async () => {
      mockedGetOverride.mockResolvedValue("disabled")
      await restoreThirdPartyCardsFanOverride(mockIpmiConfig)
      expect(mockedSendCommand).toHaveBeenCalledTimes(1)
    })
  })
})
