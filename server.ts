/** basic http server listening on port 8087 */
import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import {
  InterfaceType,
  InterfaceTypes,
  IpmiServerConfig,
  getFanSpeed,
  setFanSpeedPercent,
} from "./ipmi-util";
import { Environment } from "./environment";
import { SetFanSpeed } from "./api";

dotenv.config();

const env = Environment.parse(process.env);

const app: Express = express()
const port = env.PORT
const host = "0.0.0.0"

const maybeInterface = process.env.IPMI_INTERFACE as InterfaceType;
const ifc =
  maybeInterface && InterfaceTypes.indexOf(maybeInterface) > -1
    ? maybeInterface
    : "lanplus";

const config: IpmiServerConfig = {
  host: env.IPMI_HOST ?? "192.168.1.1",
  user: env.IPMI_USER ?? "ADMIN",
  password: env.IPMI_PASSWORD ?? "ADMIN",
  interface: ifc,
  maxFanSpeed: env.IPMI_MAX_FAN_SPEED ?? 26250,
};

console.log(JSON.stringify({ ...config, user: "***", password: "***" }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/fanspeed/", async (req: Request, res: Response) => {
  const { rpm, percent } = await getFanSpeed(config);
  res.send({ fanspeed: rpm, fanSpeedPercent: percent });
});

app.post("/fanspeed/", async (req: Request, res: Response) => {
  const payload = SetFanSpeed.safeParse(req.body);

  if (!payload.success) {
    const issue0 = payload.error.issues[0];
    const err =
      issue0 !== undefined
        ? `${issue0.path}: ${issue0.message}`
        : "Invalid request";
    console.error(err, JSON.stringify(req.body));
    res.status(400).send(err);
    return;
  }

  const speedPercent = payload.data.speed_pct;

  await setFanSpeedPercent(speedPercent, config).catch((err) => {
    console.error("Error setting fan speed", err);
    res.status(400).send("Error setting fan speed");
    return;
  });

  res.send("ok");
});

app.get("/fanspeed/:speed", async (req: Request, res: Response) => {
  const speedPercent = parseInt(req.params.speed);

  if (speedPercent < 0 || speedPercent > 100) {
    res.status(400).send("Speed must be between 0 and 100");
    return;
  }

  await setFanSpeedPercent(speedPercent, config).catch((err) => {
    console.error("Error setting fan speed", err);
    res.status(400).send("Error setting fan speed");
    return;
  });

  res.send("ok");
});

app.listen(port, host, () => {
  console.log(`[server]: Server is running at http://${host}:${port}`);
});
