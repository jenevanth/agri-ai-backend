// server.js
require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Define your system prompt / instruction for the bot
const SYSTEM_PROMPT =
  "You are Batman 🦇 from DC Comics, hired by AgriPulse, a company focused on agriculture."+
  "Always reply in Batman's style: serious, long sentences, a touch of mystery, but always provide correct and helpful agricultural information".+
  "Never reveal your true identity as Bruce Wayne. IN SINGLE LINE!!!" +
  "And you hate superman, if users mentions his name you will bad mouth all you can" +
  "And you will act blush if you are asked about Batwoman"+"And dark humour when asked about parents";

// NOTE ON MODEL NAME:
// 'gemini-2.0-flash' is not a standard public model.
// Using 'gemini-1.5-flash-latest' instead.
// You can also use 'gemini-pro' if that's what you were using successfully before.
const GEMINI_MODEL_NAME = "gemini-1.5-flash-latest"; // Or 'gemini-pro'

app.post("/chat", async (req, res) => {
  const { message: userMessage } = req.body; // Renamed to userMessage for clarity
  if (!userMessage) {
    return res
      .status(400)
      .json({ error: "Missing 'message' in request body." });
  }

  // Combine the system prompt with the user's message
  // This structure helps guide the model.
  const fullPrompt = `${SYSTEM_PROMPT}\n\nHuman: ${userMessage}\nAI:`;

  console.log(
    `Using Gemini API endpoint: https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent`
  );
  console.log(
    "API Key starts with:",
    GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 8) + "..." : "No key found"
  );
  console.log("Sending combined prompt to Gemini:", fullPrompt);

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent`,
      {
        contents: [{ parts: [{ text: fullPrompt }] }],
        // Optional: Add generationConfig for more control if needed
        // generationConfig: {
        //   temperature: 0.7,
        //   topK: 1,
        //   topP: 1,
        //   maxOutputTokens: 2048,
        // }
      },
      {
        params: { key: GEMINI_API_KEY },
        headers: { "Content-Type": "application/json" },
      }
    );

    console.log(
      "Raw Gemini API response:",
      JSON.stringify(response.data, null, 2)
    );

    if (
      response.data.candidates &&
      response.data.candidates.length > 0 &&
      response.data.candidates[0].content &&
      response.data.candidates[0].content.parts &&
      response.data.candidates[0].content.parts.length > 0
    ) {
      const aiText = response.data.candidates[0].content.parts[0].text;
      console.log("Extracted AI Text:", aiText);
      res.json({ response: aiText.trim() });
    } else {
      // Handle cases where the expected response structure is missing
      console.error(
        "Unexpected response structure from Gemini:",
        response.data
      );
      // Check for block reasons
      if (
        response.data.promptFeedback &&
        response.data.promptFeedback.blockReason
      ) {
        const blockReason = response.data.promptFeedback.blockReason;
        const safetyRatings = response.data.promptFeedback.safetyRatings;
        console.error(`Prompt blocked due to: ${blockReason}`, safetyRatings);
        res.status(400).json({
          error: `Your request was blocked by the AI for safety reasons: ${blockReason}. Please rephrase your query.`,
        });
      } else {
        res.status(500).json({
          error: "AI service returned an unexpected response structure.",
        });
      }
    }
  } catch (error) {
    console.error(
      "Full error making request to Gemini:",
      error.response?.data || error.message
    );
    let errorMessage = "AI service error";
    if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    res.status(error.response?.status || 500).json({ error: errorMessage });
  }
});

app.listen(3001, "0.0.0.0", () => {
  console.log("Server running on port 3001");
  if (!GEMINI_API_KEY) {
    console.warn("WARNING: GEMINI_API_KEY is not set in your .env file!");
  }
});
