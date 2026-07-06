'use server';
/**
 * @fileOverview Generates top-review place recommendations (popularity-focused).
 *
 * - generateTopReviewPlaces - A function that generates most popular attractions.
 * - GenerateTopReviewPlacesInput - The input type for the function.
 * - GenerateTopReviewPlacesOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateTopReviewPlacesInputSchema = z.object({
  city: z.string().describe('The city to get recommendations for'),
  country: z.string().optional().describe('The country of the city'),
  days: z.number().describe('The number of days for the trip'),
  travelGroup: z.string().describe('Travel group: solo, couple, family, friends, business'),
  budget: z.string().describe('Budget level: budget, midrange, luxury, ultra'),
});
export type GenerateTopReviewPlacesInput = z.infer<typeof GenerateTopReviewPlacesInputSchema>;

const TopReviewPlaceSchema = z.object({
  id: z.string().describe('Unique identifier for the place'),
  name: z.string().describe('Name of the place'),
  address: z.string().describe('Full address of the place'),
  description: z.string().describe('Brief description highlighting why this place is popular (2-3 sentences)'),
  category: z.string().describe('Category: landmark, museum, nature, dining, shopping, entertainment, cultural'),
  estimatedDuration: z.string().describe('Estimated time to spend (e.g., "2-3 hours")'),
  priceLevel: z.string().describe('Price level indicator ($, $$, $$$, or $$$$)'),
  reviewCount: z.string().describe('Approximate number of reviews (e.g., "15,000+ reviews", "50K+ reviews")'),
  averageRating: z.string().describe('Average rating (e.g., "4.5/5", "4.3/5")'),
  tips: z.string().optional().describe('Practical tips based on popular visitor feedback'),
  googleMapsUrl: z.string().optional().describe('Google Maps URL (added by server action)'),
  imageSearchUrl: z.string().optional().describe('Google Image Search URL (added by server action)'),
});

const GenerateTopReviewPlacesOutputSchema = z.object({
  places: z.array(TopReviewPlaceSchema).describe('List of most popular places'),
  summary: z.string().describe('Brief summary of what makes these places popular'),
});
export type GenerateTopReviewPlacesOutput = z.infer<typeof GenerateTopReviewPlacesOutputSchema>;

export async function generateTopReviewPlaces(
  input: GenerateTopReviewPlacesInput
): Promise<GenerateTopReviewPlacesOutput> {
  return generateTopReviewPlacesFlow(input);
}

const generateTopReviewPlacesFlow = ai.defineFlow(
  {
    name: 'generateTopReviewPlacesFlow',
    inputSchema: GenerateTopReviewPlacesInputSchema,
    outputSchema: GenerateTopReviewPlacesOutputSchema,
  },
  async (input) => {
    const result = await ai.generate({
      prompt: `You are a travel expert specializing in popular attractions. Generate the MOST POPULAR (review volume-focused) place recommendations for ${input.city}${input.country ? `, ${input.country}` : ''}.

Trip Details:
- Duration: ${input.days} days
- Travel Group: ${input.travelGroup}
- Budget: ${input.budget}

Focus on POPULARITY over exclusivity. Generate 6-8 of the MOST VISITED, most reviewed attractions in ${input.city}.

Selection Criteria:
- High review volume (thousands to tens of thousands of reviews)
- Consistently positive feedback (4.0+ average rating)
- Well-visited by both tourists AND locals
- Popular across different travel platforms (TripAdvisor, Google, etc.)
- Proven track record with visitors
- Mix of free and paid experiences
- Accessible to most travelers

For each place, provide:
1. id: A unique identifier (format: popular_category_number)
2. name: The exact name
3. address: The full street address
4. description: 2-3 sentences explaining WHY this place is so popular with visitors
5. category: landmark, museum, nature, dining, shopping, entertainment, or cultural
6. estimatedDuration: Time to spend (e.g., "1-2 hours", "2-3 hours")
7. priceLevel: Use $, $$, $$$, or $$$$
8. reviewCount: Approximate review volume (e.g., "15,000+ reviews", "50K+ reviews", "100K+ reviews")
9. averageRating: The typical rating score (e.g., "4.5/5", "4.3/5")
10. tips: One practical tip based on common visitor feedback (best time to visit, what to bring, how to avoid crowds, etc.)

Important:
- Prioritize places with high visitor volume and many reviews
- Include crowd-pleasers and must-see spots
- Balance between tourist favorites and local favorites
- All places must be real, currently operating, and actively reviewed
- Consider the budget level
- Consider travel group needs
- Provide accurate addresses
- Include a mix of experience types

Return a JSON object with:
- places: Array of popular place objects
- summary: 1-2 sentence summary highlighting why these places are visitor favorites`,
      output: { schema: GenerateTopReviewPlacesOutputSchema },
    });

    return {
      places: result.output!.places,
      summary: result.output!.summary,
    };
  }
);
