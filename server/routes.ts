    import type { Express } from "express";
    import type { Server } from "http";
    import { storage } from "./storage";
    import { api } from "@shared/routes";
    import { z } from "zod";
    import cors from "cors";
    import crypto from "crypto";

    const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

    async function queryHuggingFace(prompt: string) {
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
              max_new_tokens: 900,
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

      return result[0]?.generated_text;
    }

    export async function registerRoutes(
      httpServer: Server,
      app: Express
    ): Promise<Server> {

      app.use(cors({
        origin: [
          "https://creator-growth--rohitsharmafanp.replit.app",
          "http://localhost:5173"
        ],
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
        const count = await storage.getViewerCount();
        res.json({ count });
      });

      // ---------------- ANALYZE ----------------
      app.post(api.analyze.path, async (req, res) => {
        try {
          const input = api.analyze.input.parse(req.body);

          const prompt = `
    You are a professional YouTube growth strategist.

    Platform: ${input.platform}
    Niche: ${input.niche}
    Channel Size: ${input.channelSize}
    Video Type: ${input.videoType}
    Content: ${input.idea || input.transcript || "N/A"}

    Return ONLY valid JSON in this structure:

    {
      "titles": ["", "", ""],
      "description": "",
      "hashtags": ["", ""],
      "tags": ["", ""],
      "performancePrediction": {
        "potential": "Low | Medium | High",
        "confidenceScore": 0,
        "reason": ""
      },
      "nextVideoIdeas": [
        { "idea": "", "reason": "" },
        { "idea": "", "reason": "" }
      ]
    }

    Do not write anything outside JSON.
    `;

          const content = await queryHuggingFace(prompt);

          if (!content) throw new Error("No response from HF");

          const parsed = JSON.parse(content);

          await storage.saveAnalysis({
            platform: input.platform,
            niche: input.niche,
            channelSize: input.channelSize,
            videoType: input.videoType,
            idea: input.idea || null,
            transcript: input.transcript || null,
            youtubeUrl: input.youtubeUrl || null,
            analysis: parsed
          }).catch(console.error);

          res.json(parsed);

        } catch (err: any) {
          console.error("Analyze error:", err);
          res.status(500).json({ message: err.message });
        }
      });

      // ---------------- CHAT ----------------
      app.post("/api/chat", async (req, res) => {
        try {
          const { message, context } = req.body;

          const prompt = `
    You are a YouTube strategy consultant.

    Context:
    ${JSON.stringify(context)}

    User message:
    "${message}"

    Return JSON:
    {
      "message": "",
      "updatedAnalysis": null
    }

    Only return valid JSON.
    `;

          const content = await queryHuggingFace(prompt);
          if (!content) throw new Error("No response");

          res.json(JSON.parse(content));

        } catch (err: any) {
          res.status(500).json({ message: err.message });
        }
      });

      // ---------------- COMPARE ----------------
      app.post("/api/compare", async (req, res) => {
        try {
          const { userVideo } = req.body;

          const prompt = `
    Compare this YouTube video with niche benchmarks:

    ${JSON.stringify(userVideo)}

    Return JSON:
    {
      "score": 0,
      "strength": "",
      "weakness": "",
      "recommendation": "",
      "marketGap": ""
    }

    Return only JSON.
    `;

          const content = await queryHuggingFace(prompt);
          if (!content) throw new Error("No response");

          res.json(JSON.parse(content));

        } catch (err: any) {
          res.status(500).json({ message: err.message });
        }
      });

      return httpServer;
    }    const ffmpeg = spawn("ffmpeg", ["-i", videoPath, "-vn", "-acodec", "libmp3lame", audioPath]);
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
  app.use(cors({
    origin: [
      "https://creator-growth--rohitsharmafanp.replit.app",
      "http://localhost:5173"
    ],
    credentials: true
  }));

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
     // const transcription = await openai.audio.transcriptions.create({
      //  file,
       // model: "model: "meta-llama/llama-3.1-70b-instruct",", // standard whisper model
   //   });
// TEMP DISABLE
// const transcription = await openai.audio.transcriptions.create(...)

const transcript = "Temporary transcript for testing";
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
        model: "meta-llama/llama-3.1-70b-instruct",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = aiResponse.choices[0].message.content;
      if (!content) throw new Error("No response from AI");

      const analysis = JSON.parse(content);
      console.log("Analysis complete.");

      // Save to history
      await storage.saveAnalysis({
        platform: "YouTube",
        niche: "General",
        channelSize: "Small",
        videoType: "Long",
        idea: null,
        transcript: transcript,
        youtubeUrl: null,
        analysis: analysis
      }).catch(console.error);

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
        model: "model: "meta-llama/llama-3.1-70b-instruct",",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from AI");
      }

      const parsedResult = JSON.parse(content);
      
      // Save to history
      await storage.saveAnalysis({
        platform: input.platform,
        niche: input.niche,
        channelSize: input.channelSize,
        videoType: input.videoType,
        idea: input.idea || null,
        transcript: input.transcript || null,
        youtubeUrl: input.youtubeUrl || null,
        analysis: parsedResult
      }).catch(console.error);

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
      const { message, history, context } = req.body;
      
      const prompt = `
        You are an expert YouTube content consultant. 
        The user has the following video analysis context:
        ${JSON.stringify(context)}

        User request: "${message}"

        Provide a helpful response to refine the strategy. 
        If the user asks for changes to the titles, description, or tags, provide an updated full JSON analysis object inside the "updatedAnalysis" field.
        
        Return a JSON with:
        - message: your text response
        - updatedAnalysis: (optional) full JSON analysis object if changes were made
      `;

      const response = await openai.chat.completions.create({
        model: "model: "meta-llama/llama-3.1-70b-instruct",",
        messages: [
          { role: "system", content: "You are a helpful YouTube strategy assistant." },
          ...history.map((h: any) => ({ role: h.role, content: h.content })),
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No response from AI");
      res.json(JSON.parse(content));
    } catch (err) {
      console.error("Chat error:", err);
      res.status(500).json({ message: "Failed to process chat" });
    }
  });

  app.post("/api/compare", async (req, res) => {
    try {
      const { userVideo, competitorUrl } = req.body;
      
      // 1. Fetch competitor metadata if URL provided
      let competitorData = null;
      if (competitorUrl) {
        const youtubeRegex = /(?:https?:\/\/)?(?:www\.|m\.)?youtu(?:be\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|live\/)|.be\/)([a-zA-Z0-9_-]{11})/;
        const match = competitorUrl.match(youtubeRegex);
        const videoId = match ? match[1] : null;

        if (videoId) {
          const apiKey = process.env.YOUTUBE_API_KEY;
          const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${apiKey}`;
          const response = await fetch(apiUrl);
          const data = await response.json() as any;
          if (data.items?.length) {
            competitorData = {
              title: data.items[0].snippet.title,
              viewCount: data.items[0].statistics.viewCount,
              likeCount: data.items[0].statistics.likeCount,
              publishedAt: data.items[0].snippet.publishedAt
            };
          }
        }
      }

      const prompt = `
        Act as a YouTube performance analyst. Compare the following two videos:
        
        YOUR VIDEO:
        ${JSON.stringify(userVideo)}
        
        COMPETITOR VIDEO:
        ${competitorData ? JSON.stringify(competitorData) : "N/A (General niche benchmark)"}

        Provide a benchmarking report in JSON:
        - score: number (0-100)
        - strength: string (what user did better)
        - weakness: string (what competitor does better)
        - recommendation: string (specific action to beat competitor)
        - marketGap: string (unfilled need in this niche)
      `;

      const aiResponse = await openai.chat.completions.create({
        model: "meta-llama/llama-3.1-70b-instruct",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      res.json(JSON.parse(aiResponse.choices[0].message.content || "{}"));
    } catch (err) {
      res.status(500).json({ message: "Comparison failed" });
    }
  });

  return httpServer;
}
