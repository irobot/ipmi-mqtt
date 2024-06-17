import { InterfaceTypes } from "@/ipmi/types"
import * as z from "zod"

export const Environment = z.object({
  IPMI_HOST: z.string().ip(),
  IPMI_USER: z.string(),
  IPMI_PASSWORD: z.string(),
  IPMI_MAX_FAN_SPEED: z.coerce.number(),
  IPMI_MIN_FAN_SPEED: z.coerce.number(),
  IPMI_INTERFACE: z.enum(InterfaceTypes).default("lanplus"),
  PORT: z.coerce.number().positive().lt(65536).default(3000),
  DEVICE_NAME_OVERRIDE: z.string().optional(),
  ENABLE_MQTT: z.coerce.boolean().default(false),
  MQTT_URL: z.string().url(),
  MQTT_USER: z.string(),
  MQTT_PASSWORD: z.string(),
  MQTT_TEMPS_UPDATE_INTERVAL_MS: z.coerce
    .number()
    .nonnegative()
    .default(10000)
    .describe("Set to 0 to disable periodic updates"),
  MQTT_FANS_UPDATE_INTERVAL_MS: z.coerce
    .number()
    .nonnegative()
    .default(10000)
    .describe("Set to 0 to disable periodic updates"),
  MQTT_COMMAND_TOPIC_PREFIX: z.string().default("command/ipmi"),
})

export type Environment = z.infer<typeof Environment>
