import type { Express } from "express";
import { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import cors from "cors";
import crypto from "crypto";
import multer from "multer";
import os from "os";
import fs from "fs/promises";
import { spawn } from "child_process";
import path from "path";

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

const upload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB
  },
});

async function queryHuggingFace(prompt: string) {
  if (!HF_API_KEY) {
    throw new Error("HUGGINGFACE_API_KEY is not configured in secrets.");
  }

  const response = await fetch(
    "https://api-inference.huggingface.co/models/meta-llama/Llama-3.1-8B-Instruct",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 1024,
          temperature: 0.7,
          return_full_text: false,
        },
      }),
    }
  );

  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  // Hugging Face returns an array or single object depending on model
  const generatedText = Array.isArray(result) ? result[0]?.generated_text : result.generated_text;
  
  if (!generatedText) {
    throw new Error("Invalid response format from Hugging Face");
  }

  // Extract JSON if model includes prompt or extra text
  const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : generatedText;
}

async function extractAudio(videoPath: string): Promise<string> {
  const audioPath = `${videoPath}.mp3`;
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", ["-i", videoPath, "-vn", "-acodec", "libmp3lame", audioPath]);
    ffmpeg.on("close", (code) => {
      if (code === 0) resolve(audioPath);
      else reject(new Error(`FFmpeg exited with code ${code}`));
    });
  });
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.use(cors({
    origin: true,
    credentials: true
  }));

  // Track viewer
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

      if (!videoId) return res.status(400).json({ message: "Invalid YouTube URL" });

      const apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey) return res.status(500).json({ message: "YouTube API not configured" });

      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
      const response = await fetch(apiUrl);
      const data = await response.json() as any;
      
      if (!data.items?.length) return res.status(404).json({ message: "Video not found" });

      const snippet = data.items[0].snippet;
      res.json({
        title: snippet.title,
        description: snippet.description,
        tags: snippet.tags || [],
        channelTitle: snippet.channelTitle,
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch YouTube details" });
    }
  });

  app.post(api.uploadVideo.path, upload.single("video"), async (req, res) => {
    let videoPath: string | undefined;
    let audioPath: string | undefined;
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      
      videoPath = req.file.path;
      audioPath = await extractAudio(videoPath);
      
      // Transcription requires Whisper or similar. For now, we'll use a placeholder
      // until a specific STT model is requested/configured for Hugging Face.
      const transcript = "Transcription feature currently requires Whisper. Analysis can be done on text ideas or YouTube URLs.";
      
      res.json({ transcript, message: "Audio extracted. Analysis recommended via Text Idea for now." });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    } finally {
      if (videoPath) await fs.unlink(videoPath).catch(() => {});
      if (audioPath) await fs.unlink(audioPath).catch(() => {});
    }
  });

  app.post(api.analyze.path, async (req, res) => {
    try {
      const input = api.analyze.input.parse(req.body);
      const prompt = `
        Act as a professional YouTube strategist. Analyze:
        Platform: ${input.platform}, Niche: ${input.niche}, Size: ${input.channelSize}, Type: ${input.videoType}
        Content: ${input.idea || input.transcript || "YouTube Video"}
        
        Return ONLY valid JSON:
        {
          "titles": ["title1", "title2", "title3"],
          "description": "SEO description",
          "hashtags": ["#tag1", "#tag2"],
          "tags": ["tag1", "tag2"],
          "performancePrediction": { "potential": "High", "confidenceScore": 85, "reason": "reason" },
          "nextVideoIdeas": [{ "idea": "idea1", "reason": "reason1" }]
        }
      `;

      const content = await queryHuggingFace(prompt);
      const parsed = JSON.parse(content);

      await storage.saveAnalysis({
        ...input,
        idea: input.idea || null,
        transcript: input.transcript || null,
        youtubeUrl: input.youtubeUrl || null,
        analysis: parsed
      });

      res.json(parsed);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/history", async (_req, res) => {
    try {
      const history = await storage.getAnalysisHistory();
      res.json(history);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch history" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { message, context } = req.body;
      const prompt = `Context: ${JSON.stringify(context)}\nUser: ${message}\nReturn JSON: {"message": "response", "updatedAnalysis": null}`;
      const content = await queryHuggingFace(prompt);
      res.json(JSON.parse(content));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/compare", async (req, res) => {
    try {
      const { userVideo, competitorUrl } = req.body;
      const prompt = `Compare user video ${JSON.stringify(userVideo)} with competitor ${competitorUrl || "niche benchmark"}. Return JSON with score, strength, weakness, recommendation, marketGap.`;
      const content = await queryHuggingFace(prompt);
      res.json(JSON.parse(content));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
