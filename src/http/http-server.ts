import express, { Express } from "express"
import { Environment } from "../environment"
import { IpmiServerConfig } from "../ipmi/types"
import { registerHandlers, registerMqttHandlers } from "./handlers"
import { MqttClient } from "mqtt/*"
import { DeviceData } from "../types"

export const startHttpServer = (
  env: Environment,
  config: IpmiServerConfig,
  deviceData: DeviceData,
  mqttClient: MqttClient | undefined,
) => {
  const app: Express = express()
  const port = env.PORT
  const host = "0.0.0.0"

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  registerHandlers(app, config)

  if (mqttClient) {
    registerMqttHandlers(app, mqttClient, deviceData)
  }

  app.listen(port, host, () => {
    console.log(`[server]: Server is running at http://${host}:${port}`)
  })
}
