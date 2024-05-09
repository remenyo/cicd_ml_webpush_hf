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

app.use("/api/image", expressHttpProxy(fileStoreURL));
app.use("/api/subscribe", expressHttpProxy(subscriptionURL));
app.use("/", expressHttpProxy(webpageHostURL)); // Default route for all other paths

app.listen(portNumber, () => {
  console.log(`Reverse Proxy listening on port ${portNumber}`);
});
