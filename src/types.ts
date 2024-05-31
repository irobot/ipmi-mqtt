export type TemperatureResult = {
  id: number
  /** Temperature in degrees Celsius */
  temperature: number
  name: string
}

export type FanSpeedResult = {
  id: number
  rpm: number
  percent: number
  name: string
}