import { SpeechAnalysis } from "./response.schema";

export interface SpeechMetrics {
  duration: number;
  wpm: number;
  pauses: {
    totalPauses: number;
    averagePauseDuration: number;
    longPauses: number;
  };
}

export interface BentoCardProps {
  speechAnalysis: SpeechAnalysis;
  metrics: SpeechMetrics;
}
