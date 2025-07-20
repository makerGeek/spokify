import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeSentry, captureAPIError } from "./lib/sentry";

// Initialize Sentry before everything else
initializeSentry();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Enhanced error handling middleware with Sentry integration
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log to Sentry for production error tracking
    if (process.env.NODE_ENV === "production" || status >= 500) {
      captureAPIError(err, req, {
        statusCode: status,
        userAgent: req.get("User-Agent"),
        userId: (req as any).user?.id,
      });
    }

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error(`[${req.method} ${req.path}] ${status}: ${message}`);
      if (err.stack) {
        console.error(err.stack);
      }
    }

    // Send user-friendly error response
    const isProduction = process.env.NODE_ENV === "production";
    res.status(status).json({
      message: isProduction && status >= 500 ? "Something went wrong. Please try again." : message,
      ...(isProduction ? {} : { stack: err.stack }),
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
