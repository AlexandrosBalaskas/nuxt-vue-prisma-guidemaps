<template>
  <div id="container" style="display: flex; height: 500px; margin: 0">
    <div id="map" style="flex: 2; border-right: 2px solid #ddd"></div>
    <div
      id="capture"
      style="
        flex: 1;
        padding: 10px;
        background-color: #f9f9fc;
        border-left: 2px solid #ddd;
        overflow-y: auto;
      "
    >
      <h1>Feature Details</h1>
      <p>Click on a feature in the map to view its details here.</p>
    </div>
  </div>
</template>

<script setup>
import { Loader } from "@googlemaps/js-api-loader";
import { onMounted } from "vue";

onMounted(() => {
  const loader = new Loader({
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
    version: "weekly",
    libraries: ["visualization"],
  });

  loader.load().then(() => {
    const map = new google.maps.Map(document.getElementById("map"), {
      center: new google.maps.LatLng(-19.257753, 146.823688),
      zoom: 3,
      mapTypeId: "terrain",
    });

    const kmlLayer = new google.maps.KmlLayer({
      url: "https://09hsza2wsi6c4xo8.public.blob.vercel-storage.com/uploads/oook-yqOvHIeh4A7FsPGt7IVzENhULRrMvI.kml",
      suppressInfoWindows: true,
      preserveViewport: true,
      map: map,
    });

    google.maps.event.addListener(kmlLayer, "click", (event) => {
      const content = event.featureData.infoWindowHtml;
      const captureDiv = document.getElementById("capture");
      captureDiv.innerHTML = `
          <h1>Feature Details</h1>
          ${content || "<p>No details available.</p>"}
        `;
    });
  });
});
</script>

<style scoped>
#container {
  display: flex;
  flex-direction: row;
  height: 500px;
}

#map {
  flex: 2;
  border-right: 2px solid #ddd;
}

#capture {
  flex: 1;
  padding: 10px;
  background-color: #f9f9fc;
  border-left: 2px solid #ddd;
  overflow-y: auto;
}

h1 {
  font-size: 1.2em;
  margin: 0 0 10px;
  color: #333;
}

p {
  margin: 0 0 10px;
  line-height: 1.5;
}
</style>
