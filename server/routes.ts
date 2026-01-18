import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI, { toFile } from "openai";
import multer from "multer";
import fs from "fs/promises";
import { spawn } from "child_process";
import path from "path";
import os from "os";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const upload = multer({ dest: os.tmpdir() });

async function extractAudio(videoPath: string): Promise<string> {
  const audioPath = videoPath + ".mp3";
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", ["-i", videoPath, "-vn", "-acodec", "libmp3lame", audioPath]);
    ffmpeg.on("close", (code) => {
      if (code === 0) resolve(audioPath);
      else reject(new Error(`FFmpeg exited with code ${code}`));
    });
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post(api.fetchYoutubeVideo.path, async (req, res) => {
    try {
      const { url } = api.fetchYoutubeVideo.input.parse(req.body);
      const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      const videoId = videoIdMatch?.[1];

      if (!videoId) return res.status(400).json({ message: "Invalid YouTube URL" });

      const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${process.env.YOUTUBE_API_KEY}`);
      const data = await response.json();

      if (!data.items?.length) return res.status(404).json({ message: "Video not found" });

      const snippet = data.items[0].snippet;
      res.json({
        title: snippet.title,
        description: snippet.description,
        tags: snippet.tags || [],
        channelTitle: snippet.channelTitle,
      });
    } catch (err) {
      console.error("YouTube fetch error:", err);
      res.status(500).json({ message: "Failed to fetch YouTube video" });
    }
  });

  app.post(api.uploadVideo.path, upload.single("video"), async (req, res) => {
    let videoPath: string | undefined;
    let audioPath: string | undefined;
    try {
      if (!req.file) return res.status(400).json({ message: "No video file uploaded" });
      videoPath = req.file.path;

      audioPath = await extractAudio(videoPath);
      const audioFile = await fs.readFile(audioPath);
      const file = await toFile(audioFile, "audio.mp3");

      const transcription = await openai.audio.transcriptions.create({
        file,
        model: "gpt-4o-mini-transcribe",
      });

      res.json({ transcript: transcription.text });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ message: "Failed to process video" });
    } finally {
      if (videoPath) await fs.unlink(videoPath).catch(() => {});
      if (audioPath) await fs.unlink(audioPath).catch(() => {});
    }
  });

  app.post(api.analyze.path, async (req, res) => {
    try {
      const input = api.analyze.input.parse(req.body);

      const prompt = `
        Act as a professional YouTube growth strategist. Analyze the following video content:
        
        Platform: ${input.platform}
        Niche: ${input.niche}
        Channel Size: ${input.channelSize}
        Video Type: ${input.videoType}
        Idea/Script/Transcript: ${input.idea || input.transcript || "Provided via YouTube URL"}
        ${input.youtubeUrl ? `YouTube URL: ${input.youtubeUrl}` : ""}

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
