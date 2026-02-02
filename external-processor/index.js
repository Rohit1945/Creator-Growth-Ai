import express from "express";
import multer from "multer";
import cors from "cors";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
app.use(cors());

const upload = multer({ dest: "uploads/" });

app.post("/process-video", upload.single("video"), async (req, res) => {
  try {
    const videoPath = req.file.path;
    const audioPath = `uploads/${Date.now()}.wav`;

    ffmpeg(videoPath)
      .audioChannels(1)
      .audioFrequency(16000)
      .format("wav")
      .save(audioPath)
      .on("end", () => {
        fs.unlinkSync(videoPath); // delete video

        // TODO: send audioPath to transcription
        // For now return success
        res.json({
          success: true,
          message: "Audio extracted successfully",
          audioPath
        });
      })
      .on("error", (err) => {
        console.error(err);
        res.status(500).json({ error: "FFmpeg failed" });
      });

  } catch (err) {
    res.status(500).json({ error: "Processing error" });
  }
});

app.listen(3000, () => {
  console.log("Processor running on port 3000");
});
