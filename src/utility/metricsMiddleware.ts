import { Router, Request, Response } from "express";
import { metricsService } from "./metrics.service";
;

const monitorRouter = Router();

monitorRouter.get("/metrics", async (_req: Request, res: Response) => {
  try {
    const metrics = await metricsService.getMetrics();
    res.status(200).json(metrics);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch metrics" });
  }
});

export default monitorRouter;