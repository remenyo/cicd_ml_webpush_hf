<template>
  <div v-if="uploadMode" style="display: flex; flex-direction: column">
    <h2>Upload an image</h2>
    <div style="display: flex; flex-direction: column">
      <input
        type="text"
        v-model="description"
        placeholder="This was my first car!"
        style="margin-bottom: 16px"
      />
      <input
        type="file"
        @change="onFileChanged($event)"
        accept="image/*"
        capture
        style="margin-bottom: 16px"
      />
      <input type="button" value="Upload" @click="uploadImage" />
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

const apiBaseUrl = "http://localhost:3000"; // Set your API base URL

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
  const imageUrl = `${apiBaseUrl}/image/${imageId}`;
  const processedImageUrl = `${apiBaseUrl}/image/${imageId}_processed`; // URL for processed image
  const descriptionUrl = `${apiBaseUrl}/image/${imageId}_desc`;

  try {
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();

    const processedImageResponse = await fetch(processedImageUrl); // Fetch processed image
    const processedImageBlob = await processedImageResponse.blob();

    const descriptionResponse = await fetch(descriptionUrl);
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
    const response = await fetch(`${apiBaseUrl}/image`, {
      method: "POST",
      body: formData,
    });
    const imageId = await response.text();
    window.location.href = `/image/${imageId}`; // Reload with image ID
  } catch (error) {
    console.error("Error uploading image:", error);
    alert("Image upload failed.");
  }
};
</script>

<style scoped></style>
