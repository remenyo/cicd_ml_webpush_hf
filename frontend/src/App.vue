<template>
  <div v-if="uploadMode" style="display: flex; flex-direction: column">
    <h2>Upload an image</h2>
    <div style="display: flex; flex-direction: column; text-align: left">
      <div>Description:</div>
      <input
        type="text"
        v-model="description"
        placeholder="This was my first car!"
        style="margin-bottom: 16px"
      />
      <div>File:</div>
      <input
        type="file"
        @change="onFileChanged($event)"
        accept="image/*"
        style="margin-bottom: 32px"
      />
      <input
        :disabled="!file"
        type="button"
        :value="file ? 'Upload' : 'Select a file before upload.'"
        @click="uploadImage"
      />
      <input
        type="button"
        value="Subscribe to updates"
        @click="subscribeToPushNotifications"
        style="margin-top: 128px"
      />
    </div>
  </div>
  <div v-else style="display: flex; flex-direction: column">
    <p v-if="description != null">Description: {{ description }}</p>
    <p v-else-if="loading">Loading...</p>
    <p v-else>No description</p>

    <h2 v-if="image != null">Uploaded image:</h2>
    <img
      v-if="image != null"
      :src="image"
      alt="Uploaded Image"
      style="height: 20vh; width: auto"
    />
    <p v-if="image == null && !loading">Image not found.</p>
    <p v-else-if="loading">Loading...</p>

    <h2 v-if="image != null">Processed image:</h2>
    <img
      v-if="processedImage != null"
      :src="processedImage"
      alt="Processed Image"
      style="height: 20vh; width: auto"
    />
    <p v-if="processedImage == null && !loading">Image not found.</p>
    <p v-else-if="loading">Loading...</p>

    <input
      type="button"
      value="Back To Upload"
      @click="go_to('/')"
      style="margin-top: 64px"
    />
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from "vue";

const uploadMode = ref(true);
const imageInPath = ref(false);
const image = ref(null);
const processedImage = ref(null);
const description = ref("");
const loading = ref(false);
const file = ref(null);

const go_to = (url) => {
  window.open(url, "_self");
};

const onFileChanged = ($event) => {
  const target = $event.target;
  if (target && target.files) {
    file.value = target.files[0];
  }
};

const apiBaseURL = "/api";

onMounted(() => {
  updateMode();
});

watch(
  () => window.location.pathname,
  () => {
    updateMode();
  }
);

const updateMode = () => {
  imageInPath.value = window.location.pathname.startsWith("/image/");
  uploadMode.value = !imageInPath.value;
  if (imageInPath.value) {
    loadImage();
  }
};

const loadImage = async () => {
  loading.value = true;
  const imageId = window.location.pathname.split("/").pop();
  const imageUrl = `${apiBaseURL}/image/${imageId}`;
  const processedImageUrl = `${apiBaseURL}/image/${imageId}_processed`; // URL for processed image
  const descriptionUrl = `${apiBaseURL}/image/${imageId}_desc`;

  try {
    const imageResponse = await fetch(imageUrl, {
      signal: AbortSignal.timeout(10_000),
    });
    const imageBlob = await imageResponse.blob();

    const processedImageResponse = await fetch(processedImageUrl, {
      signal: AbortSignal.timeout(10_000),
    }); // Fetch processed image
    const processedImageBlob = await processedImageResponse.blob();

    const descriptionResponse = await fetch(descriptionUrl, {
      signal: AbortSignal.timeout(10_000),
    });
    const descriptionText = await descriptionResponse.text();

    image.value =
      imageResponse.status == 200 ? URL.createObjectURL(imageBlob) : null;

    processedImage.value =
      processedImageResponse.status == 200
        ? URL.createObjectURL(processedImageBlob)
        : null;

    if (descriptionResponse.status == 200) description.value = descriptionText;
    else description.value = null;
  } catch (error) {
    console.error("Error loading image:", error);
    image.value = null;
    processedImage.value = null;
  } finally {
    loading.value = false;
  }
};

const uploadImage = async () => {
  const formData = new FormData();
  formData.append("image", file.value);
  formData.append("description", description.value);

  try {
    const response = await fetch(`${apiBaseURL}/image`, {
      signal: AbortSignal.timeout(10_000),
      method: "POST",
      body: formData,
    });
    const imageId = await response.text();
    window.location.href = `/image/${imageId}`; // Reload the page with image ID
  } catch (error) {
    console.error("Error uploading image:", error);
    alert("Image upload failed.");
  }
};

// prettier-ignore
const publicKey = "< placeholder, see github action's 'Update publicKey in App.vue' task. >";

// this is also called VAPID public key

// Web-Push
// Public base64 to Uint src: https://gist.github.com/Klerith/80abd742d726dd587f4bd5d6a0ab26b6
function urlBase64ToUint8Array(base64String) {
  var padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  var base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");

  var rawData = window.atob(base64);
  var outputArray = new Uint8Array(rawData.length);

  for (var i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function subscribeToPushNotifications() {
  // Check for service worker support
  if (!("serviceWorker" in navigator)) {
    alert("This browser does not support service workers.");
    return;
  }

  try {
    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      alert(
        "Notification permission denied! Without it, the app cannot send notifications."
      );
      return;
    }

    let registration = await navigator.serviceWorker.register("/sw.js");

    registration = await navigator.serviceWorker.ready;

    // Get subscription
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    // Send subscription to server
    const response = await fetch(`${apiBaseURL}/subscribe/new`, {
      signal: AbortSignal.timeout(10_000),
      method: "POST",
      body: JSON.stringify(subscription),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      alert("Subscribed to notifications!");
    } else {
      console.error("Subscription request failed:", response.status);
      alert("Subscription failed.");
    }
  } catch (error) {
    console.error("Error subscribing to notifications:", error);
    alert("Subscription failed.");
  }
}
</script>

<style scoped></style>
