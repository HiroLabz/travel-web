'use server';
/**
 * @fileOverview Generates country-specific travel information including immigration,
 * customs, cultural norms, and practical tips for international travelers.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateCountryInfoInputSchema = z.object({
  country: z.string().describe('The destination country name.'),
  originCountry: z.string().optional().describe('The traveler\'s country of origin for visa requirements.'),
});
export type GenerateCountryInfoInput = z.infer<typeof GenerateCountryInfoInputSchema>;

const CountryInfoSectionSchema = z.object({
  title: z.string(),
  items: z.array(z.string()),
});

const GenerateCountryInfoOutputSchema = z.object({
  countryName: z.string().describe('The country name'),
  summary: z.string().describe('A brief 1-2 sentence overview of the country for travelers'),
  immigration: z.object({
    visaInfo: z.string().describe('General visa requirements information'),
    entryRequirements: z.array(z.string()).describe('List of entry requirements'),
    stayDuration: z.string().describe('Typical allowed stay duration for tourists'),
  }),
  customs: z.object({
    prohibited: z.array(z.string()).describe('Items prohibited from bringing into the country'),
    restricted: z.array(z.string()).describe('Items with restrictions or limits'),
    dutyFree: z.string().describe('Duty-free allowances summary'),
  }),
  cultural: z.object({
    greetings: z.string().describe('Common greeting customs'),
    dressCode: z.string().describe('Dress code expectations'),
    doAndDont: z.array(z.object({
      type: z.enum(['do', 'dont']),
      text: z.string(),
    })).describe('Cultural dos and don\'ts'),
    tipping: z.string().describe('Tipping customs'),
  }),
  practical: z.object({
    currency: z.string().describe('Local currency and payment tips'),
    language: z.string().describe('Official language and English prevalence'),
    emergency: z.string().describe('Emergency numbers'),
    electricity: z.string().describe('Plug type and voltage'),
    timezone: z.string().describe('Timezone information'),
  }),
  health: z.object({
    vaccinations: z.string().describe('Recommended vaccinations'),
    waterSafety: z.string().describe('Tap water safety'),
    healthTips: z.array(z.string()).describe('General health tips'),
  }),
});
export type GenerateCountryInfoOutput = z.infer<typeof GenerateCountryInfoOutputSchema>;

export async function generateCountryInfo(input: GenerateCountryInfoInput): Promise<GenerateCountryInfoOutput> {
  return generateCountryInfoFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCountryInfoPrompt',
  input: { schema: GenerateCountryInfoInputSchema },
  output: { schema: GenerateCountryInfoOutputSchema },
  prompt: `You are a travel information expert. Generate comprehensive but concise travel information for visiting {{{country}}}{{#if originCountry}} for travelers from {{{originCountry}}}{{/if}}.

Provide practical, up-to-date information that international travelers need to know. Keep each point brief but informative - travelers should be able to quickly scan and understand the key points.

Focus on:
1. Immigration & Entry: Visa requirements, entry documents, typical stay duration
2. Customs: What's prohibited, restricted items, duty-free limits
3. Cultural Norms: Greetings, dress codes, important dos and don'ts, tipping customs
4. Practical Info: Currency, language, emergency numbers, electricity, timezone
5. Health: Vaccinations, water safety, health tips

Be specific and actionable. Avoid generic advice that applies to all countries.

Return the information in the specified JSON format.`,
});

const generateCountryInfoFlow = ai.defineFlow(
  {
    name: 'generateCountryInfoFlow',
    inputSchema: GenerateCountryInfoInputSchema,
    outputSchema: GenerateCountryInfoOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
