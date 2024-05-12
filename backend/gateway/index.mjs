import { parseArgs } from "util";
import express from "express";
import expressHttpProxy from "express-http-proxy";

const { values } = parseArgs({
  args: process.argv,
  options: {
    port: {
      type: "string",
      default: "3000",
    },
    fileStoreURL: {
      type: "string",
      default: "http://localhost:3000",
    },
    webpageHostURL: {
      type: "string",
      default: "http://localhost:80",
    },
    subscriptionURL: {
      type: "string",
      default: "http://localhost:3002",
    },
  },
  strict: true,
  allowPositionals: true,
});

const portNumber = parseInt(values.port);
const fileStoreURL = values.fileStoreURL;
const webpageHostURL = values.webpageHostURL;
const subscriptionURL = values.subscriptionURL;

const app = express();

app.use('/health', async (_req, res) => {
  try {
    // Check health of services
    const healthCheckPromises = [
      fetch(`${fileStoreURL}/health`, {
        signal: AbortSignal.timeout(4_000)
      }
      ),
      fetch(`${webpageHostURL}/health`, {
        signal: AbortSignal.timeout(4_000)
      }
      ),
      fetch(`${subscriptionURL}/health`, {
        signal: AbortSignal.timeout(4_000)
      }
      )
    ];

    const responses = await Promise.all(healthCheckPromises);
    // Check if all responses are ok
    const isHealthy = responses.every(response => response.ok);

    if (isHealthy) {
      res.status(200).send('OK');
    } else {
      res.status(500).send('Error: Downstream service issue');
    }
  } catch (error) {
    console.error('Error during health check:', error);
    res.status(500).send('Error: Health check failed');
  }
});

app.use("/api/image", expressHttpProxy(fileStoreURL, { limit: "200mb" }));
app.use("/api/subscribe", expressHttpProxy(subscriptionURL));
app.use("/", expressHttpProxy(webpageHostURL)); // Default route for all other paths

app.listen(portNumber, () => {
  console.log(`Reverse Proxy listening on port ${portNumber}`);
});
