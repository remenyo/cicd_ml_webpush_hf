import { parseArgs } from "util";
import * as fs from "fs";
import express from "express";
import cors from "cors";
import formidable from "formidable";

const { values } = parseArgs({
  args: process.argv,
  options: {
    port: {
      type: "string",
      default: "3000",
    },
    imageFilePath: {
      type: "string",
      default: "./images/",
    },
    descPostFix: {
      type: "string",
      default: "_desc",
    },
    processedPostFix: {
      type: "string",
      default: "_processed",
    },
    imageProcessorURL: {
      type: "string",
      default: "http://localhost:3001/detect_cars",
    },
    subscriptionURL: {
      type: "string",
      default: "http://localhost:3002",
    },
  },
  strict: true,
  allowPositionals: true,
});

console.debug(values);

const portNumber = parseInt(values.port);
const imageFilePath = values.imageFilePath;
const descPostFix = values.descPostFix;
const processedPostFix = values.processedPostFix;
const imageProcessorURL = values.imageProcessorURL;
const subscriptionURL = values.subscriptionURL;

if (!fs.existsSync(imageFilePath)) {
  console.error(`imageFilePath ${imageFilePath} does not exist.`);
  // this line would hide an error (unmounted image file path), but without it, the process fails on save: fs.mkdirSync(imageFilePath, { recursive: true });
}

const app = express();

app.use(cors());

app.use((req, res, next) => {
  // console.log(req.method, req.url); // debug logging
  next();
});

app.post("/", (req, res) => {
  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Error parsing form data:", err);
      return res.status(500).send("Error parsing form data.");
    }

    const image = files.image;
    if (!image) {
      console.error("Error: No image provided in upload request.");
      return res.status(400).send("Must upload a picture.");
    }

    let uuid = crypto.randomUUID();
    let maxTries = 10;
    while (fs.existsSync(imageFilePath + uuid) && maxTries > 0) {
      maxTries--;
      uuid = crypto.randomUUID();
    }

    if (maxTries <= 0) {
      console.error("Error: Could not generate a unique UUID for image.");
      return res.status(500).send("Could not generate valid UUID for image.");
    }

    try {
      const img = fs.readFileSync(image[0].filepath);
      fs.writeFileSync(imageFilePath + uuid, img, (err) => {
        if (err) throw err;
        console.log(`The file (${uuid}) has been saved!`);
      });

      const base64Image = img.toString("base64");

      await fetch(imageProcessorURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: base64Image }),
      })
        .then((response) => response.json())
        .then((data) => {
          const detectedImageBase64 = data.image;

          fs.writeFileSync(
            imageFilePath + uuid + processedPostFix,
            Buffer.from(detectedImageBase64, "base64"),
            (err) => {
              if (err) throw err;
              console.log(
                `The processed file (${
                  uuid + processedPostFix
                }) has been saved!`
              );
            }
          );

          const description = fields.description;
          if (description) {
            fs.writeFileSync(
              imageFilePath + uuid + descPostFix,
              description[0],
              (err) => {
                if (err) throw err;
                console.log(
                  `The description (${uuid + descPostFix}) has been saved!`
                );
              }
            );
          }
        });
      try {
        await fetch(`${subscriptionURL}/notify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: "Someone uploaded a new image.",
            url: `/image/${uuid}`,
          }),
        }).catch((e) => {
          console.error(`Notification sending failed: ${e}`);
        });
      } catch {
        // This (notification sending error) is not an "error" that needs to be sent to the client.
      }
    } catch (e) {
      console.error("Error saving image or description:", e);
      return res.status(500).send("Failed to save data");
    }

    res.status(200).send(uuid);
  });
});

app.get("/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const image = fs.readFileSync(imageFilePath + id);
    res.status(200).send(image);
  } catch (e) {
    console.error(`Error retrieving image with ID ${id}:`, e);
    res.status(404).send(e);
  }
});

app.use((req, res) => {
  console.error(`Error: Route ${req.url} not found.`);
  res.status(404).send("Page not found");
});

app.listen(portNumber, () => {
  console.log(`Listening on port ${portNumber}`);
});
