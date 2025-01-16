import VoiceAnalyzer from '@/components/voice-analyzer';
import { MicIcon } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <MicIcon className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Metronome AI Voice Coach
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your personal AI voice instructor that helps you improve your speech and communication skills.
            Get real-time feedback on your tone, pace, clarity, and more.
          </p>
        </div>
        <VoiceAnalyzer />
      </div>
    </main>
  );
}