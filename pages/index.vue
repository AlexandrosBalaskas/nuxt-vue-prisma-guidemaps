<template>
  <div>
    <input v-model="cityName" placeholder="Enter city name" />
    <button @click="fetchKmlData">Generate KML</button>

    <div v-if="kmlUrl" id="container">
      <div id="map"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import { Loader } from "@googlemaps/js-api-loader";

const cityName = ref("");
const kmlUrl = ref(null);
const center = ref(null);

const fetchKmlData = async () => {
  if (!cityName.value) return alert("Enter a city name!");

  const res = await fetch("/api/generate-kml", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: cityName.value }),
  });
  const data = await res.json();

  if (data.success) {
    kmlUrl.value = data.url;
    center.value = data.center;
    loadMap();
  } else {
    alert("Failed to generate KML.");
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
#container {
  display: flex;
  height: 500px;
  margin-top: 10px;
}

#map {
  flex: 2;
  border: 2px solid #ddd;
  height: 100%;
}
</style>
