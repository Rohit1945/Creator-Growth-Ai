import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Youtube, 
  Instagram, 
  Music2, 
  Zap, 
  TrendingUp, 
  Hash, 
  Tag, 
  FileText, 
  Lightbulb, 
  AlertCircle,
  Link as LinkIcon,
  Upload
} from "lucide-react";

import { useAnalyzeVideo } from "@/hooks/use-analyze";
import { analysisRequestSchema, type AnalysisRequest } from "@shared/schema";
import { ResultCard } from "@/components/ResultCard";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

// Platform icons map
const PlatformIcons = {
  YouTube: Youtube,
  Instagram: Instagram,
  TikTok: Music2,
};

export default function Home() {
  const [hasResult, setHasResult] = useState(false);
  const [isFetchingYoutube, setIsFetchingYoutube] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { mutate, isPending, data: result, error } = useAnalyzeVideo();

  const form = useForm<AnalysisRequest>({
    resolver: zodResolver(analysisRequestSchema),
    defaultValues: {
      platform: "YouTube",
      niche: "Tech",
      channelSize: "Small",
      videoType: "Long",
      idea: "",
      youtubeUrl: "",
      transcript: "",
    },
  });

  const handleYoutubeFetch = async () => {
    const url = form.getValues("youtubeUrl")?.trim();
    if (!url) return;

    setIsFetchingYoutube(true);
    try {
      const res = await fetch(api.fetchYoutubeVideo.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch video details");
      }

      form.setValue("idea", `Title: ${data.title}\nDescription: ${data.description}\nTags: ${data.tags.join(", ")}\nChannel: ${data.channelTitle}`);
      toast({
        title: "Success",
        description: "YouTube video details imported successfully!",
      });
    } catch (err: any) {
      const isSetupError = err.message.includes("API key not configured");
      toast({
        title: isSetupError ? "YouTube Setup Needed" : "Error",
        variant: "destructive",
        description: isSetupError 
          ? "Please add your 'YOUTUBE_API_KEY' to the Secrets tab (padlock icon) in the sidebar."
          : err.message || "Could not fetch YouTube video. Please check the URL.",
      });
    } finally {
      setIsFetchingYoutube(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("video", file);

    try {
      const res = await fetch(api.uploadVideo.path, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to upload video");

      const data = await res.json();
      form.setValue("transcript", data.transcript);
      toast({
        title: "Success",
        description: "Video transcribed successfully!",
      });
    } catch (err) {
      toast({
        title: "Error",
        variant: "destructive",
        description: "Failed to process video file.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = (data: AnalysisRequest) => {
    setHasResult(false);
    mutate(data, {
      onSuccess: () => {
        setHasResult(true);
        // Smooth scroll to results on mobile
        setTimeout(() => {
          document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      },
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-body overflow-x-hidden selection:bg-primary/20">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-muted-foreground mb-4 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>AI-Powered Content Strategy</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight">
            Creator Growth <span className="text-gradient">AI</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Turn simple ideas into viral content. Get optimized titles, tags, and performance predictions in seconds.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Input Section */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-5 space-y-8"
          >
            <div className="glass-card rounded-3xl p-8 sticky top-8">
              <h2 className="text-2xl font-display font-bold mb-6 flex items-center gap-2">
                <Zap className="w-6 h-6 text-accent" />
                Video Details
              </h2>

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground ml-1">Platform</label>
                    <select
                      {...form.register("platform")}
                      className="w-full px-4 py-3 rounded-xl glass-input outline-none focus:ring-2 appearance-none cursor-pointer"
                    >
                      <option value="YouTube">YouTube</option>
                      <option value="Instagram">Instagram</option>
                      <option value="TikTok">TikTok</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground ml-1">Type</label>
                    <select
                      {...form.register("videoType")}
                      className="w-full px-4 py-3 rounded-xl glass-input outline-none focus:ring-2 appearance-none cursor-pointer"
                    >
                      <option value="Long">Long Form</option>
                      <option value="Short">Short / Reel</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground ml-1">Niche</label>
                    <select
                      {...form.register("niche")}
                      className="w-full px-4 py-3 rounded-xl glass-input outline-none focus:ring-2 appearance-none cursor-pointer"
                    >
                      <option value="Tech">Tech & Coding</option>
                      <option value="Gaming">Gaming</option>
                      <option value="Lifestyle">Lifestyle</option>
                      <option value="Education">Education</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Business">Business</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground ml-1">Channel Size</label>
                    <select
                      {...form.register("channelSize")}
                      className="w-full px-4 py-3 rounded-xl glass-input outline-none focus:ring-2 appearance-none cursor-pointer"
                    >
                      <option value="Small">Small (&lt;10k)</option>
                      <option value="Medium">Medium (10k-100k)</option>
                      <option value="Large">Large (100k+)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground ml-1">Paste YouTube Link (Optional)</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          {...form.register("youtubeUrl")}
                          type="url"
                          placeholder="https://youtube.com/watch?v=..."
                          className="w-full pl-10 pr-4 py-3 rounded-xl glass-input outline-none focus:ring-2"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleYoutubeFetch}
                        disabled={isFetchingYoutube || !form.watch("youtubeUrl")}
                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50 transition-colors text-sm font-medium"
                      >
                        {isFetchingYoutube ? "..." : "Fetch"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground ml-1">Upload Video (Optional)</label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".mp4,.mov"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-white/10 hover:border-primary/30 hover:bg-white/5 transition-all text-sm text-muted-foreground"
                    >
                      <Upload className="w-4 h-4" />
                      {isUploading ? "Transcribing..." : "Upload .mp4 or .mov"}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground ml-1">Video Idea or Script</label>
                  <textarea
                    {...form.register("idea")}
                    placeholder="Describe your video idea, script, or main topic here..."
                    className="w-full px-4 py-3 rounded-xl glass-input min-h-[160px] resize-none outline-none focus:ring-2"
                  />
                  {form.formState.errors.idea && (
                    <p className="text-sm text-destructive flex items-center gap-1 mt-1 px-1">
                      <AlertCircle className="w-3 h-3" />
                      {form.formState.errors.idea.message}
                    </p>
                  )}
                </div>

                {error && (
                  <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Failed to analyze. Please try again.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending || isUploading || isFetchingYoutube}
                  className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
                >
                  {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Analyzing...
                    </span>
                  ) : (
                    "Analyze Video"
                  )}
                </button>
              </form>
            </div>
          </motion.div>

          {/* Results Section */}
          <div className="lg:col-span-7 space-y-6" id="results-section">
            <AnimatePresence mode="wait">
              {!hasResult && !isPending && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center text-center p-12 text-muted-foreground/40 space-y-4 border-2 border-dashed border-white/5 rounded-3xl min-h-[400px]"
                >
                  <Sparkles className="w-16 h-16 opacity-50" />
                  <p className="text-lg font-medium">Ready to optimize your content</p>
                </motion.div>
              )}
              
              {isPending && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center text-center p-12 space-y-6 min-h-[400px]"
                >
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-display font-bold text-foreground">Generating Strategy</h3>
                    <p className="text-muted-foreground">Analyzing trends, optimizing keywords...</p>
                  </div>
                </motion.div>
              )}

              {hasResult && result && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-1 gap-6"
                >
                  {/* Performance Prediction */}
                  <ResultCard 
                    title="Performance Prediction" 
                    icon={TrendingUp} 
                    variant="gradient"
                    delay={0}
                  >
                    <div className="flex items-start justify-between gap-6">
                      <div className="space-y-4 flex-1">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "px-4 py-1.5 rounded-full text-sm font-bold border",
                            result.performancePrediction.potential === "High" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                            result.performancePrediction.potential === "Medium" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                            "bg-red-500/10 text-red-400 border-red-500/20"
                          )}>
                            {result.performancePrediction.potential} Potential
                          </span>
                          <span className="text-sm text-muted-foreground font-mono">
                            {result.performancePrediction.confidenceScore}% Confidence
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {result.performancePrediction.reason}
                        </p>
                      </div>
                      <div className="hidden sm:block">
                        {/* Simple gauge visualization */}
                        <div className="w-16 h-16 rounded-full border-4 border-white/5 flex items-center justify-center relative">
                          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeDasharray={`${result.performancePrediction.confidenceScore}, 100`}
                              className={cn(
                                result.performancePrediction.potential === "High" ? "text-green-500" :
                                result.performancePrediction.potential === "Medium" ? "text-yellow-500" :
                                "text-red-500"
                              )}
                            />
                          </svg>
                          <span className="text-xs font-bold">{result.performancePrediction.confidenceScore}</span>
                        </div>
                      </div>
                    </div>
                  </ResultCard>

                  {/* Titles */}
                  <ResultCard title="High-CTR Titles" icon={FileText} delay={0.1}>
                    <ul className="space-y-3">
                      {result.titles.map((title: string, i: number) => (
                        <li key={i} className="p-3 rounded-xl bg-background/50 border border-white/5 hover:border-primary/30 transition-colors flex gap-3 group/item">
                          <span className="text-primary/50 font-mono text-sm pt-0.5">0{i+1}</span>
                          <span className="text-sm font-medium group-hover/item:text-primary transition-colors">{title}</span>
                        </li>
                      ))}
                    </ul>
                  </ResultCard>

                  {/* Description */}
                  <ResultCard title="Optimized Description" icon={Lightbulb} delay={0.2}>
                    <div className="p-4 rounded-xl bg-background/50 border border-white/5 text-sm text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                      {result.description}
                    </div>
                  </ResultCard>

                  {/* Tags & Hashtags Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ResultCard title="Hashtags" icon={Hash} delay={0.3}>
                      <div className="flex flex-wrap gap-2">
                        {result.hashtags.map((tag: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/10 hover:border-blue-500/30 transition-colors">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </ResultCard>

                    <ResultCard title="SEO Tags" icon={Tag} delay={0.4}>
                      <div className="flex flex-wrap gap-2">
                        {result.tags.map((tag: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 rounded-md bg-white/5 text-muted-foreground text-xs font-medium border border-white/5 hover:border-white/20 transition-colors">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </ResultCard>
                  </div>

                  {/* Next Ideas */}
                  <ResultCard title="Next Video Ideas" icon={Lightbulb} delay={0.5}>
                    <div className="grid gap-4">
                      {result.nextVideoIdeas.map((item: { idea: string; reason: string }, i: number) => (
                        <div key={i} className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-transparent border border-white/5 hover:border-white/10 transition-colors">
                          <h4 className="font-semibold text-foreground mb-1">{item.idea}</h4>
                          <p className="text-xs text-muted-foreground">{item.reason}</p>
                        </div>
                      ))}
                    </div>
                  </ResultCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
