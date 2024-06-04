import * as mqtt from "mqtt"
import { Environment } from "../environment"
import { DeviceData, Entity } from "../types"
import { MqttClient } from "mqtt"
import { FanSpeedResult, TemperatureResult } from "../ipmi/types"
import { MqttSensor, MqttDevice, MqttDeviceInfo } from "./types"

export const createClient = async (
  env: Environment
): Promise<mqtt.MqttClient> => {
  const mqttClient = await mqtt.connectAsync(env.MQTT_URL, {
    username: env.MQTT_USER,
    password: env.MQTT_PASSWORD,
  })

  console.log(mqttClient?.connected ? "mqtt connected" : "mqtt not connected")
  return mqttClient
}

const makeUniqueId = (deviceSerialNumber: string, sensor: Entity) =>
  `${deviceSerialNumber}_sensor_${sensor.kind}_${sensor.id}`

const makeTemperatureSensor = (
  sensor: Entity,
  deviceSerial: string,
): MqttSensor => {
  const unique_id = makeUniqueId(deviceSerial, sensor)
  const state_topic = `stat/ipmi_sensor/temperature`
  return {
    name: sensor.name,
    unique_id,
    state_topic,
    value_template: `{{ value_json['${unique_id}'] }}`,
    unit_of_measurement: "°C",
    device_class: "temperature",
  }
}

const makeFanSpeedSensor = (
  sensor: Entity,
  deviceSerial: string,
): MqttSensor => {
  const unique_id = makeUniqueId(deviceSerial, sensor)
  const state_topic = `stat/ipmi_sensor/fanspeed`
  return {
    name: sensor.name,
    unique_id,
    state_topic,
    value_template: `{{ value_json['${unique_id}'] }}`,
    unit_of_measurement: "RPM",
    icon: "mdi:fan",
  }
}

/**
 * Format `DeviceData` as a hass mqtt payload 
 */
export const makeMqttDeviceData = (deviceData: DeviceData): MqttDevice => {
  const { deviceInfo, entities } = deviceData
  const deviceName = deviceInfo.productName
  const serial = deviceInfo.serialNumber
  const deviceId = `mqttipmi_${serial}`

  const mqttDevice: MqttDeviceInfo = {
    name: deviceName,
    identifiers: [deviceId],
  }

  const mqttFans: Record<number, MqttSensor> = {}
  const mqttTemperatures: Record<number, MqttSensor> = {}

  for (const entity of entities) {
    const { id, kind } = entity
    if (kind === "fanspeed") {
      mqttFans[id] = makeFanSpeedSensor(entity, serial)
    } else if (kind === "temperature") {
      mqttTemperatures[id] = makeTemperatureSensor(entity, serial)
    }
  }

  return {
    device: mqttDevice,
    sensors: {
      fans: mqttFans,
      temperatures: mqttTemperatures,
    },
  }
}

export const makeDiscoveryEndpoint = (sensor: MqttSensor) =>
  `homeassistant/sensor/${sensor.unique_id}/config`

export const getAllSensors = ({ sensors }: MqttDevice) => {
  if (!sensors) {
    return []
  }

  return [
    ...Object.values(sensors.temperatures ?? {}),
    ...Object.values(sensors.fans ?? {}),
  ]
}

export const publishFanSpeeds = async (
  client: MqttClient,
  deviceSerialNumber: string,
  fanspeeds: FanSpeedResult[]
) => {
  const payload: Record<string, number> = {}
  for (const sensor of fanspeeds) {
    const uid = makeUniqueId(deviceSerialNumber, sensor)
    payload[uid] = sensor.rpm
  }

  const topic = `stat/ipmi_sensor/fanspeed`
  client.publish(topic, JSON.stringify(payload))
}

export const publishTemperatures = async (
  client: MqttClient,
  deviceSerialNumber: string,
  temperatureSensorStates: TemperatureResult[]
) => {
  const payload: Record<string, number> = {}
  for (const sensor of temperatureSensorStates) {
    const uid = makeUniqueId(deviceSerialNumber, sensor)
    payload[uid] = sensor.temperature
  }

  const topic = `stat/ipmi_sensor/temperature`
  client.publish(topic, JSON.stringify(payload))
}
