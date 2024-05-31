import * as z from 'zod';

export const Environment = z.object({
  IPMI_HOST: z.string().ip(),
  IPMI_USER: z.string(),
  IPMI_PASSWORD: z.string(),
  IPMI_MAX_FAN_SPEED: z.coerce.number(),
  PORT: z.coerce.number().default(3000)
})

export type Environment = z.infer<typeof Environment>
