"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Mic,
  LineChart,
  StopCircle,
  Play,
  RefreshCw,
  Loader,
  X,
  BarChart2,
  Pause,
} from "lucide-react";
import Dashboard from "./Bento";
import { SpeechMetrics, BentoCardProps as FeedBack } from "@/models/type";

const BentoGrid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {children}
  </div>
);

export default function VoiceAnalyzer() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<FeedBack | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [showPlayer, setShowPlayer] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const MAX_RECORDING_DURATION = 300;
  const MIN_RECORDING_DURATION = 20;

  const recordingTimeRef = useRef(0);

  const startRecording = async () => {
    try {
      setRecordingTime(0);
      recordingTimeRef.current = 0;
      setError(null);
      setAudioBlob(null);
      setAudioUrl(null);
      setIsPlaying(false);
      setShowPlayer(false);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          noiseSuppression: true,
          echoCancellation: true,
        },
      });

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log("from on stop", recordingTimeRef.current);
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(audioBlob);
        setAudioUrl(URL.createObjectURL(audioBlob));

        if (recordingTimeRef.current >= MIN_RECORDING_DURATION) {
          analyzeSpeech(audioBlob);
        } else {
          setError("Recording too short. Please record at least 20 seconds.");
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      recordingTimeoutRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          recordingTimeRef.current = newTime;
          console.log(newTime);
          return newTime;
        });
      }, 1000);

      setTimeout(() => {
        stopRecording();
      }, MAX_RECORDING_DURATION * 1000);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        const volume = Math.max(...dataArray);
        setVolumeLevel(volume);
        requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setError(
        "Microphone access is required for recording. Please enable it in your browser settings.",
      );
    }
  };
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recordingTimeoutRef.current) {
        clearInterval(recordingTimeoutRef.current);
      }
    }
  };

  const analyzeSpeech = async (blob: Blob) => {
    try {
      setIsAnalyzing(true);
      const formData = new FormData();
      formData.append("audio", blob, "speech.webm");

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to analyze speech");
      }

      const data = await response.json();
      //@ts-expect-error
      setFeedback(data);
      setIsOpen(true);
      setError(null);
    } catch (error) {
      console.error("Error analyzing speech:", error);
      setError("Failed to analyze speech. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setFeedback(null);
    setRecordingTime(0);
    setVolumeLevel(0);
    setError(null);
    setIsOpen(false);
    setIsPlaying(false);
    setShowPlayer(false);

    if (mediaRecorderRef.current && isRecording) {
      stopRecording();
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
        setShowPlayer(true);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const seekTime = parseFloat(e.target.value);
      audioRef.current.currentTime = seekTime;
      setAudioProgress(seekTime);
    }
  };

  const playRecording = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener("timeupdate", () => {
        if (audioRef.current) {
          setAudioProgress(audioRef.current.currentTime);
        }
      });
    }
  }, [audioUrl]);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl p-10 space-y-10 border border-slate-700">
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-semibold text-white">
                Start Recording Your Speech
              </h2>
            </div>

            <div className="flex flex-col items-center justify-center gap-8">
              <div className="relative">
                {!feedback ? (
                  <>
                    <div
                      className={`absolute inset-0 bg-indigo-500/20 rounded-full transition-transform duration-300 ${
                        isRecording ? "animate-pulse" : ""
                      }`}
                      style={{
                        transform: `scale(${1 + volumeLevel / 255})`,
                        opacity: 0.3,
                      }}
                    />
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isAnalyzing}
                      className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isRecording
                          ? "bg-red-500 hover:bg-red-600 scale-110"
                          : "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
                      } text-white shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isRecording ? (
                        <StopCircle className="w-12 h-12" />
                      ) : (
                        <Mic className="w-12 h-12" />
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsOpen(true)}
                    className="relative z-10 px-6 py-3 rounded-lg flex items-center justify-center bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-indigo-500/25 hover:scale-105 transition-all duration-300"
                  >
                    <div className="flex gap-4">
                      <BarChart2 className="w-6 h-6" />
                      <span className="text-lg font-semibold">
                        View Analysis
                      </span>
                    </div>
                  </button>
                )}
              </div>

              {isRecording && (
                <div className="flex items-center gap-3 bg-slate-900/50 px-6 py-3 rounded-full border border-slate-700">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <p className="text-slate-300 font-medium">
                    Recording... {recordingTime}s / {MAX_RECORDING_DURATION}s
                  </p>
                </div>
              )}

              {isAnalyzing && (
                <div className="flex items-center gap-3 bg-slate-900/50 px-6 py-3 rounded-full border border-slate-700">
                  <Loader className="w-5 h-5 animate-spin text-indigo-400" />
                  <span className="text-slate-300 font-medium">
                    Analyzing your speech...
                  </span>
                </div>
              )}

              {error && (
                <div className="text-red-400 text-sm bg-slate-900/50 px-6 py-3 rounded-full border border-red-900/50">
                  {error}
                </div>
              )}

              {audioUrl && !isAnalyzing && (
                <div className="flex gap-4">
                  <button
                    onClick={playRecording}
                    className="flex items-center gap-2 px-4 py-3 sm:px-6 text-sm font-medium text-white bg-indigo-500/10 hover:bg-indigo-500/20 rounded-full transition-colors border border-indigo-400/20"
                  >
                    <Play className="w-5 h-5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Play Recording</span>
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-3 sm:px-6 text-sm font-medium text-white bg-slate-500/10 hover:bg-slate-500/20 rounded-full transition-colors border border-slate-400/20"
                  >
                    <RefreshCw className="w-5 h-5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">New Recording</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {feedback && (
        <>
          <div
            className={`fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${
              isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            onClick={() => setIsOpen(false)}
          />

          <div
            className={`fixed inset-x-0 bottom-0 transform transition-transform duration-300 ease-out ${
              isOpen ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <div className="relative bg-slate-900 rounded-t-xl border-t border-slate-700">
              <button
                onClick={() => setIsOpen(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              {isOpen && (
                <Dashboard
                  analysisData={feedback}
                  onClose={() => setIsOpen(false)}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
