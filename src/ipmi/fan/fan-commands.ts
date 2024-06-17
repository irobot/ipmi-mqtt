import { sendCommand } from "@/ipmi/ipmi-util"
import type { IpmiServerConfig } from "@/ipmi/types"
import { getThirdPartyCardsFanOverride } from "./fan-sensors"

/**
 * @see getThirdPartyCardsFanOverride
 */
export const disableThirdPartyCardsFanOverride = async (
  config: IpmiServerConfig
): Promise<void> => {
  const currentStatus = await getThirdPartyCardsFanOverride(config)
  // Make sure we're getting the correct response from the server first.
  if (currentStatus !== "enabled") {
    return
  }
  await sendCommand(
    `raw 0x30 0xce 0x00 0x16 0x05 0x00 0x00 0x00 0x05 0x00 0x01 0x00 0x00\n\n`,
    config
  )
}

export const restoreThirdPartyCardsFanOverride = async (
  config: IpmiServerConfig
): Promise<void> => {
  const currentStatus = await getThirdPartyCardsFanOverride(config)
  // Make sure we're getting the correct response from the server first.
  if (currentStatus !== "disabled") {
    return
  }
  await sendCommand(
    `raw 0x30 0xce 0x00 0x16 0x05 0x00 0x00 0x00 0x05 0x00 0x00 0x00 0x00`,
    config
  )
}
