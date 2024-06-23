import express from "express";
import bodyParser from "body-parser";
import cors from "cors";

import checkoutRoutes from "./controllers/checkout.routes.js";

const corsOptions = {
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE"],
};

const app = express();
app.use(bodyParser.json());
app.use(cors(corsOptions));

app.use("/api/checkout", checkoutRoutes);

app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
