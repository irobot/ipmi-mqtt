import * as z from 'zod';

export const SetFanSpeed = z.object({
    speed_pct: z.number().gte(0).lte(100),
});

export type SetFanSpeed = z.infer<typeof SetFanSpeed>;