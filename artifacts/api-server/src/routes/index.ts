import { Router, type IRouter } from "express";
import healthRouter from "./health";
import artworksRouter from "./artworks";
import eventsRouter from "./events";
import newsletterRouter from "./newsletter";
import currencyRouter from "./currency";
import internationalRouter from "./international";
import adminRouter from "./admin";
import timeRouter from "./time";
import productMediaRouter from "./product-media";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/artworks", artworksRouter);
router.use("/events", eventsRouter);
router.use("/newsletter", newsletterRouter);
router.use(currencyRouter);
router.use(internationalRouter);
router.use(timeRouter);
router.use("/admin", adminRouter);
router.use("/admin", productMediaRouter);

export default router;
