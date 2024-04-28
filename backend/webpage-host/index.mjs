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

const app = express();

// Serve static files from the 'public' directory
app.use(express.static(staticFilePath));

// For all other routes (SPA routes), serve index.html
app.get("*", (req, res) => {
  const __filename = fileURLToPath(import.meta.url); // Get __filename
  const __dirname = path.dirname(__filename); // Get __dirname
  res.sendFile("index.html", { root: path.join(__dirname, staticFilePath) });
});

app.listen(portNumber, () => {
  console.log(`Listening on port ${portNumber}`);
});
