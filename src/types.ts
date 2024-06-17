export type DeviceInfo = {
  manufacturer: string
  productName: string
  serialNumber: string
  deviceUrl: string
}

export type Entity = {
  id: number
  name: string
}

export type Sensor = {
  entity: Entity
  role: "sensor"
}

export type TemperatureSensor = Sensor & {
  kind: "temperature"
  /** Temperature in degrees Celsius */
  temperature: number
}

export type FanSpeedSensor = Sensor & {
  kind: "fanspeed"
  rpm: number
  percent: number
}

export type ChassisSensor = Sensor & {
  kind: "chassis"
  validValues: readonly string[]
  value: string
}

export type ControllableFan = {
  entity: Entity
  role: "controllable"
  kind: "fan"
}

export type SensorComponent = ChassisSensor | FanSpeedSensor | TemperatureSensor

export type ControllableComponent = ControllableFan

export type EntityComponent = SensorComponent | ControllableComponent

export type DeviceData = {
  deviceInfo: DeviceInfo
  components: EntityComponent[]
}
