import { makeDiscoveryEndpoint } from "@/mqtt/client"
import type { MqttDevice } from "@/mqtt/types"
import { MqttClient } from "mqtt"

export const doHassDiscovery = (
  mqttClient: MqttClient,
  mqttDevice: MqttDevice
): string | undefined => {
  if (mqttDevice.components.length === 0) {
    return "No sensors"
  }

  const { device } = mqttDevice

  for (const mqttEntity of mqttDevice.components) {
    const discoveryPayload = {
      ...mqttEntity,
      device,
    }
    const discoveryEndpoint = makeDiscoveryEndpoint(mqttEntity)
    console.log(discoveryEndpoint)
    console.log(JSON.stringify(discoveryPayload))
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
  for (const mqttEntity of mqttDevice.components) {
    const topic = makeDiscoveryEndpoint(mqttEntity)
    mqttClient.publish(topic, "", { retain: true })
  }
}
