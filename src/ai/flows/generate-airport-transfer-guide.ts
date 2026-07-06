'use server';
/**
 * @fileOverview Generates detailed airport-to-accommodation transfer guide.
 *
 * - generateAirportTransferGuide - A function that generates transfer options.
 * - GenerateAirportTransferGuideInput - The input type for the function.
 * - GenerateAirportTransferGuideOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateAirportTransferGuideInputSchema = z.object({
  arrivalCity: z.string().describe('The city where the airport is located'),
  arrivalCountry: z.string().optional().describe('The country of arrival'),
  accommodationAddress: z.string().describe('The address of the accommodation'),
  travelGroup: z.string().describe('Travel group: solo, couple, family, friends, business'),
  budget: z.string().describe('Budget level: budget, midrange, luxury, ultra'),
  currency: z.string().optional().describe('Preferred currency for pricing (e.g., USD, EUR, JPY)'),
});
export type GenerateAirportTransferGuideInput = z.infer<typeof GenerateAirportTransferGuideInputSchema>;

const AirportTransferOptionSchema = z.object({
  id: z.string().describe('Unique identifier'),
  type: z.string().describe('Transport type: taxi, shuttle, train, bus, metro, car_rental'),
  name: z.string().describe('Name of the service/option'),
  description: z.string().describe('Detailed step-by-step instructions on how to use this option'),
  estimatedCost: z.string().describe('Cost range in local currency'),
  estimatedDuration: z.string().describe('Travel time including traffic considerations'),
  availability: z.string().describe('When this option is available (24/7, specific hours, etc.)'),
  bookingInfo: z.string().describe('How to book or access (apps, websites, counters, on-spot)'),
  tips: z.array(z.string()).describe('Practical tips (3-5 tips per option)'),
  bestFor: z.string().describe('Which travelers this is best suited for'),
  difficulty: z.enum(['easy', 'moderate', 'advanced']).describe('Difficulty level for travelers'),
});

const GenerateAirportTransferGuideOutputSchema = z.object({
  airportName: z.string().describe('Full name of the airport'),
  airportCode: z.string().describe('3-letter IATA airport code'),
  transferOptions: z.array(AirportTransferOptionSchema).describe('All viable transfer options'),
  recommendedOption: z.string().describe('Which option is recommended for this specific travel group and budget'),
  generalTips: z.array(z.string()).describe('General tips for airport arrival (5-7 tips)'),
  importantNotes: z.array(z.string()).describe('Safety warnings, scams to avoid, critical information (3-5 notes)'),
});
export type GenerateAirportTransferGuideOutput = z.infer<typeof GenerateAirportTransferGuideOutputSchema>;

export async function generateAirportTransferGuide(
  input: GenerateAirportTransferGuideInput
): Promise<GenerateAirportTransferGuideOutput> {
  return generateAirportTransferGuideFlow(input);
}

const generateAirportTransferGuideFlow = ai.defineFlow(
  {
    name: 'generateAirportTransferGuideFlow',
    inputSchema: GenerateAirportTransferGuideInputSchema,
    outputSchema: GenerateAirportTransferGuideOutputSchema,
  },
  async (input) => {
    const currencyStr = input.currency || 'local currency';

    const result = await ai.generate({
      prompt: `You are an airport transfer expert. Generate a comprehensive, step-by-step guide for getting from the airport in ${input.arrivalCity}${input.arrivalCountry ? `, ${input.arrivalCountry}` : ''} to this accommodation:

Accommodation Address: ${input.accommodationAddress}

Traveler Profile:
- Travel Group: ${input.travelGroup}
- Budget: ${input.budget}
- Currency for Pricing: ${currencyStr}

Generate a COMPLETE airport transfer guide with ALL viable transport options.

For the airport, identify:
1. airportName: The full official name of the main international airport
2. airportCode: The 3-letter IATA code (e.g., NRT, JFK, CDG)

For EACH viable transfer option (taxi, shuttle, train, metro, bus, car rental), provide:

1. id: Unique identifier (format: transfer_type_number)
2. type: One of: taxi, shuttle, train, bus, metro, car_rental
3. name: The specific service name (e.g., "Airport Limousine Bus", "Narita Express Train", "Official Yellow Cabs")
4. description: Detailed STEP-BY-STEP instructions:
   - Where to find it at the airport (which terminal, floor, exit)
   - How to purchase tickets or book
   - Where to board
   - Route/line information
   - Where to get off
   - How to reach the final address from the drop-off point
5. estimatedCost: Price range in ${currencyStr} (e.g., "$50-70", "¥3,000-4,000")
6. estimatedDuration: Realistic travel time considering traffic (e.g., "45-60 minutes", "1-1.5 hours in rush hour")
7. availability: When available (e.g., "24/7", "5 AM - midnight", "Every 15 minutes 6 AM-10 PM")
8. bookingInfo: Where to book (apps like Uber/Grab, websites, ticket machines, counters, on-spot only)
9. tips: 3-5 practical tips:
   - How to pay (cash, card, IC card, app)
   - Rush hour considerations
   - Luggage handling
   - Where to wait/queue
   - Best practices
10. bestFor: Which travelers (e.g., "Best for families with luggage", "Budget solo travelers", "Business travelers prioritizing speed")
11. difficulty: easy, moderate, or advanced

Then provide:
- recommendedOption: Based on the ${input.travelGroup} and ${input.budget} budget, which single option do you recommend and WHY?
- generalTips: 5-7 general tips for arriving at this airport (customs, SIM cards, currency exchange, where to meet drivers, etc.)
- importantNotes: 3-5 CRITICAL safety warnings or scam alerts specific to this airport/city:
  - Common taxi scams
  - Unlicensed touts to avoid
  - Areas to be cautious
  - Emergency contacts
  - Critical do's and don'ts

Be EXTREMELY specific and practical. This guide should enable a first-time visitor to confidently navigate from the airport to their accommodation.

Return a JSON object with all fields properly populated.`,
      output: { schema: GenerateAirportTransferGuideOutputSchema },
    });

    return {
      airportName: result.output!.airportName,
      airportCode: result.output!.airportCode,
      transferOptions: result.output!.transferOptions,
      recommendedOption: result.output!.recommendedOption,
      generalTips: result.output!.generalTips,
      importantNotes: result.output!.importantNotes,
    };
  }
);
