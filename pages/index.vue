<template>
  <div class="wrapper">
    <div class="glass-container">
      <header>
        <h1>🌍 Plan your trip!</h1>
        <p>
          Enter a city name below to view key points of interest and
          directions.<br />
          Download the map, upload it to Google My Maps, and navigate the city
          easily on your phone!
        </p>
      </header>

      <div class="input-section">
        <input
          v-model="cityName"
          placeholder="Enter a city..."
          class="input-field"
        />
        <button @click="fetchKmlData" class="generate-btn" :disabled="loading">
          {{ loading ? "Generating..." : "Generate Map" }}
        </button>
        <a :href="kmlUrl" v-if="kmlUrl" download="map.kml">
          <button class="download-btn">Download</button>
        </a>
      </div>

      <!-- Enhanced Loading Messages -->
      <div v-if="loading" class="loading">
        <span class="spinner"></span>
        <p>{{ loadingMessage }}</p>
      </div>

      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

      <div v-if="kmlUrl" id="map-container">
        <div id="map"></div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, watch } from "vue";
import pkg from "@googlemaps/js-api-loader";
const { Loader } = pkg;

const cityName = ref("");
const kmlUrl = ref(null);
const center = ref(null);
const loading = ref(false);
const errorMessage = ref("");
const loadingMessage = ref("Generating cites of interest...");

const fetchKmlData = async () => {
  if (!cityName.value.trim()) {
    errorMessage.value = "⚠️ Please enter a valid city name.";
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  // Set up loading messages
  setTimeout(
    () => (loadingMessage.value = "Applying directions / walking routes..."),
    5000
  );
  setTimeout(() => (loadingMessage.value = "Generating Google Map..."), 10000);

  try {
    const res = await fetch("/api/generate-kml", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: cityName.value }),
    });
    const data = await res.json();

    if (data.success) {
      kmlUrl.value = data.url;
      center.value = data.center;
    } else {
      throw new Error("❌ Failed to generate KML.");
    }
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
};

const loadMap = () => {
  if (!kmlUrl.value || !center.value) return;

  const loader = new Loader({
    apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    version: "weekly",
    libraries: ["visualization"],
  });

  loader.load().then(() => {
    const map = new google.maps.Map(document.getElementById("map"), {
      center: new google.maps.LatLng(
        center.value.latitude,
        center.value.longitude
      ),
      zoom: 10,
      mapTypeId: "terrain",
    });

    new google.maps.KmlLayer({
      url: kmlUrl.value,
      suppressInfoWindows: true,
      preserveViewport: true,
      map: map,
    });
  });
};

watch(kmlUrl, (newUrl) => {
  if (newUrl) loadMap();
});
</script>

<style scoped>
/* Import Google Font */
@import url("https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap");

* {
  font-family: "Poppins", sans-serif;
}

.wrapper {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e1e2e, #292943);
  padding: 20px;
}

.glass-container {
  max-width: 600px;
  width: 90%;
  padding: 30px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0px 10px 30px rgba(0, 0, 0, 0.2);
  text-align: center;
  color: white;
}

h1 {
  font-size: 26px;
  font-weight: 600;
  margin-bottom: 10px;
}

p {
  font-size: 15px;
  opacity: 0.8;
  font-weight: 300;
}

.input-section {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
}

.input-field {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 400;
  color: white;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  outline: none;
}

.input-field::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.generate-btn {
  padding: 12px 16px;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.3s;
}

.generate-btn:hover {
  background: #357ab7;
}

.generate-btn:disabled {
  background: #555;
  cursor: not-allowed;
}

/* Loading Section */
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 400;
  margin-top: 20px;
}

.spinner {
  width: 22px;
  height: 22px;
  border: 3px solid transparent;
  border-top: 3px solid #4a90e2;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Error Message */
.error-message {
  margin-top: 10px;
  color: #ff6b6b;
  font-size: 14px;
  font-weight: 400;
}

/* Map Styling */
#map-container {
  margin-top: 20px;
  height: 400px;
  border-radius: 12px;
  overflow: hidden;
}

#map {
  width: 100%;
  height: 100%;
  border-radius: 12px;
}
/* Download Button Styling */

.download-btn {
  padding: 12px 16px;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.3s;
}

.download-btn:hover {
  background: #357ab7;
}

.download-btn:disabled {
  background: #555;
  cursor: not-allowed;
}
</style>
