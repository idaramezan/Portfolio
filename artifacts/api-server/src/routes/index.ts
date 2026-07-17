import { Router, type IRouter } from "express";
import healthRouter from "./health";
import artworksRouter from "./artworks";
import eventsRouter from "./events";
import newsletterRouter from "./newsletter";
import checkoutRouter from "./checkout";
import webhooksRouter from "./webhooks";
import printsRouter from "./prints";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/artworks", artworksRouter);
router.use("/events", eventsRouter);
router.use("/newsletter", newsletterRouter);
router.use("/checkout", checkoutRouter);
router.use("/webhooks", webhooksRouter);
router.use("/prints", printsRouter);

export default router;
