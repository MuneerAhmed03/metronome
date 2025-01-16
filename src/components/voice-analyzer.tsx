'use client';

import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  MicIcon,
  LoaderIcon,
  RefreshCwIcon,
  ClockIcon,
  GaugeIcon,
  PauseIcon,
  StopCircleIcon,
  PlayIcon,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown'
import parse from 'html-react-parser';

interface SpeechMetrics {
  duration: number;
  wpm: number;
  pauses: {
    totalPauses: number;
    averagePauseDuration: number;
    longPauses: number;
  };
}

const BentoGrid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {children}
  </div>
)

const BentoItem = ({ title, content }: { title: string; content: string }) => (
  <div className="bg-white shadow-md rounded-lg p-4">
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <ReactMarkdown className="prose prose-sm max-w-none">
      {content}
    </ReactMarkdown>
  </div>
)

export default function VoiceAnalyzer() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<SpeechMetrics | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const MAX_RECORDING_DURATION = 300; // 5 minutes

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100, // Higher sample rate
          noiseSuppression: true,
          echoCancellation: true,
        },
      });

      // Initialize audio context and analyser for real-time visualization
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        setAudioUrl(URL.createObjectURL(audioBlob));
        analyzeSpeech(audioBlob);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start recording timer
      recordingTimeoutRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Stop recording after max duration
      setTimeout(() => {
        stopRecording();
      }, MAX_RECORDING_DURATION * 1000);

      // Monitor volume level
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
      console.error('Error accessing microphone:', error);
      setError('Microphone access is required for recording. Please enable it in your browser settings.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recordingTimeoutRef.current) {
        clearInterval(recordingTimeoutRef.current);
      }
    }
  };

  // Analyze speech
  const analyzeSpeech = async (blob: Blob) => {
    try {
      setIsAnalyzing(true);
      setFeedback('Analyzing your speech...');

      const formData = new FormData();
      formData.append('audio', blob, 'speech.webm');

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze speech');
      }

      const data = await response.json();
      //@ts-ignore
      setFeedback(data.feedback);
      //@ts-ignore
      setMetrics(data.metrics);
    } catch (error) {
      console.error('Error analyzing speech:', error);
      setError('Failed to analyze speech. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Reset the analyzer
  const handleReset = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setFeedback(null);
    setMetrics(null);
    setRecordingTime(0);
    setVolumeLevel(0);
    setError(null);

    if (mediaRecorderRef.current && isRecording) {
      stopRecording();
    }
  };

  // Playback recorded audio
  const playRecording = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  const parseFeedback = (feedbackText: string) => {
    const sections = feedbackText.split('##').slice(1)
    return sections.map(section => {
      const [title, ...content] = section.split('\n')
      return { title: title.trim(), content: content.join('\n').trim() }
    })
  }

  return (
    <Card className="p-6 max-w-3xl mx-auto">
      <div className="space-y-8">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-full flex justify-center">
            <Button
              size="lg"
              variant={isRecording ? 'destructive' : 'default'}
              onClick={isRecording ? stopRecording : startRecording}
              className="rounded-full w-16 h-16 p-0"
              disabled={isAnalyzing}
            >
              {isRecording ? (
                <StopCircleIcon className="w-8 h-8" />
              ) : (
                <MicIcon className="w-8 h-8" />
              )}
            </Button>
          </div>

          {isRecording && (
            <p className="text-sm text-muted-foreground animate-pulse">
              Recording... {recordingTime}s / {MAX_RECORDING_DURATION}s
            </p>
          )}

          {isAnalyzing && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <LoaderIcon className="animate-spin" />
              <span>Analyzing your speech...</span>
            </div>
          )}

          {error && (
            <div className="text-red-500 text-sm">
              {error}
            </div>
          )}

          {audioUrl && (
            <Button
              variant="outline"
              onClick={playRecording}
              className="flex items-center gap-2"
            >
              <PlayIcon className="w-4 h-4" />
              Play Recording
            </Button>
          )}
        </div>

        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 flex items-center gap-3">
              <ClockIcon className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-semibold">{metrics.duration.toFixed(1)}s</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <GaugeIcon className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Pace</p>
                <p className="font-semibold">{metrics.wpm} WPM</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <PauseIcon className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Pauses</p>
                <p className="font-semibold">{metrics.pauses.totalPauses}</p>
              </div>
            </Card>
          </div>
        )}

        {feedback && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Analysis Results:</h3>
            <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap">
            {/* <ReactMarkdown className="prose prose-sm max-w-none">
            {feedback}
    </ReactMarkdown> */}
            {parse(feedback)}
    {feedback}
            </div>
            <Button
              variant="outline"
              onClick={handleReset}
              className="w-full"
            >
              <RefreshCwIcon className="w-4 h-4 mr-2" />
              Start New Recording
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}