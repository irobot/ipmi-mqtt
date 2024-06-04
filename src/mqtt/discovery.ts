import { MqttClient } from "mqtt/*"
import { getAllSensors, makeDiscoveryEndpoint } from "./client"
import { MqttDevice } from "./types"

export const doHassDiscovery = (
  mqttClient: MqttClient,
  mqttDevice: MqttDevice
): string | undefined => {
  const allSensors = getAllSensors(mqttDevice)
  if (allSensors.length === 0) {
    return "No sensors"
  }

  const { device } = mqttDevice

  for (const sensor of allSensors) {
    const discoveryPayload = {
      ...sensor,
      device,
    }
    const discoveryEndpoint = makeDiscoveryEndpoint(sensor)
    mqttClient.publish(discoveryEndpoint, JSON.stringify(discoveryPayload), {
      retain: true,
    })
  }
  return
}

export const undoHassDiscovery = (
  mqttClient: MqttClient,
  mqttDevice: MqttDevice
): void => {
  const allSensors = getAllSensors(mqttDevice)
  for (const sensor of allSensors) {
    const topic = makeDiscoveryEndpoint(sensor)
    mqttClient.publish(topic, "", { retain: true })
  }
}
