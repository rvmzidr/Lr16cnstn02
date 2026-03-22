const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const env = require("./config/env");
const apiRoutes = require("./routes");
const {
  errorHandler,
  notFoundMiddleware,
} = require("./middlewares/error.middleware");

const app = express();
const allowedOrigins = new Set(env.frontendOrigins);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));

app.get("/api/health", (_req, res) => {
  res.json({
    succes: true,
    message: "API LR16CNSTN02 operationnelle.",
    donnees: {
      appName: env.appName,
      env: env.nodeEnv,
    },
  });
});

app.use("/api", apiRoutes);
app.use(notFoundMiddleware);
app.use(errorHandler);

module.exports = app;
