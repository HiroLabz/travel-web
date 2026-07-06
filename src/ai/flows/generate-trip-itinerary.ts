'use server';
/**
 * @fileOverview Generates a trip itinerary based on city, days, and vibe.
 *
 * - generateTripItinerary - A function that generates the trip itinerary.
 * - GenerateTripItineraryInput - The input type for the generateTripItinerary function.
 * - GenerateTripItineraryOutput - The return type for the generateTripItinerary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTripItineraryInputSchema = z.object({
  city: z.string().describe('The city to visit.'),
  days: z.number().describe('The number of days for the trip.'),
  vibe: z.string().describe('The desired vibe of the trip (e.g., relaxing, adventurous, romantic).'),
});
export type GenerateTripItineraryInput = z.infer<typeof GenerateTripItineraryInputSchema>;

const GenerateTripItineraryOutputSchema = z.object({
  itinerary: z.string().describe('A JSON string containing the generated trip itinerary.'),
});
export type GenerateTripItineraryOutput = z.infer<typeof GenerateTripItineraryOutputSchema>;

export async function generateTripItinerary(input: GenerateTripItineraryInput): Promise<GenerateTripItineraryOutput> {
  return generateTripItineraryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTripItineraryPrompt',
  input: {schema: GenerateTripItineraryInputSchema},
  output: {schema: GenerateTripItineraryOutputSchema},
  prompt: `You are a travel expert. Generate a trip itinerary in JSON format for a trip to {{{city}}} lasting {{{days}}} days. The trip vibe is {{{vibe}}}.  The itinerary should include a daily plan with specific activities and estimated cost. Format the output as a valid JSON object.

Example:
{
  "itinerary": [
    {
      "day": 1,
      "activities": [
        { "description": "Visit the Eiffel Tower", "estimated_cost": 50 },
        { "description": "Dinner at a bistro", "estimated_cost": 100 }
      ]
    },
    {
      "day": 2,
      "activities": [
        { "description": "Louvre Museum", "estimated_cost": 75 },
        { "description": "Seine River cruise", "estimated_cost": 40 }
      ]
    }
  ]
}
`,
});

const generateTripItineraryFlow = ai.defineFlow(
  {
    name: 'generateTripItineraryFlow',
    inputSchema: GenerateTripItineraryInputSchema,
    outputSchema: GenerateTripItineraryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
