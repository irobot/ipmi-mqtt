import { Express, Response } from "express"
import {
  getDeviceInfo,
  getFanSpeeds,
  getTemperatures,
  setFanSpeedPercent,
} from "../ipmi/ipmi-util"
import { SetFanSpeed as SetFanSpeedPayload } from "./api"
import { IpmiServerConfig } from "../ipmi/types"
import { MqttClient } from "mqtt"
import { DeviceData } from "../types"
import { makeMqttDeviceData } from "../mqtt/client"
import { doHassDiscovery, undoHassDiscovery } from "../mqtt/discovery"

function checkMqttConnected(
  mqttClient: MqttClient | undefined,
  res: Response
): mqttClient is MqttClient {
  if (mqttClient === undefined || !mqttClient.connected) {
    res.status(400).send("mqtt not connected")
    return false
  }
  return true
}

export const registerHandlers = async (
  app: Express,
  config: IpmiServerConfig
) => {
  app.get("/fanspeed/all", async (req, res) =>
    res.send(await getFanSpeeds(config))
  )

  app.get("/temperature/all", async (req, res) =>
    res.send(await getTemperatures(config))
  )

  app.get("/fanspeed/", async (req, res) => {
    const fans = await getFanSpeeds(config)
    // Guaranteed to have at least one fan, so we can just use the first one.
    const fan = fans.find((fan) => fan.id === 1) ?? fans[0]
    res.send(fan)
  })

  app.post("/fanspeed/", async (req, res) => {
    const payload = SetFanSpeedPayload.safeParse(req.body)

    if (!payload.success) {
      const issue0 = payload.error.issues[0]
      const err =
        issue0 !== undefined
          ? `${issue0.path}: ${issue0.message}`
          : "Invalid request"
      console.error(err, JSON.stringify(req.body))
      res.status(400).send(err)
      return
    }

    const speedPercent = payload.data.speed_pct

    await setFanSpeedPercent(speedPercent, config).catch((err) => {
      console.error("Error setting fan speed", err)
      res.status(400).send("Error setting fan speed")
      return
    })

    res.send("ok")
  })

  app.get("/fanspeed/:speed", async (req, res) => {
    const speedPercent = parseInt(req.params.speed)

    if (speedPercent < 0 || speedPercent > 100) {
      res.status(400).send("Speed must be between 0 and 100")
      return
    }

    await setFanSpeedPercent(speedPercent, config).catch((err) => {
      console.error("Error setting fan speed", err)
      res.status(400).send("Error setting fan speed")
      return
    })

    res.send("ok")
  })

  app.get("/device/info", async (_, res) => {
    const info = await getDeviceInfo(config).catch((err) => {
      console.error(err)
      return undefined
    })
    res.send(JSON.stringify(info))
  })
}

export const registerMqttHandlers = async (
  app: Express,
  mqttClient: MqttClient,
  deviceData: DeviceData
) => {
  const mqttDevice = makeMqttDeviceData(deviceData)

  app.put("/hass/discovery/do", async (_, res) => {
    if (!checkMqttConnected(mqttClient, res)) {
      return
    }
    const result = doHassDiscovery(mqttClient, mqttDevice)
    if (result === undefined) {
      res.send("ok")
      return
    }
    res.sendStatus(400).json({ error: result })
  })

  app.put("/hass/discovery/undo", async (_, res) => {
    if (!checkMqttConnected(mqttClient, res)) {
      return
    }
    undoHassDiscovery(mqttClient, mqttDevice)
    res.send("ok")
  })
}
