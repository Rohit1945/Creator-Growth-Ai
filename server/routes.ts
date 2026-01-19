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
import crypto from "crypto";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const upload = multer({ 
  dest: os.tmpdir(),
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB
  }
});

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
  // Record unique viewer on root access
  app.get("/", async (req, res, next) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const ipHash = crypto.createHash("sha256").update(String(ip)).digest("hex");
    await storage.recordViewer(ipHash).catch(console.error);
    next();
  });

  app.get("/api/viewers", async (_req, res) => {
    try {
      const count = await storage.getViewerCount();
      res.json({ count });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch viewer count" });
    }
  });
  app.post(api.fetchYoutubeVideo.path, async (req, res) => {
    try {
      const { url } = api.fetchYoutubeVideo.input.parse(req.body);
      const youtubeRegex = /(?:https?:\/\/)?(?:www\.|m\.)?youtu(?:be\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|live\/)|.be\/)([a-zA-Z0-9_-]{11})/;
      const match = url.match(youtubeRegex);
      let videoId = match ? match[1] : null;

      if (!videoId && url.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(url)) {
        videoId = url;
      }

      console.log("Extracted video ID:", videoId, "from URL:", url);

      if (!videoId) return res.status(400).json({ message: "Invalid YouTube URL or Video ID" });

      const apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey) {
        console.error("YOUTUBE_API_KEY is missing");
        return res.status(500).json({ message: "YouTube API key not configured. Please add YOUTUBE_API_KEY to secrets." });
      }

      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
      const response = await fetch(apiUrl);
      const data = await response.json() as any;
      
      if (data.error) {
        console.error("YouTube API Error:", data.error);
        return res.status(500).json({ message: data.error.message || "YouTube API error" });
      }

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
      res.status(500).json({ message: "Failed to fetch YouTube video details" });
    }
  });

  app.post(api.uploadVideo.path, (req, res, next) => {
    upload.single("video")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(500).json({ message: "Internal server error during upload" });
      }
      next();
    });
  }, async (req: any, res) => {
    let videoPath: string | undefined;
    let audioPath: string | undefined;
    try {
      console.log("Processing video upload...");
      if (!req.file) return res.status(400).json({ message: "No video file uploaded" });
      
      const fileType = req.file.mimetype;
      console.log("File type:", fileType);
      if (!fileType.includes("mp4") && !fileType.includes("quicktime") && !fileType.includes("video")) {
        return res.status(400).json({ message: "Unsupported file type. Please upload .mp4 or .mov" });
      }

      videoPath = req.file.path as string;
      console.log("Extracting audio from:", videoPath);
      audioPath = await extractAudio(videoPath);
      
      console.log("Reading audio file...");
      const audioFile = await fs.readFile(audioPath);
      const file = await toFile(audioFile, "audio.mp3");

      console.log("Transcribing with OpenAI...");
      const transcription = await openai.audio.transcriptions.create({
        file,
        model: "gpt-4o-mini-transcribe",
      });

      const transcript = transcription.text;
      console.log("Transcript length:", transcript?.length);
      if (!transcript || transcript.trim().length < 5) {
        return res.status(400).json({ message: "Could not transcribe audio. The video might be silent or too short." });
      }

      // Perform analysis immediately
      console.log("Analyzing transcript...");
      const prompt = `
        Act as a professional YouTube growth strategist. Analyze the following video content:
        
        Platform: YouTube
        Niche: General
        Channel Size: Small
        Video Type: Long
        Idea/Script/Transcript: ${transcript}

        Return a JSON object with the following fields:
        - titles: 3 high-CTR titles (optimized for CTR, not clickbait)
        - description: SEO-optimized description (first 2 lines as hook)
        - hashtags: array of relevant hashtags (e.g. ["#tag1", "#tag2"])
        - tags: array of relevant tags (e.g. ["tag1", "tag2"])
        - performancePrediction: object with { potential: "Low" | "Medium" | "High", confidenceScore: number (0-100), reason: string (short explanation) }
        - nextVideoIdeas: array of 2 objects with { idea: string, reason: string }

        Do NOT exaggerate views or guarantee virality. Use range-based prediction.
        Ensure the response is valid JSON and matches the required structure exactly.
      `;

      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = aiResponse.choices[0].message.content;
      if (!content) throw new Error("No response from AI");

      const analysis = JSON.parse(content);
      console.log("Analysis complete.");
      res.json({ transcript, analysis });
    } catch (err: any) {
      console.error("Upload error details:", err);
      res.status(500).json({ message: err.message || "Failed to process video" });
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
        model: "gpt-4o",
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
