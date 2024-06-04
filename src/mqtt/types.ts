export type MqttDeviceInfo = {
  name: string
  identifiers: string | [string]
}

export type MqttSensor = {
  name: string
  unique_id: string
  state_topic: string
  value_template?: string
  unit_of_measurement: string
  icon?: string
  device_class?: string
}

export type MqttDevice = {
  device: MqttDeviceInfo,
  sensors?: {
    fans?: Record<number, MqttSensor>
    temperatures?: Record<number, MqttSensor>
  }
}