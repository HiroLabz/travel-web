'use server';
/**
 * @fileOverview Generates top-rated place recommendations (quality-focused).
 *
 * - generateTopRatedPlaces - A function that generates highest-quality attractions.
 * - GenerateTopRatedPlacesInput - The input type for the function.
 * - GenerateTopRatedPlacesOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateTopRatedPlacesInputSchema = z.object({
  city: z.string().describe('The city to get recommendations for'),
  country: z.string().optional().describe('The country of the city'),
  days: z.number().describe('The number of days for the trip'),
  travelGroup: z.string().describe('Travel group: solo, couple, family, friends, business'),
  budget: z.string().describe('Budget level: budget, midrange, luxury, ultra'),
});
export type GenerateTopRatedPlacesInput = z.infer<typeof GenerateTopRatedPlacesInputSchema>;

const TopRatedPlaceSchema = z.object({
  id: z.string().describe('Unique identifier for the place'),
  name: z.string().describe('Name of the place'),
  address: z.string().describe('Full address of the place'),
  description: z.string().describe('Brief description highlighting why this place is top-rated (2-3 sentences)'),
  category: z.string().describe('Category: landmark, museum, nature, dining, cultural, entertainment'),
  estimatedDuration: z.string().describe('Estimated time to spend (e.g., "2-3 hours")'),
  priceLevel: z.string().describe('Price level indicator ($, $$, $$$, or $$$$)'),
  rating: z.string().describe('Rating score (e.g., "4.8/5")'),
  accolades: z.string().optional().describe('Awards, recognitions, or special status (e.g., "UNESCO World Heritage Site", "Michelin Star", "National Historic Landmark")'),
  tips: z.string().optional().describe('Expert tips or recommendations'),
  googleMapsUrl: z.string().optional().describe('Google Maps URL (added by server action)'),
  imageSearchUrl: z.string().optional().describe('Google Image Search URL (added by server action)'),
});

const GenerateTopRatedPlacesOutputSchema = z.object({
  places: z.array(TopRatedPlaceSchema).describe('List of top-rated places'),
  summary: z.string().describe('Brief summary of what makes these places stand out'),
});
export type GenerateTopRatedPlacesOutput = z.infer<typeof GenerateTopRatedPlacesOutputSchema>;

export async function generateTopRatedPlaces(
  input: GenerateTopRatedPlacesInput
): Promise<GenerateTopRatedPlacesOutput> {
  return generateTopRatedPlacesFlow(input);
}

const generateTopRatedPlacesFlow = ai.defineFlow(
  {
    name: 'generateTopRatedPlacesFlow',
    inputSchema: GenerateTopRatedPlacesInputSchema,
    outputSchema: GenerateTopRatedPlacesOutputSchema,
  },
  async (input) => {
    const result = await ai.generate({
      prompt: `You are a travel expert specializing in premium attractions. Generate the TOP-RATED (quality-focused) place recommendations for ${input.city}${input.country ? `, ${input.country}` : ''}.

Trip Details:
- Duration: ${input.days} days
- Travel Group: ${input.travelGroup}
- Budget: ${input.budget}

Focus on QUALITY over popularity. Generate 6-8 of the HIGHEST-RATED, most acclaimed attractions in ${input.city}.

Selection Criteria:
- 4.5+ star ratings consistently
- Award-winning venues (UNESCO sites, Michelin stars, architectural awards, etc.)
- Iconic landmarks with historical or cultural significance
- Expert-recommended spots from travel publications
- Premium experiences worth the cost
- Unique or exceptional quality

For each place, provide:
1. id: A unique identifier (format: toprated_category_number)
2. name: The exact official name
3. address: The full street address
4. description: 2-3 sentences explaining WHY this is considered top-rated
5. category: landmark, museum, nature, dining, cultural, or entertainment
6. estimatedDuration: Time to spend (e.g., "2-3 hours", "Half day")
7. priceLevel: Use $, $$, $$$, or $$$$
8. rating: The approximate rating (e.g., "4.8/5", "4.9/5")
9. accolades: Any awards, UNESCO status, Michelin stars, "Best of" awards, etc. (IMPORTANT)
10. tips: One expert tip (best time to visit, insider secret, etc.)

Important:
- Only include places that genuinely deserve "top-rated" status
- Prioritize quality and excellence over quantity
- All places must be real, currently operating, and highly acclaimed
- Consider the budget level (luxury budget = more premium venues)
- Consider travel group (family-friendly for families, sophisticated for couples, etc.)
- Provide accurate addresses
- Highlight what makes each place exceptional

Return a JSON object with:
- places: Array of top-rated place objects
- summary: 1-2 sentence summary emphasizing the exceptional quality of these recommendations`,
      output: { schema: GenerateTopRatedPlacesOutputSchema },
    });

    return {
      places: result.output!.places,
      summary: result.output!.summary,
    };
  }
);
