import { Environment } from "@/environment"
import { startHttpServer } from "@/http/http-server"
import { collectDeviceData } from "@/ipmi/ipmi-util"
import type { IpmiServerConfig } from "@/ipmi/types"
import { createClient } from "@/mqtt/client"
import { runMqttTasks } from "@/mqtt/mqtt-server"
import dotenv from "dotenv"

async function main() {
  // Read .env file and set environment variables
  dotenv.config()

  const env = Environment.parse(process.env)

  const config: IpmiServerConfig = {
    host: env.IPMI_HOST ?? "192.168.1.1",
    user: env.IPMI_USER ?? "ADMIN",
    password: env.IPMI_PASSWORD ?? "ADMIN",
    interface: env.IPMI_INTERFACE,
    maxFanSpeed: env.IPMI_MAX_FAN_SPEED ?? 17280,
    minFanSpeed: env.IPMI_MIN_FAN_SPEED ?? 1680,
  }

  console.log(JSON.stringify({ ...config, user: "***", password: "***" }))

  const deviceData = await collectDeviceData(config, env.DEVICE_NAME_OVERRIDE)

  const mqttClient = env.ENABLE_MQTT ? await createClient(env) : undefined

  if (mqttClient !== undefined) {
    runMqttTasks(mqttClient, deviceData, env, config)
  }

  startHttpServer(env, config, deviceData, mqttClient)
}

main().catch((err) => {
  console.error("Error: ", err)
  process.exit(1)
})
