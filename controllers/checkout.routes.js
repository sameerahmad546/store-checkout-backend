import express from "express";
const router = express.Router();

import { createPayment, confirmPayment } from "./checkout.controllers.js";
router.post("/create-payment", createPayment);
router.post("/confirm-payment", confirmPayment);

export default router;
