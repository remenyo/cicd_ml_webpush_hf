import { parseArgs } from "util";
import express from "express";
import { ping } from "ping";

const { values } = parseArgs({
  args: process.argv,
  options: {
    port: {
      type: "string",
      default: "3000",
    },
  },
  strict: true,
  allowPositionals: true,
});

const portNumber = parseInt(values.port);

const app = express();

// Ping Google on server startup
ping("google.com")
  .then((res) => {
    console.log(`Ping to google.com successful: ${res.time}ms`);
  })
  .catch((err) => {
    console.error("Ping to google.com failed:", err);
  });

// Respond to all requests with 200 OK
app.all("*", (req, res) => {
  res.status(200).send("OK");
});

app.listen(portNumber, () => {
  console.log(`Server listening on port ${portNumber}`);
});
