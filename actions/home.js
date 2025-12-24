"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/prisma";
import aj from "@/lib/arcjet";
import { request } from "@arcjet/next";

// Function to serialize car data
function serializeCarData(car) {
  return {
    ...car,
    price: car.price ? parseFloat(car.price.toString()) : 0,
    createdAt: car.createdAt?.toISOString(),
    updatedAt: car.updatedAt?.toISOString(),
  };
}

/**
 * Get featured cars for the homepage
 */
export async function getFeaturedCars(limit = 3) {
  try {
    const cars = await db.car.findMany({
      where: {
        featured: true,
        status: "AVAILABLE",
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    return cars.map(serializeCarData);
  } catch (error) {
    throw new Error("Error fetching featured cars:" + error.message);
  }
}

// Function to convert File to base64
async function fileToBase64(file) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  return buffer.toString("base64");
}

/**
 * Process car image with Gemini AI
 */
export async function processImageSearch(file) {
  try {
    // Validate file input
    if (!file) {
      throw new Error("No file provided");
    }

    if (!file.type || !file.type.startsWith('image/')) {
      throw new Error("Invalid file type. Please upload an image file.");
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      throw new Error("File size too large. Please upload an image smaller than 5MB.");
    }

    // Skip ArcJet rate limiting for now to avoid issues
    // TODO: Re-enable ArcJet once the request context issue is resolved

    // Check if API key is available
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Gemini API key is not configured");
    }

    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    // Convert image file to base64
    const base64Image = await fileToBase64(file);

    // Create image part for the model
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: file.type,
      },
    };

    // Define the prompt for car search extraction
    const prompt = `
      Analyze this car image and extract the following information for a search query:
      1. Make (manufacturer)
      2. Body type (SUV, Sedan, Hatchback, etc.)
      3. Color

      Format your response as a clean JSON object with these fields:
      {
        "make": "",
        "bodyType": "",
        "color": "",
        "confidence": 0.0
      }

      For confidence, provide a value between 0 and 1 representing how confident you are in your overall identification.
      Only respond with the JSON object, nothing else.
    `;

    // Get response from Gemini
    let result, response, text;
    try {
      result = await model.generateContent([imagePart, prompt]);
      response = await result.response;
      text = response.text();
    } catch (geminiError) {
      console.error("Gemini API error:", geminiError);
      throw new Error("Failed to analyze image with AI: " + geminiError.message);
    }

    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

    // Parse the JSON response
    try {
      const carDetails = JSON.parse(cleanedText);

      // Validate the response has required fields
      if (!carDetails || typeof carDetails !== 'object') {
        throw new Error("Invalid AI response format");
      }

      // Return success response with data
      return {
        success: true,
        data: {
          make: carDetails.make || "",
          bodyType: carDetails.bodyType || "",
          color: carDetails.color || "",
          confidence: carDetails.confidence || 0
        },
      };
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.log("Raw response:", text);
      return {
        success: false,
        error: "Failed to parse AI response. Please try with a clearer image.",
      };
    }
  } catch (error) {
    console.error("processImageSearch error:", error);
    throw new Error("Image search failed: " + error.message);
  }
}
