import type { Environment } from "@/environment"
import { registerHttpHandlers, registerMqttHandlers } from "@/http/handlers"
import type { IpmiServerConfig } from "@/ipmi/types"
import type { DeviceData } from "@/types"
import express, { type Express } from "express"
import { MqttClient } from "mqtt"

export const startHttpServer = (
  env: Environment,
  config: IpmiServerConfig,
  deviceData: DeviceData,
  mqttClient: MqttClient | undefined
) => {
  const app: Express = express()
  const port = env.PORT
  const host = "0.0.0.0"

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  registerHttpHandlers(app, config)

  if (mqttClient) {
    registerMqttHandlers(app, mqttClient, deviceData)
  }

  app.listen(port, host, () => {
    console.log(`[server]: Server is running at http://${host}:${port}`)
  })
}
