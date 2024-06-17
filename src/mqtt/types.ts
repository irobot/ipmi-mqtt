export type MqttDeviceInfo = {
  name: string
  identifiers: string | [string]
  configuration_url?: string
  serial_number?: string
  manufacturer?: string
}

export type Integration =
  | "sensor"
  | "binary_sensor"
  | "switch"
  | "light"
  | "cover"
  | "fan"

export type MqttEntity = {
  name: string
  unique_id: string
  integration: Integration
  icon?: string
  device_class?: string
}

export type MqttSensor = MqttEntity & {
  state_topic: string
  value_template?: string
  unit_of_measurement?: string
  options?: readonly string[]
}

export type MqttControllable = MqttEntity & {
  command_topic: string
}

export type MqttFan = MqttControllable & {
  percentage_state_topic?: string
  percentage_command_topic?: string
  percentage_value_template?: string
  state_topic?: string
  preset_mode_state_topic?: string
  preset_mode_command_topic?: string
  preset_mode_command_template?: string
  preset_mode_value_template?: string
  preset_modes?: string[]
}

export type MqttComponent = MqttControllable | MqttSensor

export type MqttDevice = {
  device: MqttDeviceInfo
  components: MqttComponent[]
}
