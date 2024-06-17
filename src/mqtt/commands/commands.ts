import { setAutoFanControl, setFanSpeedPercent } from "@/ipmi/ipmi-util"
import { z } from "zod"
import type { CommandAction, CommandList } from "./types"

const makeCommand = <T>(
  topic: string,
  schema: z.Schema<T>,
  action: CommandAction<T>
) => ({ topic, schema, action })

const SetFanspeedPayload = z.object({
  id: z.coerce.number(),
  speed_pct: z.coerce.number().gte(0).lte(100),
})

const PresetModes = ["auto", "quiet", "boost", "max"] as const
type PresetModes = (typeof PresetModes)[number]

const PRESET_MODE: Record<Exclude<PresetModes, "auto">, number> = {
  quiet: 24,
  boost: 50,
  max: 100,
}

const SetFanSpeedPercentagePayload = z.number()
const SetFanSpeedPresetModePayload = z.object({
  preset_mode: z.enum(PresetModes),
})

export const MQTTCommands: CommandList = [
  makeCommand("set/fanspeed", SetFanspeedPayload, async (payload, config) =>
    setFanSpeedPercent(payload.speed_pct, config)
  ),
  makeCommand(
    "set/fanspeedpercentage",
    SetFanSpeedPercentagePayload,
    async (payload, config) => setFanSpeedPercent(payload, config)
  ),
  makeCommand(
    "set/fanspeedpresetmode",
    SetFanSpeedPresetModePayload,
    async (payload, config) => {
      if (payload.preset_mode === "auto") {
        return setAutoFanControl(config)
      }
      const percentage = PRESET_MODE[payload.preset_mode]
      return setFanSpeedPercent(percentage, config)
    }
  ),
]
