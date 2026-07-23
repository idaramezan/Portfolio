import { Router, type IRouter } from "express";
import healthRouter from "./health";
import currencyRouter from "./currency";
import internationalRouter from "./international";
import adminRouter from "./admin";
import timeRouter from "./time";
import storefrontConfigRouter from "./storefront-config";

const router: IRouter = Router();

router.use(healthRouter);
if (process.env.DATABASE_URL) {
  const [{ default: artworksRouter }, { default: eventsRouter }, { default: newsletterRouter }, { default: shopSettingsRouter }, { default: productMediaRouter }, { default: productImagesRouter }] = await Promise.all([
    import("./artworks"),
    import("./events"),
    import("./newsletter"),
    import("./shop-settings"),
    import("./product-media"),
    import("./product-images"),
  ]);
  router.use("/artworks", artworksRouter);
  router.use("/events", eventsRouter);
  router.use("/newsletter", newsletterRouter);
  router.use(shopSettingsRouter);
  router.use(productImagesRouter);
  router.use("/admin", productMediaRouter);
} else {
  router.use(["/artworks", "/events", "/newsletter", "/product-images"], (_request, response) =>
    response.status(503).json({ error: "This optional feature requires a database." }),
  );
}
router.use(currencyRouter);
router.use(internationalRouter);
router.use(timeRouter);
router.use(storefrontConfigRouter);
router.use("/admin", adminRouter);

export default router;
