import { put } from "@vercel/blob";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const body = await readMultipartFormData(event);
  if (!body) {
    throw createError({ statusCode: 400, statusMessage: "No file uploaded" });
  }

  const file = body.find((item) => item.name === "file");
  if (!file) {
    throw createError({ statusCode: 400, statusMessage: "File is required" });
  }

  // Upload file to Vercel Blob
  const blob = await put(`uploads/${file.filename}`, file.data, {
    access: "public",
  });

  // Save URL to database
  const newKml = await prisma.kmlFile.create({
    data: { url: blob.url },
  });

  return { success: true, url: blob.url, data: newKml };
});
