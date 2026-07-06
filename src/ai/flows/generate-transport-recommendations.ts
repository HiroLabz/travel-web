'use server';
/**
 * @fileOverview Generates transport/commute recommendations for a destination.
 *
 * - generateTransportRecommendations - A function that generates transport recommendations.
 * - GenerateTransportRecommendationsInput - The input type for the function.
 * - GenerateTransportRecommendationsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateTransportRecommendationsInputSchema = z.object({
  city: z.string().describe('The city to get transport recommendations for'),
  country: z.string().optional().describe('The country of the city'),
  days: z.number().describe('The number of days for the trip'),
  travelGroup: z.string().describe('Travel group: solo, couple, family, friends, business'),
  budget: z.string().describe('Budget level: budget, midrange, luxury, ultra'),
  selectedTransportOptions: z.array(z.string()).describe('Transport options selected by user'),
});
export type GenerateTransportRecommendationsInput = z.infer<typeof GenerateTransportRecommendationsInputSchema>;

const TransportRecommendationSchema = z.object({
  type: z.string().describe('Transport type (e.g., metro, bus, taxi, bike, walking)'),
  name: z.string().describe('Name or description of the transport option'),
  description: z.string().describe('Detailed description of how to use this transport'),
  costInfo: z.string().describe('Cost information (e.g., "$2 per ride", "$30 day pass")'),
  availability: z.string().describe('When available (e.g., "24/7", "6am-midnight")'),
  tips: z.string().optional().describe('Practical tips for using this transport'),
  apps: z.array(z.string()).optional().describe('Recommended apps for this transport'),
  bestFor: z.string().describe('What this transport is best for (e.g., "long distances", "short trips", "sightseeing")'),
});

const GenerateTransportRecommendationsOutputSchema = z.object({
  transportOptions: z.array(TransportRecommendationSchema).describe('List of transport recommendations'),
  generalTips: z.string().describe('General transport tips for the destination'),
  cardRecommendation: z.string().optional().describe('Recommended transport card or pass if available'),
});
export type GenerateTransportRecommendationsOutput = z.infer<typeof GenerateTransportRecommendationsOutputSchema>;

export async function generateTransportRecommendations(
  input: GenerateTransportRecommendationsInput
): Promise<GenerateTransportRecommendationsOutput> {
  return generateTransportRecommendationsFlow(input);
}

const generateTransportRecommendationsFlow = ai.defineFlow(
  {
    name: 'generateTransportRecommendationsFlow',
    inputSchema: GenerateTransportRecommendationsInputSchema,
    outputSchema: GenerateTransportRecommendationsOutputSchema,
  },
  async (input) => {
    const transportList = input.selectedTransportOptions.join(', ');

    const result = await ai.generate({
      prompt: `You are a local transport expert. Generate comprehensive transport and commute recommendations for traveling in ${input.city}${input.country ? `, ${input.country}` : ''}.

Trip Details:
- Duration: ${input.days} days
- Travel Group: ${input.travelGroup}
- Budget: ${input.budget}
- Selected Transport Preferences: ${transportList}

Generate detailed transport recommendations covering the following transport types that are actually available in ${input.city}:
- Public Transit (metro, subway, light rail, trams)
- Buses (public and private)
- Taxis and Ride-sharing (Uber, Lyft, local alternatives)
- Bikes and Scooters (bike share, e-scooter rentals)
- Walking (walkability of the city)
- Car Rental (if appropriate)
- Water Transport (if applicable - ferries, water taxis)
- Airport Transfers

For each transport option, provide:
1. type: The type of transport (metro, bus, taxi, bike, walking, car_rental, water, airport_transfer)
2. name: Name or short description of the transport
3. description: How to use it, where to find it, coverage areas (2-3 sentences)
4. costInfo: Typical costs, ticket prices, passes available
5. availability: Operating hours
6. tips: 1-2 practical tips for using this transport efficiently
7. apps: List of recommended apps for this transport (e.g., ["Google Maps", "Citymapper"])
8. bestFor: What situations this transport is ideal for

Important:
- Only include transport options that actually exist in ${input.city}
- Consider the budget level (budget travelers prefer public transit, luxury might prefer taxis/car service)
- Consider the travel group (families need accessibility, business travelers need efficiency)
- Include practical information about payment methods, cards, passes
- Mention peak hours, tourist routes if relevant
- Focus on ${input.selectedTransportOptions.length > 0 ? 'the selected transport preferences but include other useful options' : 'all practical options'}

Also provide:
- generalTips: 3-5 practical tips about getting around ${input.city}
- cardRecommendation: If there's a recommended transport card or pass (like London Oyster, Tokyo Suica, etc.)

Return a JSON object with the structure described above.`,
      output: { schema: GenerateTransportRecommendationsOutputSchema },
    });

    return {
      transportOptions: result.output!.transportOptions,
      generalTips: result.output!.generalTips,
      cardRecommendation: result.output!.cardRecommendation,
    };
  }
);
