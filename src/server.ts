import dotenv from "dotenv"
import {
  collectDeviceData,
  getFanSpeeds,
  getTemperatures,
} from "./ipmi/ipmi-util"
import { Environment } from "./environment"
import { tick } from "./lib/periodic-task"
import { startHttpServer } from "./http/http-server"
import { InterfaceType, InterfaceTypes, IpmiServerConfig } from "./ipmi/types"
import {
  createClient,
  publishFanSpeeds,
  publishTemperatures,
} from "./mqtt/client"

async function main() {
  dotenv.config()

  const env = Environment.parse(process.env)

  const maybeInterface = process.env.IPMI_INTERFACE as InterfaceType
  const ifc =
    maybeInterface && InterfaceTypes.indexOf(maybeInterface) > -1
      ? maybeInterface
      : "lanplus"

  const config: IpmiServerConfig = {
    host: env.IPMI_HOST ?? "192.168.1.1",
    user: env.IPMI_USER ?? "ADMIN",
    password: env.IPMI_PASSWORD ?? "ADMIN",
    interface: ifc,
    maxFanSpeed: env.IPMI_MAX_FAN_SPEED ?? 26250,
  }

  console.log(JSON.stringify({ ...config, user: "***", password: "***" }))

  const info = await collectDeviceData(config, env.DEVICE_NAME_OVERRIDE)

  const mqttClient = env.ENABLE_MQTT
    ? await createClient(env).catch((err) => {
        console.warn(
          `Failed to initialize MQTT client: ${err}. Proceeding without MQTT.`
        )
        return undefined
      })
    : undefined

  if (mqttClient !== undefined) {
    tick(env.MQTT_TEMPS_UPDATE_INTERVAL_MS, config, async (config) => {
      const temps = await getTemperatures(config)
      publishTemperatures(mqttClient, info.deviceInfo.serialNumber, temps)
    })

    tick(env.MQTT_FANS_UPDATE_INTERVAL_MS, config, async (config) => {
      const fanspeeds = await getFanSpeeds(config)
      publishFanSpeeds(mqttClient, info.deviceInfo.serialNumber, fanspeeds)
    })
  }

  startHttpServer(env, config, info, mqttClient)
}

main().catch((err) => {
  console.error("Error: ", err)
  process.exit(1)
})
