import type { DeviceInfo, Sensor } from "@/types"

export const formatDeviceInfo = (deviceInfo: Omit<DeviceInfo, "deviceUrl">) =>
  `
  Manufacturer:  ${deviceInfo.manufacturer}
  Product Name:  ${deviceInfo.productName}
  Serial Number: ${deviceInfo.serialNumber}
`

export const formatSensorInfo = (sensorInfos: Sensor[]): string =>
  sensorInfos
    .map(
      ({ entity }) =>
        `  ID: ${String(entity.id).padStart(3, "0")}, Name: ${entity.name}`
    )
    .join("\n")
