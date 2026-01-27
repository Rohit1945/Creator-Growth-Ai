import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const analysisRequestSchema = z.object({
  platform: z.enum(["YouTube", "Instagram", "TikTok"]).default("YouTube"),
  niche: z.string().min(1, "Please select a niche"),
  channelSize: z.enum(["Small", "Medium", "Large"]),
  videoType: z.enum(["Short", "Long"]),
  idea: z.string().min(10, "Please provide a more detailed idea (at least 10 characters)").optional(),
  youtubeUrl: z.string().optional().nullable(),
  transcript: z.string().optional(),
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

export const viewers = pgTable("viewers", {
  id: serial("id").primaryKey(),
  ipHash: text("ip_hash").notNull().unique(),
});

export const videoAnalyses = pgTable("video_analyses", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull(),
  niche: text("niche").notNull(),
  channelSize: text("channel_size").notNull(),
  videoType: text("video_type").notNull(),
  idea: text("idea"),
  transcript: text("transcript"),
  youtubeUrl: text("youtube_url"),
  analysis: jsonb("analysis").notNull(),
});

export const insertAnalysisSchema = createInsertSchema(videoAnalyses).omit({ id: true });
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type VideoAnalysis = typeof videoAnalyses.$inferSelect;

export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;
export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;
export type Viewer = typeof viewers.$inferSelect;
