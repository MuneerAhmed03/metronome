import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, generateObject } from "ai";
import { speechAnalysisSchema, SpeechAnalysis } from "@/models/response.schema";

export const runtime = "edge";

const openaiSpeach = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1/",
  apiKey: process.env.OPENAI_API_KEY,
});

const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.OPENAI_API_KEY,
});

function calculateWPM(text: string, durationInSeconds: number): number {
  const words = text.trim().split(/\s+/).length;
  const minutes = durationInSeconds / 60;
  return Math.round(words / minutes);
}

function analyzePauses(segments: any[]): {
  totalPauses: number;
  averagePauseDuration: number;
  longPauses: number;
} {
  let totalPauses = 0;
  let totalPauseDuration = 0;
  let longPauses = 0;

  for (let i = 0; i < segments.length - 1; i++) {
    const currentSegment = segments[i];
    const nextSegment = segments[i + 1];
    const pauseDuration = nextSegment.start - currentSegment.end;

    if (pauseDuration > 0.2) {
      console.log("pause increased");
      totalPauses++;
      totalPauseDuration += pauseDuration;
      if (pauseDuration > 1.0) {
        longPauses++;
        console.log("long pause increased");
      }
    }
  }

  return {
    totalPauses,
    averagePauseDuration: totalPauses ? totalPauseDuration / totalPauses : 0,
    longPauses,
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 },
      );
    }

    const transcription = await openaiSpeach.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-large-v3",
      response_format: "verbose_json",
    });

    console.log(transcription);

    //@ts-ignore
    const totalDuration = transcription.segments.reduce(
      (acc, segment) => acc + (segment.end - segment.start),
      0,
    );
    const wpm = calculateWPM(transcription.text, totalDuration);
    //@ts-ignore
    const pauseAnalysis = analyzePauses(transcription.segments);
    const analysisPrompt = `
    You are an expert speech coach. Analyze this speech recording with the following metrics:
    
    Speech Duration: ${totalDuration.toFixed(2)} seconds
    Words per Minute: ${wpm}
    Total Pauses: ${pauseAnalysis.totalPauses}
    Average Pause Duration: ${pauseAnalysis.averagePauseDuration.toFixed(2)} seconds
    Long Pauses (>1s): ${pauseAnalysis.longPauses}
    
    Transcription: ${transcription.text}
    
    Segment-level text and timings:
    ${
      //@ts-ignore
      transcription.segments
        .map(
          (segment) =>
            `[${segment.start.toFixed(2)}s - ${segment.end.toFixed(2)}s]: ${segment.text}`,
        )
        .join("\n")
    }
    
    Please analyze the speech delivery and language use, and provide neutral feedback of the speech delivery and language use while avoiding over-praising and sticking to factual observations. Structure your response as follows:

    1. Areas for Improvement:
       - Delivery: List 2-3 specific areas where the speaker can improve their delivery.
       - Language Use: List 2-3 specific areas where the speaker can improve their language use.

    2. Detailed Feedback:
       - Clarity and Articulation: Comment on pronunciation, enunciation, and provide suggestions for improvement.
       - Pace and Rhythm: Evaluate the speaking rate and use of pauses.
       - Confidence and Delivery: Assess the speaker's tone and provide tips for improvement.
       - Language Use: Evaluate word choice, sentence structure, and overall linguistic effectiveness.

    3. Recommendations:
       - Delivery: Provide 3-5 actionable recommendations for improving speech delivery.
       - Language Use: Provide 1-2 actionable recommendations for improving language use.

    4. Key Takeaways: Summarize the main points of the analysis in 2-3 sentences.

    Ensure your response follows this structure exactly, as it will be parsed into a specific format.

     Write the response in a neutral, professional, and approachable tone. Address the user directly using words like "you" and "your." Avoid over-praising. Focus on providing objective, constructive, and actionable feedback. Avoid commenting on the topic of the speech—focus solely on delivery, verbal choices, and language use.
  `;
    const { object } = await generateObject<SpeechAnalysis>({
      model: groq("llama-3.1-70b-versatile"),
      schema: speechAnalysisSchema,
      prompt: analysisPrompt,
    });

    return NextResponse.json({
      speechAnalysis: object,
      metrics: {
        duration: totalDuration,
        wpm,
        pauses: pauseAnalysis,
      },
    });
  } catch (error) {
    console.error("Error analyzing speech:", error);
    return NextResponse.json(
      { error: "Failed to analyze speech" },
      { status: 500 },
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
