import { z } from 'zod'

export const speechAnalysisSchema = z.object({
  areasForImprovement: z.object({
    delivery: z.array(z.string()).min(2).max(3),
    languageUse: z.array(z.string()).min(2).max(3)
  }),
  detailedFeedback: z.object({
    clarityAndArticulation: z.array(z.string()),
    paceAndRhythm: z.array(z.string()),
    confidenceAndDelivery: z.array(z.string()),
    languageUse: z.array(z.string())
  }),
  recommendations: z.object({
    delivery: z.array(z.string()).min(3).max(5),
    languageUse: z.array(z.string()).min(1).max(2)
  }),
  keyTakeaways: z.array(z.string()).min(2).max(3)
})

export type SpeechAnalysis = z.infer<typeof speechAnalysisSchema>

