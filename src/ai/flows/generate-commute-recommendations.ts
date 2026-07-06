'use server';
/**
 * @fileOverview Generates detailed transit/commute recommendations between locations.
 *
 * - generateCommuteRecommendations - A function that generates transit recommendations.
 * - GenerateCommuteRecommendationsInput - The input type for the function.
 * - GenerateCommuteRecommendationsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateCommuteRecommendationsInputSchema = z.object({
  originName: z.string().describe('Name of origin location (e.g., hotel name)'),
  originAddress: z.string().describe('Full address of origin'),
  destinationName: z.string().describe('Name of destination (e.g., activity name)'),
  destinationAddress: z.string().describe('Full address of destination'),
  city: z.string().describe('City name'),
  country: z.string().describe('Country name'),
  preferredTime: z.string().optional().describe('Preferred travel time (morning/afternoon/evening)'),
  currency: z.string().optional().describe('Preferred currency for pricing'),
});
export type GenerateCommuteRecommendationsInput = z.infer<typeof GenerateCommuteRecommendationsInputSchema>;

const TransitStepSchema = z.object({
  mode: z.string().describe('Transport mode (walk, bus, train, metro, etc.)'),
  instruction: z.string().describe('Detailed instruction for this step'),
  duration: z.string().optional().describe('Estimated duration for this step'),
});

const GenerateCommuteRecommendationsOutputSchema = z.object({
  transitRecommendation: z.string().describe('Summary of the best transit option'),
  transitSteps: z.array(TransitStepSchema).describe('Step-by-step transit instructions'),
  alternativeOptions: z.array(z.string()).describe('Alternative transport options (2-3 options)'),
  tips: z.array(z.string()).describe('Local tips for this route (3-5 tips)'),
  estimatedCost: z.string().optional().describe('Estimated cost in local currency'),
  bestTimeToTravel: z.string().optional().describe('Best time to travel to avoid crowds'),
});
export type GenerateCommuteRecommendationsOutput = z.infer<typeof GenerateCommuteRecommendationsOutputSchema>;

export async function generateCommuteRecommendations(
  input: GenerateCommuteRecommendationsInput
): Promise<GenerateCommuteRecommendationsOutput> {
  return generateCommuteRecommendationsFlow(input);
}

const generateCommuteRecommendationsFlow = ai.defineFlow(
  {
    name: 'generateCommuteRecommendationsFlow',
    inputSchema: GenerateCommuteRecommendationsInputSchema,
    outputSchema: GenerateCommuteRecommendationsOutputSchema,
  },
  async (input) => {
    const currencyStr = input.currency || 'local currency';
    const timeContext = input.preferredTime ? `\nPreferred travel time: ${input.preferredTime}` : '';

    const result = await ai.generate({
      prompt: `You are a local transportation expert for ${input.city}, ${input.country}.

Provide detailed transit/commute recommendations for this route:

FROM: ${input.originName}
Address: ${input.originAddress}

TO: ${input.destinationName}
Address: ${input.destinationAddress}
${timeContext}

Generate a comprehensive commute guide with:

1. transitRecommendation: A clear summary of the BEST way to get there (prefer public transit when practical)

2. transitSteps: Step-by-step instructions (5-8 steps typically):
   For each step provide:
   - mode: The transport mode (walk, bus, train, metro, taxi, etc.)
   - instruction: Detailed instruction (e.g., "Walk 300m north to Ayala MRT Station", "Take Line 3 towards North Avenue", "Exit at Shaw Boulevard Station")
   - duration: Estimated time for this step (e.g., "5 mins", "15 mins")

3. alternativeOptions: 2-3 alternative ways to get there:
   - Taxi/Grab option with estimated cost
   - Walking if reasonable (under 20 minutes)
   - Other viable routes

4. tips: 3-5 local tips:
   - Which apps to use for transit (Google Maps, Sakay.ph, Moovit, local apps)
   - Payment methods (cash, cards, transit passes like Beep, Suica, Oyster)
   - Rush hour warnings
   - Safety tips
   - Best practices for tourists

5. estimatedCost: Total estimated cost for public transit in ${currencyStr}

6. bestTimeToTravel: When to travel to avoid crowds or get better service

Be SPECIFIC with:
- Exact station/stop names
- Line numbers and directions
- Walking directions between connections
- Local landmarks for navigation

This should enable a tourist to confidently navigate from the origin to destination using public transit.

Return a JSON object with all fields properly populated.`,
      output: { schema: GenerateCommuteRecommendationsOutputSchema },
    });

    return {
      transitRecommendation: result.output!.transitRecommendation,
      transitSteps: result.output!.transitSteps,
      alternativeOptions: result.output!.alternativeOptions,
      tips: result.output!.tips,
      estimatedCost: result.output!.estimatedCost,
      bestTimeToTravel: result.output!.bestTimeToTravel,
    };
  }
);
