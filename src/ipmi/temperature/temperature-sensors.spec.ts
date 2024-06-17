import { mockIpmiConfig } from "@/ipmi/test-setup"
import type { TemperatureSensor } from "@/types"
import { getTemperatures, parseTemperatureData } from "./temperature-sensors"

const expected: TemperatureSensor[] = [
  {
    entity: { id: 4, name: "Inlet Temp" },
    role: "sensor",
    kind: "temperature",
    temperature: 21,
  },
  {
    entity: { id: 1, name: "Exhaust Temp" },
    role: "sensor",
    kind: "temperature",
    temperature: 38,
  },
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

jest.mock("../ipmi-util", () => {
  const SdrOutput = `
  Inlet Temp       | 04h | ok  |  7.1 | 21 degrees C
  Exhaust Temp     | 01h | ok  |  7.1 | 38 degrees C
  Temp             | 0Eh | ok  |  3.1 | 45 degrees C
  Temp             | 0Fh | ok  |  3.2 | 50 degrees C
  `
  return {
    ...jest.requireActual("../ipmi-util"),
    sendCommand: jest.fn().mockResolvedValue(SdrOutput),
  }
})

describe("Temperature sensors", () => {
  describe("parseTemperatureData", () => {
    it("should parse temperature data for single sensor", () => {
      expect(
        parseTemperatureData(
          "Inlet Temp       | 04h | ok  |  7.1 | 21 degrees C"
        )
      ).toEqual([expected[0]])
    })

    it("should throw for invalid sensor data", () => {
      expect(() =>
        parseTemperatureData("This string is not a valid sensor output")
      ).toThrow()
    })

    it("should return temperature data", async () => {
      expect(await getTemperatures(mockIpmiConfig)).toEqual(expected)
    })
  })
})
