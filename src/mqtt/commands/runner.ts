import type { IpmiServerConfig } from "@/ipmi/types"
import type { Command } from "@/mqtt/commands/types"
import type { DeviceData } from "@/types"
import { MqttClient } from "mqtt"
import type { z } from "zod"

const validateMessage = <T>(
  message: Buffer,
  schema: z.Schema<T>
): T | undefined => {
  const text = message.toString()
  let json = null
  try {
    json = JSON.parse(text)
  } catch (e) {
    console.warn(
      `Invalid message received: ${text}. Expected JSON. Error: ${e}.`
    )
    return undefined
  }
  const parsed = schema.safeParse(json)
  if (!parsed.success || parsed.data === undefined) {
    console.warn(`Invalid message received: ${text}. Error: ${parsed.error}.`)
    return undefined
  }
  return parsed.data
}

export const subscribeAndListen = async <T>(
  client: MqttClient,
  topicPrefix: string,
  info: DeviceData,
  config: IpmiServerConfig,
  commands: Command<unknown>[]
) => {
  const { deviceInfo } = info
  const topics = commands.map((commands) => {
    return `${topicPrefix}/${deviceInfo.serialNumber}/${commands.topic}`
  })

  await client.subscribeAsync(topics)

  const commandHandlers: { [key: string]: Command<unknown> } = {}
  for (let idx = 0; idx < commands.length; idx++) {
    const topic = topics[idx]
    const command = commands[idx]
    if (topic !== undefined && command !== undefined) {
      commandHandlers[topic] = command
    }
  }

  client.on("message", async (topic, message: Buffer) => {
    const command = commandHandlers[topic]
    if (command === undefined) {
      return
    }
    const parsed = validateMessage(message, command.schema)
    if (parsed === undefined) {
      console.error(`Message: ${message}`)
      console.error(`Topic: ${topic}`)
      return
    }
    await command.action(parsed, config)
    console.log(`Topic: ${topic}`)
    console.log(`Command ${command.topic} (${JSON.stringify(parsed)}) done.`)
  })
}
