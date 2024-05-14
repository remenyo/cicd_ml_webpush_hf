import express from "express";
import * as fs from "fs";
import path from "path";
import { parseArgs } from "util";
import webPush from "web-push";

const { values } = parseArgs({
  args: process.argv,
  options: {
    port: {
      type: "string",
      default: "3000",
    },
    subscriptionsFilePath: {
      type: "string",
      default: "./subscriptions",
    },
    vapidPath: {
      type: "string",
      default: "./secrets",
    },
  },
  strict: true,
  allowPositionals: true,
});

const portNumber = parseInt(values.port);
const subscriptionsFilePath = values.subscriptionsFilePath;
const vapidPath = values.vapidPath;

// ---

// Check if subscriptions directory exists
if (!fs.existsSync(subscriptionsFilePath)) {
  console.error(`No subscriptions folder ("${subscriptionsFilePath}")`);
  exit(1); // creating a folder would hide an error
}

const vapidFile = path.join(vapidPath, "VAPID.json");

// Read VAPID keys from the file
let publicVapidKey, privateVapidKey;
try {
  const vapidKeys = JSON.parse(fs.readFileSync(vapidFile, "utf-8"));
  publicVapidKey = vapidKeys.publicKey;
  privateVapidKey = vapidKeys.privateKey;
} catch (error) {
  console.error("Error reading VAPID keys:", error);
  exit(1);
}

webPush.setVapidDetails(
  "mailto:hello@11010011.xyz", // Replace with your email
  publicVapidKey,
  privateVapidKey
);

const app = express();
app.use(express.json());

app.use('/health', async (_req, res) => { res.status(200).send('OK') })

// Function to save a subscription to a file
function saveSubscription(subscription) {
  const filename = `subscription-${Date.now()}.json`;
  const filepath = path.join(subscriptionsFilePath, filename);
  fs.writeFileSync(filepath, JSON.stringify(subscription));
}

// Function to load all subscriptions from files
function loadSubscriptions() {
  const files = fs.readdirSync(subscriptionsFilePath);
  const subscriptions = files.map((file) => {
    const filepath = path.join(subscriptionsFilePath, file);
    const content = fs.readFileSync(filepath, "utf-8");
    return {
      filename: file, // Include the filename
      subscription: JSON.parse(content),
    };
  });
  return subscriptions;
}

// Handle requests for new subscriptions
app.post("/new", (req, res) => {
  console.log(`New subscription.`);

  saveSubscription(req.body);

  res.status(201).json({});

  // Send a welcome notification
  const payload = JSON.stringify({
    title: "Subscribed!",
    body: "You will see a notification like this if a new image is uploaded.",
    url: "/",
  });

  webPush
    .sendNotification(req.body, payload)
    .then(() => {
      // console.log("Notification sent.")
    })
    .catch((error) => {
      console.error(error);
    });
});

// Send notifications to all subscribers
app.post("/notify", (req, res) => {
  const notificationText = req.body.text || "Open the notification to see it.";
  const notificationUrl = req.body.url || "/";

  console.log(`New notification: "${notificationText}", "${notificationUrl}"`);

  const payload = JSON.stringify({
    title: "New image!",
    body: notificationText,
    url: notificationUrl,
  });

  const subscriptions = loadSubscriptions();

  console.log(`Sending ${subscriptions.length} notification(s)`);

  subscriptions.forEach((subscription) => {
    webPush
      .sendNotification(subscription.subscription, payload)
      .catch((error) => {
        console.error("Error sending notification:", error);
        if (error.statusCode === 404 || error.statusCode === 410) {
          const filepath = path.join(
            subscriptionsFilePath,
            subscription.filename
          );
          fs.unlinkSync(filepath);
          console.log("Subscription has expired or is no longer valid: ", error);
        }
      });
  });

  res.json({ message: "Notifications sent" });
});

app.listen(portNumber, () => {
  console.log(`Server started on port ${portNumber}`);
});
