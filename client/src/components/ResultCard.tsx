import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResultCardProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  delay?: number;
  className?: string;
  variant?: "default" | "gradient";
}

export function ResultCard({ 
  title, 
  icon: Icon, 
  children, 
  delay = 0,
  className,
  variant = "default"
}: ResultCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={cn(
        "rounded-2xl p-6 border relative overflow-hidden group",
        variant === "default" 
          ? "bg-secondary/30 border-white/5 hover:border-white/10 hover:bg-secondary/40" 
          : "bg-gradient-to-br from-primary/10 to-accent/5 border-primary/20",
        className
      )}
    >
      {/* Subtle background glow for gradient variant */}
      {variant === "gradient" && (
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className={cn(
          "p-2 rounded-lg",
          variant === "default" ? "bg-white/5 text-muted-foreground" : "bg-primary/10 text-primary"
        )}>
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-semibold text-foreground/90">{title}</h3>
      </div>
      
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}
