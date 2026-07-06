'use server';
/**
 * @fileOverview Generates place recommendations based on travel preferences.
 *
 * - generatePlaceRecommendations - A function that generates place recommendations.
 * - GeneratePlaceRecommendationsInput - The input type for the function.
 * - GeneratePlaceRecommendationsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GeneratePlaceRecommendationsInputSchema = z.object({
  city: z.string().describe('The city to get recommendations for'),
  country: z.string().optional().describe('The country of the city'),
  days: z.number().describe('The number of days for the trip'),
  vacationTypes: z.array(z.string()).describe('Types of vacation: beach, city, adventure, cultural, nature, culinary'),
  travelGroup: z.string().describe('Travel group: solo, couple, family, friends, business'),
  budget: z.string().describe('Budget level: budget, midrange, luxury, ultra'),
  transport: z.array(z.string()).describe('Available transport options'),
  dining: z.string().describe('Dining preference: street_food, casual, fine_dining, mix'),
  experiences: z.array(z.string()).describe('Desired experience types like museums, landmarks, historical, nature, adventure, shopping, nightlife, food_tours, art, religious, markets'),
});
export type GeneratePlaceRecommendationsInput = z.infer<typeof GeneratePlaceRecommendationsInputSchema>;

const RecommendedPlaceSchema = z.object({
  id: z.string().describe('Unique identifier for the place'),
  name: z.string().describe('Name of the place'),
  address: z.string().describe('Full address of the place'),
  description: z.string().describe('Brief description of the place (2-3 sentences)'),
  category: z.string().describe('Category matching one of the experience types'),
  estimatedDuration: z.string().describe('Estimated time to spend (e.g., "2-3 hours")'),
  priceLevel: z.string().describe('Price level indicator ($, $$, $$$, or $$$$)'),
  tips: z.string().optional().describe('Local tips or recommendations'),
});

const GeneratePlaceRecommendationsOutputSchema = z.object({
  places: z.array(RecommendedPlaceSchema).describe('List of recommended places'),
  summary: z.string().describe('Brief summary of the recommendations'),
});
export type GeneratePlaceRecommendationsOutput = z.infer<typeof GeneratePlaceRecommendationsOutputSchema>;

export async function generatePlaceRecommendations(
  input: GeneratePlaceRecommendationsInput
): Promise<GeneratePlaceRecommendationsOutput> {
  return generatePlaceRecommendationsFlow(input);
}

const generatePlaceRecommendationsFlow = ai.defineFlow(
  {
    name: 'generatePlaceRecommendationsFlow',
    inputSchema: GeneratePlaceRecommendationsInputSchema,
    outputSchema: GeneratePlaceRecommendationsOutputSchema,
  },
  async (input) => {
    const experienceList = input.experiences.join(', ');
    const transportList = input.transport.join(', ');
    const vacationTypeList = input.vacationTypes.join(', ');

    const result = await ai.generate({
      prompt: `You are a travel expert. Generate place recommendations for a trip to ${input.city}${input.country ? `, ${input.country}` : ''}.

Trip Details:
- Duration: ${input.days} days
- Vacation Types: ${vacationTypeList}
- Travel Group: ${input.travelGroup}
- Budget: ${input.budget}
- Available Transport: ${transportList}
- Dining Preference: ${input.dining}
- Desired Experiences: ${experienceList}

Generate 3-5 specific place recommendations for EACH experience type selected by the user. Each place should be a real, well-known location that exists in ${input.city}.

For each place, provide:
1. id: A unique identifier (use format: category_placename_number, e.g., "museums_tokyo_national_1")
2. name: The exact name of the place
3. address: The full street address
4. description: A compelling 2-3 sentence description of why to visit
5. category: Must match exactly one of: ${experienceList}
6. estimatedDuration: How long to spend there (e.g., "2-3 hours", "Half day", "1-2 hours")
7. priceLevel: Use $, $$, $$$, or $$$$ based on typical costs
8. tips: One practical local tip (optional)

Important:
- Only include places that match the selected experience categories
- Consider the budget level when recommending places
- Consider the travel group (family-friendly for families, romantic spots for couples, etc.)
- Consider the vacation types when suggesting places (beach activities for beach, adventure spots for adventure, etc.)
- Make sure all places are real and currently operating
- Provide accurate addresses

Return a JSON object with:
- places: Array of place objects
- summary: A brief 1-2 sentence summary of the recommendations`,
      output: { schema: GeneratePlaceRecommendationsOutputSchema },
    });

    return {
      places: result.output!.places,
      summary: result.output!.summary,
    };
  }
);
