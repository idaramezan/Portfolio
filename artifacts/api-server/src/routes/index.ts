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
  const [
    { default: artworksRouter },
    { default: eventsRouter },
    { default: newsletterRouter },
    { default: analyticsRouter },
    { default: shopSettingsRouter },
    { default: productMediaRouter },
    { default: productImagesRouter },
    { default: ordersRouter },
    { default: stickerDropRouter },
    { default: collectorExperienceRouter },
    { default: checkoutRouter, adminCheckoutRouter },
  ] = await Promise.all([
    import("./artworks"),
    import("./events"),
    import("./newsletter"),
    import("./analytics"),
    import("./shop-settings"),
    import("./product-media"),
    import("./product-images"),
    import("./orders"),
    import("./sticker-drop"),
    import("./collector-experience"),
    import("./checkout"),
  ]);
  router.use("/artworks", artworksRouter);
  router.use("/events", eventsRouter);
  router.use("/newsletter", newsletterRouter);
  router.use("/analytics", analyticsRouter);
  router.use(shopSettingsRouter);
  router.use(productImagesRouter);
  router.use("/admin", productMediaRouter);
  router.use("/admin/orders", ordersRouter);
  router.use(stickerDropRouter);
  router.use(collectorExperienceRouter);
  router.use("/checkout", checkoutRouter);
  router.use("/admin/checkout", adminCheckoutRouter);
} else {
  router.use(
    ["/artworks", "/events", "/newsletter", "/product-images"],
    (_request, response) =>
      response
        .status(503)
        .json({ error: "This optional feature requires a database." }),
  );
}
router.use(currencyRouter);
router.use(internationalRouter);
router.use(timeRouter);
router.use(storefrontConfigRouter);
router.use("/admin", adminRouter);

export default router;
