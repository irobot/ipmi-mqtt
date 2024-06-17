import { formatDeviceInfo, formatSensorInfo } from "@/lib/pretty-print"
import type { DeviceInfo, Sensor } from "@/types"

describe("Pretty print", () => {
  test("formatDeviceInfo", () => {
    const FakeDevice: Omit<DeviceInfo, "deviceUrl"> = {
      manufacturer: "Mordor",
      productName: "Cupcake",
      serialNumber: "0x9876",
    }

    expect(formatDeviceInfo(FakeDevice)).toEqual(
      `\n` +
        `  Manufacturer:  Mordor\n` +
        `  Product Name:  Cupcake\n` +
        `  Serial Number: 0x9876\n`
    )
  })

  test("formatSensorInfo", () => {
    const fakeSensorInfo: Sensor[] = [
      { entity: { id: 10, name: "Fake Sensor #10" }, role: "sensor" },
      { entity: { id: 89, name: "Fake Sensor #89" }, role: "sensor" },
    ]

    const expected =
      "  ID: 010, Name: Fake Sensor #10\n" + "  ID: 089, Name: Fake Sensor #89"

    const output = formatSensorInfo(fakeSensorInfo)
    expect(output).toEqual(expected)
  })
})
