import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { productImageMaintenanceStatus } from "../lib/product-image-maintenance";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json({
    ...data,
    maintenance: "product-image-cleanup-v2",
    productImages: productImageMaintenanceStatus,
  });
});

export default router;
