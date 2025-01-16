import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openaiSpeach = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1/",
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper to calculate words per minute
function calculateWPM(text: string, durationInSeconds: number): number {
  const words = text.trim().split(/\s+/).length;
  const minutes = durationInSeconds / 60;
  return Math.round(words / minutes);
}

// Helper to analyze pauses and rhythm
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

    if (pauseDuration > 0.2) { // pause threshold of 200ms
      console.log("pause increased")
      totalPauses++;
      totalPauseDuration += pauseDuration;
      if (pauseDuration > 1.0) { // long pause threshold of 1 second
        longPauses++;
        console.log("long pause increased")
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
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    const transcription = await openaiSpeach.audio.transcriptions.create({
      file: audioFile, // Pass the Readable stream directly
      model: 'whisper-large-v3',
      response_format: 'verbose_json',
    });

    console.log(transcription);

    // Calculate speech metrics
    //@ts-ignore
    const totalDuration = transcription.segments.reduce((acc, segment) => acc + (segment.end - segment.start), 0);
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
    ${//@ts-ignore
          transcription.segments.map(segment =>
            `[${segment.start.toFixed(2)}s - ${segment.end.toFixed(2)}s]: ${segment.text}`
          ).join('\n')}
    
    Please analyze the speech delivery and language use, and provide neutral feedback of the speech delivery and language use while Avoiding over-praising ans sticking to factual observations.in the following structured format:

    **1. Areas for Improvement**
    - Identify 2-3 specific areas where the speaker can improve their delivery (e.g., clarity, pace, rhythm, articulation, etc.).
    - Identify 2-3 specific areas where the speaker can improve their language use (e.g., repetitive words, vague phrasing, sentence structure, etc.).
    
    **2. Detailed Feedback**
    * **Clarity and Articulation:***
      - Comment on pronunciation and enunciation, pinpointing specific segments where clarity could be improved.
      - Suggest exercises to improve articulation (e.g., tongue twisters, slow reading practice).
    * **Pace and Rhythm:**
      - Evaluate the speaking rate (${wpm} WPM) and whether it suits the context.
      - Comment on the use of pauses and rhythm, highlighting specific segments where pacing could be adjusted.
    * **Confidence and Delivery:**
      - Assess the speaker's tone and delivery, noting any areas where confidence could be improved.
      - Provide tips to sound more confident and engaging.
    * **Language Use:**
      - Evaluate word choice, sentence structure, and overall linguistic effectiveness.
      - Highlight repetitive words or phrases and suggest alternatives. IF ANY
      - Identify vague or unclear phrasing and provide suggestions for improvement.
    
    **3. Recommendations**
    - Provide 3-5 actionable recommendations for improving speech delivery. IF REQUIRED
    - Provide 1-2 actionable recommendations for improving language use. IF REQUIRED
    - Include specific exercises or techniques.
    - Keep the tone neutral and professional.
    
    **4. Key Takeaways
    - Summarize the main points of the analysis in 2-3 sentences.
    - Maintain a neutral tone, avoiding unnecessary praise or criticism.
    
    Write the response in a neutral, professional, and approachable tone. Address the user directly using words like "you" and "your." Avoid over-praising. Focus on providing objective, constructive, and actionable feedback. Avoid commenting on the topic of the speech—focus solely on delivery, verbal choices, and language use. Use bullet points for clarity and readability. Respond with proper Markdown syntax.
    `;
    

const openai = new OpenAI({
      baseURL: "https://api.groq.com/openai/v1/",
      apiKey: process.env.OPENAI_API_KEY,
    });
    const completion = await openai.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'You are an expert speech coach specializing in voice analysis and improvement.',
        },
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
    });

    return NextResponse.json({
      feedback: completion.choices[0].message.content,
      metrics: {
        duration: totalDuration,
        wpm,
        pauses: pauseAnalysis,
      },
    });
  } catch (error) {
    console.error('Error analyzing speech:', error);
    return NextResponse.json(
      { error: 'Failed to analyze speech' },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};