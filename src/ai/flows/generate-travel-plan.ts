'use server';
/**
 * @fileOverview Generates travel/transport recommendations between destinations.
 *
 * - generateTravelPlan - A function that generates transport options between destinations.
 * - GenerateTravelPlanInput - The input type for the function.
 * - GenerateTravelPlanOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DestinationSchema = z.object({
  city: z.string(),
  country: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const GenerateTravelPlanInputSchema = z.object({
  destinations: z.array(DestinationSchema).describe('List of destinations in order'),
  originCity: z.string().optional().describe('The city of origin (home city)'),
  originCountry: z.string().optional().describe('The country of origin'),
  budget: z.string().optional().describe('Budget level: budget, midrange, luxury'),
  travelGroup: z.string().optional().describe('Travel group: solo, couple, family, friends'),
  currency: z.string().optional().describe('Currency code for prices (e.g., USD, EUR, PHP)'),
});
export type GenerateTravelPlanInput = z.infer<typeof GenerateTravelPlanInputSchema>;

const TransportOptionSchema = z.object({
  id: z.string().describe('Unique identifier'),
  type: z.string().describe('Type of transport: flight, train, bus, ferry, car, etc.'),
  from: z.string().describe('Departure city'),
  to: z.string().describe('Arrival city'),
  provider: z.string().describe('Suggested airline, train company, or service'),
  duration: z.string().describe('Estimated travel time'),
  estimatedCost: z.string().describe('Estimated cost range'),
  frequency: z.string().describe('How often this route operates (e.g., "Multiple daily", "2x weekly")'),
  tips: z.string().optional().describe('Booking tips or recommendations'),
  bookingUrl: z.string().optional().describe('Suggested booking website'),
});

const RouteLegSchema = z.object({
  from: z.string().describe('Departure city'),
  to: z.string().describe('Arrival city'),
  options: z.array(TransportOptionSchema).describe('Available transport options for this leg'),
  recommendation: z.string().describe('Which option is recommended and why'),
});

const GenerateTravelPlanOutputSchema = z.object({
  legs: z.array(RouteLegSchema).describe('Transport options for each leg of the journey'),
  summary: z.string().describe('Brief summary of the overall travel plan'),
  totalEstimatedCost: z.string().describe('Total estimated cost range for all transport'),
  tips: z.array(z.string()).describe('General travel tips for this route'),
});
export type GenerateTravelPlanOutput = z.infer<typeof GenerateTravelPlanOutputSchema>;

export async function generateTravelPlan(
  input: GenerateTravelPlanInput
): Promise<GenerateTravelPlanOutput> {
  return generateTravelPlanFlow(input);
}

const generateTravelPlanFlow = ai.defineFlow(
  {
    name: 'generateTravelPlanFlow',
    inputSchema: GenerateTravelPlanInputSchema,
    outputSchema: GenerateTravelPlanOutputSchema,
  },
  async (input) => {
    const destinationList = input.destinations
      .map((d, i) => `${i + 1}. ${d.city}, ${d.country}${d.startDate ? ` (${d.startDate}${d.endDate ? ` to ${d.endDate}` : ''})` : ''}`)
      .join('\n');

    const hasOrigin = input.originCity && input.originCountry;
    const originText = hasOrigin
      ? `Origin: ${input.originCity}, ${input.originCountry}`
      : 'No origin specified (start from first destination)';

    const currency = input.currency || 'USD';

    const result = await ai.generate({
      prompt: `You are a travel logistics expert. Generate transport recommendations for traveling between these destinations.

${originText}

Destinations (in order):
${destinationList}

Travel Details:
- Budget Level: ${input.budget || 'midrange'}
- Travel Group: ${input.travelGroup || 'not specified'}
- Currency: ${currency}

For each leg of the journey (including from origin to first destination if origin is provided, and returning home at the end), provide:

1. Multiple transport options (flights, trains, buses, ferries, car rental as appropriate)
2. For each option include:
   - type: The transport type (flight, train, bus, ferry, car_rental)
   - provider: Real airlines, train companies, or services that operate this route
   - duration: Realistic travel time
   - estimatedCost: Cost range in ${currency} (e.g., "500-1000 ${currency}", "2000-4000 ${currency}")
   - frequency: How often this service runs
   - tips: Booking tips (best time to book, which class to choose, etc.)
   - bookingUrl: Leave this empty, we will generate the URLs

3. A recommendation for which option is best based on budget and convenience

Important:
- Only suggest transport options that actually exist for these routes
- Be realistic about travel times and costs in ${currency}
- Consider the budget level when making recommendations
- For families, prioritize comfort and convenience
- Include both budget and premium options where available
- For routes where flying is the only practical option, mention that
- For nearby cities, suggest ground transport options
- All prices must be in ${currency}

Return a JSON object with:
- legs: Array of route legs with transport options
- summary: A 2-3 sentence overview of the recommended travel plan
- totalEstimatedCost: The total estimated cost range for all transport in ${currency}
- tips: Array of 3-5 general tips for this journey`,
      output: { schema: GenerateTravelPlanOutputSchema },
    });

    return {
      legs: result.output!.legs,
      summary: result.output!.summary,
      totalEstimatedCost: result.output!.totalEstimatedCost,
      tips: result.output!.tips,
    };
  }
);
