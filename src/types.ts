export type DeviceInfo = {
  manufacturer: string
  productName: string
  serialNumber: string
}

export type Entity = {
  id: number
  name: string
  kind: 'temperature' | 'fanspeed'
}

export type DeviceData = {
  deviceInfo: DeviceInfo
  entities: Entity[]
}
