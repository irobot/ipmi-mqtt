import type { IpmiServerConfig } from "@/ipmi/types"
import { z } from "zod"

export type CommandAction<T> = (
  data: T,
  config: IpmiServerConfig
) => Promise<void>

export type Command<T> = {
  topic: string
  schema: z.Schema<T>
  action: CommandAction<T>
}

export type CommandList = Command<any>[]
