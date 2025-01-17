import VoiceAnalyzer from "@/components/voice-analyzer";
import { MicIcon } from "lucide-react";

export const runtime = "edge";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 overflow-hidden">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center mb-12 mt-8">
          <div className="flex items-center justify-center mb-6">
            <MicIcon className="h-12 w-12 text-indigo-400" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-8 text-white">
            Cadence
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Your personal AI voice instructor that helps you improve your
            speech. Get real-time feedback on your tone, pace, clarity, and
            more.
          </p>
        </div>
        <VoiceAnalyzer />
      </div>
    </main>
  );
}
