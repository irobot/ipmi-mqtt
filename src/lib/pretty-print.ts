import { DeviceInfo } from "../types"

export const formatDeviceInfo = (deviceInfo: DeviceInfo) =>
`
  Manufacturer:  ${deviceInfo.manufacturer}
  Product Name:  ${deviceInfo.productName}
  Serial Number: ${deviceInfo.serialNumber}
`

export const formatSensorInfo = (sensorInfo: { id: number, name: string }) =>
`  ID: ${String(sensorInfo.id).padStart(3, '0')}, Name: ${sensorInfo.name}`
