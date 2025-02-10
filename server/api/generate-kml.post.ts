import { defineEventHandler, readBody } from "h3";
import { XMLParser } from "fast-xml-parser";
import { put } from "@vercel/blob";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface LatLng {
  latitude: number;
  longitude: number;
}

interface RouteRequest {
  origin: { location: { latLng: LatLng } };
  destination: { location: { latLng: LatLng } };
  intermediates: { location: { latLng: LatLng } }[];
  travelMode: string;
  polylineEncoding: string;
  computeAlternativeRoutes: boolean;
  routeModifiers: {
    avoidTolls: boolean;
    avoidHighways: boolean;
    avoidFerries: boolean;
  };
  languageCode: string;
  units: string;
}

function extractCoordinatesFromKML(
  kmlString: string
): { request: RouteRequest; coordinates: LatLng[] } | null {
  try {
    const parser = new XMLParser({ ignoreAttributes: false });
    const kmlData = parser.parse(kmlString);

    const placemarks = kmlData.kml?.Document?.Placemark;

    if (!placemarks || !Array.isArray(placemarks) || placemarks.length < 2) {
      console.error("Not enough coordinates to generate a route.");
      return null;
    }

    const coordinates: LatLng[] = placemarks.map((placemark: any) => {
      const [longitude, latitude] = placemark.Point.coordinates
        .split(",")
        .map(Number);
      return { latitude, longitude };
    });

    // Construct request object
    const request: RouteRequest = {
      origin: { location: { latLng: coordinates[0] } },
      destination: {
        location: { latLng: coordinates[coordinates.length - 1] },
      },
      intermediates: coordinates
        .slice(1, -1)
        .map((coord) => ({ location: { latLng: coord } })),
      travelMode: "WALK",
      polylineEncoding: "GEO_JSON_LINESTRING",
      computeAlternativeRoutes: false,
      routeModifiers: {
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: false,
      },
      languageCode: "en-US",
      units: "IMPERIAL",
    };

    return { request, coordinates };
  } catch (error) {
    console.error("Error parsing KML:", error);
    return null;
  }
}

function generateKMLFromRoute(response) {
  if (!response || !response.routes || response.routes.length === 0) {
    console.error("Invalid response format");
    return "";
  }

  const coordinates = response.routes[0].polyline.geoJsonLinestring.coordinates;

  const kmlCoordinates = coordinates
    .map((coord) => `${coord[0]},${coord[1]},0`)
    .join("\n        ");

  const kml = `
        <Placemark>
          <name>Walking Route Segment</name>
          <description>Generated walking route.</description>
          <styleUrl>#route</styleUrl>
          <LineString>
            <tessellate>1</tessellate>
            <coordinates>
          ${kmlCoordinates}
            </coordinates>
          </LineString>
        </Placemark>`;

  return kml;
}

function insertPlacemarkIntoKML(exampleKml, generatedPlacemarkKml) {
  const closingDocumentTag = "</Document>";

  // Find the last occurrence of </Placemark> before </Document>
  const insertIndex =
    exampleKml.lastIndexOf("</Placemark>") + "</Placemark>".length;

  if (insertIndex === -1) {
    console.error("No existing placemarks found in the KML.");
    return exampleKml;
  }

  // Insert the new placemark before </Document>
  const updatedKml =
    exampleKml.slice(0, insertIndex) +
    "\n" +
    generatedPlacemarkKml +
    "\n" +
    exampleKml.slice(insertIndex);

  return updatedKml;
}

function extractXMLFromKML(refinedKML) {
  // Match the XML content within refinedKML
  const match = refinedKML.match(/<\?xml[^>]*>.*<\/kml>/s);

  if (match) {
    return match[0]; // Return the extracted XML content
  } else {
    throw new Error("No valid KML XML content found");
  }
}

function getCenterOfPlacemarks(placemarks) {
  if (!placemarks.length) return null;

  let sumLat = 0,
    sumLng = 0;

  placemarks.forEach(({ latitude, longitude }) => {
    sumLat += latitude;
    sumLng += longitude;
  });

  return {
    latitude: sumLat / placemarks.length,
    longitude: sumLng / placemarks.length,
  };
}

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY; // Store in .env file
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

const exampleKml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Walking Tour of Athens</name>
    <description>Explore Athens through a walking route featuring key landmarks. Inspired by https://alexanderbalaskas.com/.</description>

    <!-- Styles -->
    <Style id="poi-normal">
      <IconStyle>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/blu-circle.png</href>
        </Icon>
      </IconStyle>
    </Style>
    <Style id="poi-highlight">
      <IconStyle>
        <scale>1.2</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/ylw-circle.png</href>
        </Icon>
      </IconStyle>
    </Style>
    <StyleMap id="poi-style">
      <Pair>
        <key>normal</key>
        <styleUrl>#poi-normal</styleUrl>
      </Pair>
      <Pair>
        <key>highlight</key>
        <styleUrl>#poi-highlight</styleUrl>
      </Pair>
    </StyleMap>
    <Style id="route">
      <LineStyle>
        <color>ff0000ff</color>
        <width>3</width>
      </LineStyle>
    </Style>

    <!-- Points of Interest -->
    <Placemark>
      <name>Acropolis</name>
      <description>The ancient citadel with iconic landmarks.</description>
      <styleUrl>#poi-style</styleUrl>
      <Point>
        <coordinates>23.726058,37.971532,0</coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>Syntagma Square</name>
      <description>The central square of Athens, near the Parliament.</description>
      <styleUrl>#poi-style</styleUrl>
      <Point>
        <coordinates>23.734721,37.975492,0</coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>National Archaeological Museum</name>
      <description>One of the world’s most important museums of ancient Greek art.</description>
      <styleUrl>#poi-style</styleUrl>
      <Point>
        <coordinates>23.733846,37.990528,0</coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>`;

export default defineEventHandler(async (event) => {
  try {
    const { text } = await readBody(event); // Get text input from request body

    const url =
      "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-Coder-32B-Instruct/v1/chat/completions";

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
    };

    const data = {
      model: "Qwen/Qwen2.5-Coder-32B-Instruct",
      messages: [
        {
          role: "system",
          content: `You are an AI that generates the content of .kml files. Always follow this template:\n${exampleKml} \n Generate only the placemarks with the city and number of placemarks the user will provide you. The placemarks will always be cites of interest, user is a tourist that will go to the city. Make sure that the coordinates you provide actually refer to the cite of interest.`,
        },
        {
          role: "user",
          content: `Hello, I want to go to ${text}. I want to know what cites of interest to visit. Generate 5 placemarks for ${text}. Please make sure that the coordinates you provide refer to the actual place.`,
        },
      ],
    };

    const startTime = performance.now();

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    const result = await response.json();
    const KMLcontent = result.choices?.[0]?.message?.content;

    const endTime = performance.now();
    const responseTime = endTime - startTime;
    console.log(
      `API Response Time: ${responseTime.toFixed(2)} ms`,
      KMLcontent,
      "KML"
    );

    if (!KMLcontent) {
      throw createError({
        statusCode: 500,
        statusMessage: "No content returned from API",
      });
    }

    // console.log(KMLcontent, "KML");

    const requestBody = extractCoordinatesFromKML(KMLcontent);

    const center = getCenterOfPlacemarks(requestBody?.coordinates);

    const mapsresponse = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask":
            "routes.duration,routes.distanceMeters,routes.polyline.geoJsonLinestring",
        },
        body: JSON.stringify(requestBody?.request),
      }
    );

    if (!mapsresponse.ok) {
      throw new Error(`API request failed: ${mapsresponse.statusText}`);
    }

    const mapsdata = await mapsresponse.json();

    const generatedPlacemarkKML = generateKMLFromRoute(mapsdata);

    const refinedKML = insertPlacemarkIntoKML(
      KMLcontent,
      generatedPlacemarkKML
    );

    const refinedKMLXML = extractXMLFromKML(refinedKML);

    const kmlBlob = new Blob([refinedKMLXML], {
      type: "application/vnd.google-earth.kml+xml",
    });
    const filename = `uploads/${Date.now()}-refined.kml`;
    const blob = await put(filename, kmlBlob, {
      access: "public",
    });

    const newKml = await prisma.kmlFile.create({
      data: { url: blob.url },
    });

    // Do something with the extracted data (e.g., save to DB)
    return { success: true, url: blob.url, data: newKml, center };
  } catch (error: any) {
    console.error("Error:", error.message);
    return { success: false, error: error.message };
  }
});
