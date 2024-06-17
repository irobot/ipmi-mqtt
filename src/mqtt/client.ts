import type { Environment } from "@/environment"
import type { ChassisStatus } from "@/ipmi/types"
import type {
  MqttComponent,
  MqttDevice,
  MqttDeviceInfo,
  MqttEntity,
  MqttFan,
  MqttSensor,
} from "@/mqtt/types"
import type {
  ChassisSensor,
  ControllableComponent,
  DeviceData,
  EntityComponent,
  FanSpeedSensor,
  SensorComponent,
  TemperatureSensor,
} from "@/types"
import * as mqtt from "mqtt"
import { MqttClient } from "mqtt"

export const createClient = async (
  env: Environment
): Promise<mqtt.MqttClient | undefined> => {
  const mqttClient = await mqtt
    .connectAsync(env.MQTT_URL, {
      username: env.MQTT_USER,
      password: env.MQTT_PASSWORD,
    })
    .catch((err) => {
      console.warn(
        `Failed to initialize MQTT client: ${err}. Proceeding without MQTT.`
      )
      return undefined
    })

  console.log(mqttClient?.connected ? "mqtt connected" : "mqtt not connected")
  return mqttClient
}

const makeUniqueId = (
  deviceSerialNumber: string,
  entityComponent: EntityComponent
) => {
  const { role, kind, entity } = entityComponent
  return `${deviceSerialNumber}_${role}_${kind}_${entity.id}`
}

const makeTemperatureSensor = (
  sensor: SensorComponent,
  deviceSerial: string
): MqttSensor => {
  const unique_id = makeUniqueId(deviceSerial, sensor)
  const state_topic = `stat/ipmi_sensor/temperature`
  return {
    name: sensor.entity.name,
    unique_id,
    integration: "sensor",
    state_topic,
    value_template: `{{ value_json['${unique_id}'] }}`,
    unit_of_measurement: "°C",
    device_class: "temperature",
  }
}

const makeControllableFan = (
  entityComponent: ControllableComponent,
  deviceSerial: string
): MqttFan => {
  const unique_id = makeUniqueId(deviceSerial, entityComponent)
  const command_topic = `command/ipmi_controllable/fanspeed`
  const percentage_command_topic = `command/ipmi/${deviceSerial}/set/fanspeedpercentage`
  const preset_mode_command_topic = `command/ipmi/${deviceSerial}/set/fanspeedpresetmode`
  const percentage_state_topic = `stat/ipmi_sensor/${deviceSerial}/fanspeedpercentage`
  const state_topic = `stat/ipmi_sensor/${deviceSerial}/onstate`
  return {
    name: entityComponent.entity.name,
    unique_id,
    integration: "fan",
    command_topic,
    state_topic,
    percentage_command_topic,
    percentage_state_topic,
    preset_mode_command_topic,
    preset_mode_command_template: `{ "preset_mode": "{{ value }}"}`,
    preset_modes: ["auto", "quiet", "boost", "max"],
  }
}

const makeFanSpeedSensor = (
  sensor: EntityComponent,
  deviceSerial: string
): MqttSensor => {
  const unique_id = makeUniqueId(deviceSerial, sensor)
  const state_topic = `stat/ipmi_sensor/fanspeed`
  return {
    name: sensor.entity.name,
    unique_id,
    integration: "sensor",
    state_topic,
    value_template: `{{ value_json['${unique_id}'] }}`,
    unit_of_measurement: "RPM",
    icon: "mdi:fan",
  }
}

export const makeChassisSensor = (
  sensor: ChassisSensor,
  deviceSerial: string
): MqttSensor => {
  const unique_id = makeUniqueId(deviceSerial, sensor)
  const state_topic = `stat/ipmi_sensor/chassis`
  return {
    name: sensor.entity.name,
    unique_id,
    device_class: "enum",
    options: sensor.validValues,
    integration: "sensor",
    state_topic,
    value_template: `{{ value_json['${unique_id}'] }}`,
  }
}

/**
 * Format `DeviceData` as a hass mqtt payload
 */
export const makeMqttDeviceData = (deviceData: DeviceData): MqttDevice => {
  const { deviceInfo, components } = deviceData
  const deviceName = deviceInfo.productName
  const serial = deviceInfo.serialNumber
  const deviceId = `mqttipmi_${serial}`

  const mqttDevice: MqttDeviceInfo = {
    name: deviceName,
    identifiers: [deviceId],
    configuration_url: deviceInfo.deviceUrl,
    serial_number: serial,
    manufacturer: deviceInfo.manufacturer,
  }

  const mqttComponents: MqttComponent[] = []
  for (const component of components) {
    if (component.role === "controllable") {
      if (component.kind === "fan") {
        mqttComponents.push(makeControllableFan(component, serial))
      }
    } else if (component.role === "sensor") {
      if (component.kind === "fanspeed") {
        mqttComponents.push(makeFanSpeedSensor(component, serial))
      } else if (component.kind === "temperature") {
        mqttComponents.push(makeTemperatureSensor(component, serial))
      } else if (component.kind === "chassis") {
        mqttComponents.push(makeChassisSensor(component, serial))
      }
    }
  }

  return {
    device: mqttDevice,
    components: mqttComponents,
  }
}

export const makeDiscoveryEndpoint = (entity: MqttEntity) => {
  return `homeassistant/${entity.integration}/${entity.unique_id}/config`
}

export const publishFanSpeeds = async (
  client: MqttClient,
  deviceSerialNumber: string,
  fanspeeds: FanSpeedSensor[]
) => {
  const payload: Record<string, number> = {}
  let percentSum = 0
  for (const sensor of fanspeeds) {
    const uid = makeUniqueId(deviceSerialNumber, sensor)
    payload[uid] = sensor.rpm
    percentSum += sensor.percent
  }

  const topic = `stat/ipmi_sensor/fanspeed`
  client.publish(topic, JSON.stringify(payload), { retain: true })
  const percentage_state_topic = `stat/ipmi_sensor/${deviceSerialNumber}/fanspeedpercentage`
  client.publish(
    percentage_state_topic,
    JSON.stringify(Math.round(percentSum / Math.max(1, fanspeeds.length))),
    { retain: true }
  )
}

export const publishTemperatures = async (
  client: MqttClient,
  deviceSerialNumber: string,
  temperatureSensorStates: TemperatureSensor[]
) => {
  const payload: Record<string, number> = {}
  for (const sensor of temperatureSensorStates) {
    const uid = makeUniqueId(deviceSerialNumber, sensor)
    payload[uid] = sensor.temperature
  }

  const topic = `stat/ipmi_sensor/temperature`
  client.publish(topic, JSON.stringify(payload))
}

export const publishChassisSensors = async (
  client: MqttClient,
  deviceSerialNumber: string,
  chassisSensors: ChassisSensor[]
) => {
  const payload: Record<string, string> = {}
  for (const sensor of chassisSensors) {
    const uid = makeUniqueId(deviceSerialNumber, sensor)
    payload[uid] = sensor.value
  }

  const topic = `stat/ipmi_sensor/chassis`
  client.publish(topic, JSON.stringify(payload))
}

export const publishChassisStatus = async (
  client: MqttClient,
  deviceSerialNumber: string,
  chassisState: ChassisStatus
) => {
  const state_topic = `stat/ipmi_sensor/${deviceSerialNumber}/onstate`
  const powerOn = chassisState["System Power"]
  if (powerOn !== "on") {
    client.publish(state_topic, "OFF", { retain: true })
  } else {
    client.publish(state_topic, "ON", { retain: true })
  }
}
