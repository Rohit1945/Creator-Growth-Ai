import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const analysisRequestSchema = z.object({
  platform: z.enum(["YouTube", "Instagram", "TikTok"]).default("YouTube"),
  niche: z.string().min(1, "Please select a niche"),
  channelSize: z.enum(["Small", "Medium", "Large"]),
  videoType: z.enum(["Short", "Long"]),
  idea: z.string().min(10, "Please provide a more detailed idea (at least 10 characters)"),
});

export const analysisResponseSchema = z.object({
  titles: z.array(z.string()),
  description: z.string(),
  hashtags: z.array(z.string()),
  tags: z.array(z.string()),
  performancePrediction: z.object({
    potential: z.enum(["Low", "Medium", "High"]),
    confidenceScore: z.number().min(0).max(100),
    reason: z.string(),
  }),
  nextVideoIdeas: z.array(z.object({
    idea: z.string(),
    reason: z.string(),
  })),
});

export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;
export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;
