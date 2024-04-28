import express from "express";
import { parseArgs } from "util";
import path from "path"; // Import the path module
import { fileURLToPath } from "url"; // Import fileURLToPath

const { values } = parseArgs({
  args: process.argv,
  options: {
    port: {
      type: "string",
      default: "3000",
    },
    staticFilePath: {
      type: "string",
      default: "./public",
    },
  },
  strict: true,
  allowPositionals: true,
});

const portNumber = parseInt(values.port);
const staticFilePath = values.staticFilePath;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Serve static files from the staticfilePath directory
app.use(express.static(path.join(__dirname, staticFilePath)));

// Log incoming requests
app.use((req, res, next) => {
  console.log(`Received request for: ${req.path}`);
  next();
});

app.get("*", (req, res) => {
  const fullPath = path.join(__dirname, staticFilePath, "index.html");
  console.log(`Sending index.html from: ${fullPath}`);
  res.sendFile(fullPath, (err) => {
    if (err) {
      console.error("Error sending file", err);
      res.status(500).send("Error while sending index.html");
    }
  });
});

app.listen(portNumber, () => {
  console.log(`Listening on port ${portNumber}`);
});
