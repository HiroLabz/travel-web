'use server';
/**
 * @fileOverview Analyzes receipt images to extract expense information.
 *
 * - analyzeReceipt - A function that analyzes a receipt image and extracts expense data.
 * - AnalyzeReceiptInput - The input type for the analyzeReceipt function.
 * - AnalyzeReceiptOutput - The return type for the analyzeReceipt function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeReceiptInputSchema = z.object({
  imageBase64: z.string().describe('Base64-encoded receipt image'),
  mimeType: z.string().describe('MIME type of the image (e.g., image/jpeg, image/png)'),
  tripCurrency: z.string().optional().describe('Expected currency for the trip'),
  availableCategories: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).describe('Available expense categories to map items to'),
});
export type AnalyzeReceiptInput = z.infer<typeof AnalyzeReceiptInputSchema>;

const ReceiptLineItemSchema = z.object({
  description: z.string().describe('Item description from receipt'),
  amount: z.number().describe('Item amount'),
  quantity: z.number().optional().describe('Quantity if shown'),
  suggestedCategoryId: z.string().describe('Best matching category ID from available categories'),
});

const AnalyzeReceiptOutputSchema = z.object({
  vendor: z.string().describe('Store/restaurant/vendor name'),
  date: z.string().describe('Receipt date in YYYY-MM-DD format'),
  totalAmount: z.number().describe('Total amount on receipt'),
  currency: z.string().describe('Currency code (USD, EUR, PHP, etc.)'),
  lineItems: z.array(ReceiptLineItemSchema).describe('Individual items on receipt'),
  suggestedCategoryId: z.string().describe('Best overall category for this expense'),
  confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level of extraction'),
});
export type AnalyzeReceiptOutput = z.infer<typeof AnalyzeReceiptOutputSchema>;

export async function analyzeReceipt(input: AnalyzeReceiptInput): Promise<AnalyzeReceiptOutput> {
  return analyzeReceiptFlow(input);
}

const analyzeReceiptFlow = ai.defineFlow(
  {
    name: 'analyzeReceiptFlow',
    inputSchema: AnalyzeReceiptInputSchema,
    outputSchema: AnalyzeReceiptOutputSchema,
  },
  async (input) => {
    try {
      const categoryList = input.availableCategories
        .map(c => `- ${c.id}: ${c.name}`)
        .join('\n');

      const result = await ai.generate({
        prompt: [
          {
            media: {
              contentType: input.mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
              url: `data:${input.mimeType};base64,${input.imageBase64}`,
            },
          },
          {
            text: `You are an expert receipt analyzer for a travel expense tracking app. Analyze this receipt image and extract all expense information.

Available expense categories to map to:
${categoryList}

${input.tripCurrency ? `Expected trip currency: ${input.tripCurrency}` : ''}

Your task is to:
1. Extract the vendor/store/restaurant name
2. Extract the receipt date (format as YYYY-MM-DD)
3. Extract the total amount paid
4. Detect the currency from the receipt (look for symbols like $, €, ₱, ¥, or currency codes)
5. Extract individual line items with their amounts
6. Map each item and the overall expense to the most appropriate category

Guidelines for category mapping:
- Food & Dining: Restaurants, cafes, food courts, groceries for meals
- Local Transport: Taxis, rideshare, parking, fuel, tolls
- Shopping: Souvenirs, clothing, electronics, general purchases
- Activities: Tours, attractions, museums, entertainment tickets
- Accommodation: Hotels, hostels, room service charges
- Flights: Airline purchases, airport fees
- Other: Anything that doesn't fit above categories

Confidence levels:
- "high": Image is clear, all text is readable, amounts are unambiguous
- "medium": Some text is partially readable, but main details are visible
- "low": Image is blurry, partially visible, or in a language hard to parse

Return your response as a valid JSON object with this exact structure:
{
  "vendor": "Store/restaurant name",
  "date": "YYYY-MM-DD",
  "totalAmount": 123.45,
  "currency": "USD",
  "lineItems": [
    {
      "description": "Item name",
      "amount": 10.50,
      "quantity": 1,
      "suggestedCategoryId": "category_id"
    }
  ],
  "suggestedCategoryId": "overall_category_id",
  "confidence": "high|medium|low"
}

If you cannot read the date, use today's date. If you cannot read amounts clearly, estimate based on what's visible and set confidence to "low".`,
          },
        ],
        output: { schema: AnalyzeReceiptOutputSchema },
      });

      return result.output!;
    } catch (error) {
      console.error('Error analyzing receipt:', error);
      // Return a fallback response
      return {
        vendor: 'Unknown',
        date: new Date().toISOString().split('T')[0],
        totalAmount: 0,
        currency: input.tripCurrency || 'USD',
        lineItems: [],
        suggestedCategoryId: 'other',
        confidence: 'low' as const,
      };
    }
  }
);
