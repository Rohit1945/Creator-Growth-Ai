import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";

// Using the OpenAI client from the integration or creating a new one with the env vars
// The integration instructions say "AI_INTEGRATIONS_OPENAI_API_KEY" is set.
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post(api.analyze.path, async (req, res) => {
    try {
      const input = api.analyze.input.parse(req.body);

      const prompt = `
        Act as a professional YouTube growth strategist. Analyze the following video idea:
        
        Platform: ${input.platform}
        Niche: ${input.niche}
        Channel Size: ${input.channelSize}
        Video Type: ${input.videoType}
        Idea/Script: ${input.idea}

        Return a JSON object with the following fields:
        - titles: 3 high-CTR titles (optimized for CTR, not clickbait)
        - description: SEO-optimized description (first 2 lines as hook)
        - hashtags: array of relevant hashtags (e.g. ["#tag1", "#tag2"])
        - tags: array of relevant tags (e.g. ["tag1", "tag2"])
        - performancePrediction: object with { potential: "Low" | "Medium" | "High", confidenceScore: number (0-100), reason: string (short explanation) }
        - nextVideoIdeas: array of 2 objects with { idea: string, reason: string }

        Do NOT exaggerate views or guarantee virality. Use range-based prediction.
        Ensure the response is valid JSON.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from AI");
      }

      const parsedResult = JSON.parse(content);
      
      // Validate the AI response against our schema to ensure type safety
      // We might need to map or clean up the AI response if it's slightly off, 
      // but gpt-5.1 with json_object is usually reliable.
      
      res.json(parsedResult);
    } catch (err) {
      console.error("Analysis error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to analyze video" });
    }
  });

  return httpServer;
}
