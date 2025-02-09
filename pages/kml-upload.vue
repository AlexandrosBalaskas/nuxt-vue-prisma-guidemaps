<script setup>
import { ref } from "vue";

const receiptText = ref("");
const extractedData = ref(null);

const extractReceiptData = async () => {
  const res = await fetch("/api/generate-kml", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: receiptText.value }),
  });

  const data = await res.json();
  extractedData.value = data.success ? data.data : "Error extracting data";
};

const file = ref(null);
const uploadFile = async () => {
  if (!file.value) return alert("Select a file first!");

  const formData = new FormData();
  formData.append("file", file.value);

  const res = await fetch("/api/kml/upload", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  console.log("Uploaded:", data);
};

const handleFileChange = (event) => {
  file.value = event.target.files[0];
};
</script>

<template>
  <div>
    <input type="file" accept=".kml" @change="handleFileChange" />
    <button @click="uploadFile">Upload</button>
  </div>
  <div>
    <textarea
      v-model="receiptText"
      placeholder="Paste receipt text here"
    ></textarea>
    <button @click="extractReceiptData">Extract Data</button>
    <pre v-if="extractedData">{{ extractedData }}</pre>
  </div>
</template>
