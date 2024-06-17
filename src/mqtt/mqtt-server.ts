import type { Environment } from "@/environment"
import { getChassisSensors } from "@/ipmi/chassis/chassis-sensors"
import { getFanSpeeds } from "@/ipmi/fan/fan-sensors"
import { getTemperatures } from "@/ipmi/temperature/temperature-sensors"
import type { IpmiServerConfig } from "@/ipmi/types"
import { tick } from "@/lib/periodic-task"
import {
  publishChassisSensors,
  publishFanSpeeds,
  publishTemperatures,
} from "@/mqtt/client"
import { MQTTCommands } from "@/mqtt/commands/commands"
import { subscribeAndListen } from "@/mqtt/commands/runner"
import type { DeviceData } from "@/types"
import { MqttClient } from "mqtt"

export const runMqttTasks = (
  mqttClient: MqttClient,
  deviceData: DeviceData,
  env: Environment,
  config: IpmiServerConfig
) => {
  tick(env.MQTT_TEMPS_UPDATE_INTERVAL_MS, config, async (config) => {
    const temps = await getTemperatures(config)
    await publishTemperatures(
      mqttClient,
      deviceData.deviceInfo.serialNumber,
      temps
    )
  })

  tick(env.MQTT_FANS_UPDATE_INTERVAL_MS, config, async (config) => {
    const fanspeeds = await getFanSpeeds(config)
    await publishFanSpeeds(
      mqttClient,
      deviceData.deviceInfo.serialNumber,
      fanspeeds
    )
  })

  tick(30000, config, async (config) => {
    const chassisSensors = await getChassisSensors(config)
    await publishChassisSensors(
      mqttClient,
      deviceData.deviceInfo.serialNumber,
      chassisSensors
    )
  })

  subscribeAndListen(
    mqttClient,
    env.MQTT_COMMAND_TOPIC_PREFIX,
    deviceData,
    config,
    MQTTCommands
  )
}
