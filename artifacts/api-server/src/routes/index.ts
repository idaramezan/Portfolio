import { Router, type IRouter } from "express";
import healthRouter from "./health";
import currencyRouter from "./currency";
import internationalRouter from "./international";
import adminRouter from "./admin";
import timeRouter from "./time";
import productMediaRouter from "./product-media";
import storefrontConfigRouter from "./storefront-config";

const router: IRouter = Router();

router.use(healthRouter);
if (process.env.DATABASE_URL) {
  const [{ default: artworksRouter }, { default: eventsRouter }, { default: newsletterRouter }] = await Promise.all([
    import("./artworks"),
    import("./events"),
    import("./newsletter"),
  ]);
  router.use("/artworks", artworksRouter);
  router.use("/events", eventsRouter);
  router.use("/newsletter", newsletterRouter);
} else {
  router.use(["/artworks", "/events", "/newsletter"], (_request, response) =>
    response.status(503).json({ error: "This optional feature requires a database." }),
  );
}
router.use(currencyRouter);
router.use(internationalRouter);
router.use(timeRouter);
router.use(storefrontConfigRouter);
router.use("/admin", adminRouter);
router.use("/admin", productMediaRouter);

export default router;
