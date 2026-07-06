'use server';
/**
 * @fileOverview Analyzes travel PDFs to extract locations, activities, and travel information.
 *
 * - analyzeTravelPdf - A function that analyzes a travel PDF and extracts activities.
 * - AnalyzeTravelPdfInput - The input type for the analyzeTravelPdf function.
 * - AnalyzeTravelPdfOutput - The return type for the analyzeTravelPdf function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeTravelPdfInputSchema = z.object({
  pdfUrl: z.string().describe('The URL of the PDF to analyze from Firebase Storage'),
  tripStartDate: z.string().optional().describe('The trip start date (YYYY-MM-DD) to use as fallback for dates'),
  tripEndDate: z.string().optional().describe('The trip end date (YYYY-MM-DD) to use as fallback for dates'),
});
export type AnalyzeTravelPdfInput = z.infer<typeof AnalyzeTravelPdfInputSchema>;

const PassengerSchema = z.object({
  name: z.string().describe('Full name of the passenger as shown on boarding pass/ticket'),
  seatNumber: z.string().optional().describe('Seat number (e.g., "12A", "23F")'),
  ticketNumber: z.string().optional().describe('E-ticket or ticket number'),
  class: z.string().optional().describe('Travel class: Economy, Business, First, Premium Economy'),
});

const ExtractedActivitySchema = z.object({
  placeName: z.string().describe('The name of the place/journey. For transport: include route like "Flight: Manila (MNL) → Singapore (SIN)" or "Bus: Cubao → Baguio"'),
  address: z.string().describe('The full address. For transport: arrival location/airport address. Use "N/A" if not available'),
  dateFrom: z.string().describe('Start/departure date in YYYY-MM-DD format'),
  dateTo: z.string().describe('End/arrival date in YYYY-MM-DD format (same as dateFrom for same-day journeys)'),
  timeFrom: z.string().describe('Departure/start time in HH:MM format (24-hour). Use "00:00" if not specified'),
  timeTo: z.string().describe('Arrival/end time in HH:MM format (24-hour). Use "00:00" if not specified'),
  description: z.string().describe('Additional notes, special instructions, or baggage info'),
  // Enhanced travel information fields
  travelType: z.enum(['air', 'land', 'sea', 'accommodation', 'activity']).describe('Type of travel/activity: air (flights), land (bus, train, car), sea (ferry, cruise), accommodation (hotel, bnb), activity (tours, restaurants, etc.)'),
  operatorName: z.string().describe('Name of the operator: airline name, bus/train company, ferry operator, hotel/property name. Use "N/A" if not found'),
  operatorContact: z.string().optional().describe('Contact number/phone of the airline, operator, hotel, or host. Look for customer service numbers, reservation hotlines, or property contact details'),
  terminalInfo: z.string().describe('DEPARTURE terminal/station info (e.g., "NAIA Terminal 3", "Cubao Bus Terminal"). Use "N/A" if not found'),
  arrivalInfo: z.string().optional().describe('ARRIVAL terminal/station/airport info (e.g., "Changi Airport Terminal 2", "Victory Liner Baguio Terminal")'),
  confirmationNumber: z.string().describe('Booking reference, confirmation code, PNR, or reservation number. Use "N/A" if not found'),
  checkInInstructions: z.string().optional().describe('For accommodations: check-in/check-out instructions, key pickup details, host notes, or special instructions'),
  flightNumber: z.string().optional().describe('Flight number for air travel (e.g., "PR 123", "SQ 456")'),
  googleMapsQuery: z.string().optional().describe('A search query for the DEPARTURE location on Google Maps'),
  arrivalGoogleMapsQuery: z.string().optional().describe('A search query for the ARRIVAL location on Google Maps'),
  // Passenger information
  passengers: z.array(PassengerSchema).optional().describe('List of ALL passengers from the document with their seat numbers'),
  gateNumber: z.string().optional().describe('Gate number for boarding (e.g., "Gate 15", "G15")'),
  boardingTime: z.string().optional().describe('Boarding time in HH:MM format (usually 30-45 min before departure)'),
});

const AnalyzeTravelPdfOutputSchema = z.object({
  activities: z.array(ExtractedActivitySchema).describe('List of extracted travel activities'),
  summary: z.string().describe('A brief summary of what was found in the document'),
  documentType: z.string().describe('The type of document (e.g., "flight booking", "hotel reservation", "tour itinerary", "restaurant reservation")'),
});
export type AnalyzeTravelPdfOutput = z.infer<typeof AnalyzeTravelPdfOutputSchema>;

export async function analyzeTravelPdf(input: AnalyzeTravelPdfInput): Promise<AnalyzeTravelPdfOutput> {
  return analyzeTravelPdfFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeTravelPdfPrompt',
  input: { schema: AnalyzeTravelPdfInputSchema },
  output: { schema: AnalyzeTravelPdfOutputSchema },
  prompt: `You are an expert travel document analyzer. Analyze the provided travel document (PDF) and extract all relevant travel activities, locations, and scheduling information.

Document URL: {{{pdfUrl}}}
{{#if tripStartDate}}Trip Start Date: {{{tripStartDate}}}{{/if}}
{{#if tripEndDate}}Trip End Date: {{{tripEndDate}}}{{/if}}

Your task is to:
1. Identify the type of travel document (flight booking, hotel reservation, tour itinerary, restaurant reservation, etc.)
2. Extract ALL activities, locations, and events mentioned in the document
3. For each activity, extract comprehensive details including contact information and location data

IMPORTANT - Extract these fields for EVERY activity:
- travelType: Categorize as "air" (flights), "land" (bus/train/car), "sea" (ferry/cruise), "accommodation" (hotel/bnb/resort), or "activity" (tours/restaurants/attractions)
- operatorName: The airline, bus company, hotel name, or service provider
- operatorContact: ANY phone numbers found for the operator, hotel, or host (customer service, reservations, property contact)
- terminalInfo: For transport - airport name AND terminal (e.g., "Ninoy Aquino International Airport Terminal 3"), bus/train station, or port
- confirmationNumber: Booking reference, PNR, confirmation code
- flightNumber: For flights, extract the flight number (e.g., "PR 507", "SQ 123")
- checkInInstructions: For hotels - check-in time, check-out time, special instructions, key pickup details
- googleMapsQuery: Create a search query to find this location on Google Maps

Guidelines:
- For flight bookings: Create separate activities for departure AND arrival, include airline contact, terminal info
- For hotel/BnB reservations: Extract host/hotel contact number, full address, check-in instructions
- For bus/train/ferry tickets: Include station/terminal name, operator contact, departure point
- ALWAYS try to find contact numbers - look for "Contact", "Tel", "Phone", "Hotline", "Customer Service"
- Use the trip dates as fallback if specific dates are not found

Return a structured JSON response with all extracted activities, a brief summary, and the document type.`,
});

const analyzeTravelPdfFlow = ai.defineFlow(
  {
    name: 'analyzeTravelPdfFlow',
    inputSchema: AnalyzeTravelPdfInputSchema,
    outputSchema: AnalyzeTravelPdfOutputSchema,
  },
  async (input) => {
    try {
      // Fetch the PDF from Firebase Storage URL
      const response = await fetch(input.pdfUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      }

      const pdfBuffer = await response.arrayBuffer();
      const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

      // Use Gemini's multimodal capability to analyze the PDF
      const result = await ai.generate({
        prompt: [
          {
            media: {
              contentType: 'application/pdf',
              url: `data:application/pdf;base64,${pdfBase64}`,
            },
          },
          {
            text: `You are an expert travel document analyzer. Analyze this travel document (PDF) and extract all relevant travel activities, locations, and scheduling information.

${input.tripStartDate ? `Trip Start Date: ${input.tripStartDate}` : ''}
${input.tripEndDate ? `Trip End Date: ${input.tripEndDate}` : ''}

Your task is to:
1. Identify the type of travel document (flight booking, hotel reservation, tour itinerary, etc.)
2. Extract UNIQUE activities, locations, and events mentioned in the document
3. For each activity, extract comprehensive details including contact information and location data

CRITICAL - DEDUPLICATION RULES:
- If a PDF has MULTIPLE PAGES with the same flight/booking for DIFFERENT PASSENGERS, create ONLY ONE activity entry
- Boarding passes often have separate pages per passenger - these are the SAME flight, create ONE entry
- Hotel bookings with multiple guests should be ONE entry
- Look for the same: flight number, date, time, route - if these match across pages, it's ONE activity
- In the description, you can mention "Multiple passengers" or list passenger names if relevant

IMPORTANT - Extract these fields for EVERY activity (use "N/A" if not found, never leave empty):
- travelType: REQUIRED - Categorize as "air" (flights), "land" (bus/train/car), "sea" (ferry/cruise), "accommodation" (hotel/bnb/resort), or "activity" (tours/restaurants/attractions)
- operatorName: The airline name, bus company, hotel name, or service provider. Use "N/A" if not found
- operatorContact: ANY phone numbers found for the operator, hotel, or host (look for "Contact", "Tel", "Phone", "Hotline", "Customer Service", "Reservations")
- terminalInfo: For transport - airport name AND terminal (e.g., "NAIA Terminal 3"), bus/train station, or port. Use "N/A" if not found
- confirmationNumber: Booking reference, PNR, confirmation code. Use "N/A" if not found
- flightNumber: For flights, extract the flight number (e.g., "PR 507")
- checkInInstructions: For hotels - check-in time, check-out time, key pickup details, host instructions
- googleMapsQuery: Create a search query to find this exact location on Google Maps

FOR BOARDING PASSES - Extract ALL passenger details:
- passengers: Array of ALL passengers with their name, seatNumber, ticketNumber, class (Economy/Business/First)
- gateNumber: Gate number for boarding (e.g., "Gate 15")
- boardingTime: When boarding starts (different from departure time)

Guidelines:
- For flight bookings: Create ONE activity per flight that includes BOTH departure and arrival info in the same entry
- For round-trip flights: Create TWO activities (outbound flight + return flight) - each with departure and arrival info
- The placeName should include both airports (e.g., "Flight: Manila (MNL) → Singapore (SIN)")
- The terminalInfo should include departure terminal, and address should include arrival airport info
- The description should include departure time, arrival time, and both locations
- For bus/train/ferry tickets: ONE entry per journey with departure and arrival stations
- For hotel/BnB reservations: ONE entry per property, even with multiple guests
- ALWAYS try to extract contact numbers from the document
- Use the trip dates as fallback if specific dates are not found

Return your response as a valid JSON object with this exact structure:
{
  "activities": [
    {
      "placeName": "string (for transport: 'Flight: MNL → SIN' or 'Bus: Cubao → Baguio')",
      "address": "string or 'N/A' (arrival location address)",
      "dateFrom": "YYYY-MM-DD (departure date)",
      "dateTo": "YYYY-MM-DD (arrival date)",
      "timeFrom": "HH:MM (departure time, use 00:00 if unknown)",
      "timeTo": "HH:MM (arrival time, use 00:00 if unknown)",
      "description": "string (additional notes, baggage info)",
      "travelType": "air|land|sea|accommodation|activity",
      "operatorName": "string or 'N/A' (airline/bus company/hotel name)",
      "operatorContact": "string or null (phone number)",
      "terminalInfo": "string or 'N/A' (DEPARTURE terminal/station)",
      "arrivalInfo": "string or null (ARRIVAL terminal/station/airport)",
      "confirmationNumber": "string or 'N/A' (PNR/booking ref)",
      "flightNumber": "string or null",
      "checkInInstructions": "string or null (for hotels)",
      "googleMapsQuery": "string (departure location search)",
      "arrivalGoogleMapsQuery": "string or null (arrival location search)",
      "passengers": [
        {
          "name": "PASSENGER NAME",
          "seatNumber": "12A",
          "ticketNumber": "ticket number or null",
          "class": "Economy|Business|First or null"
        }
      ],
      "gateNumber": "Gate 15 or null",
      "boardingTime": "HH:MM or null"
    }
  ],
  "summary": "Brief summary of the document contents",
  "documentType": "Type of document (e.g., boarding pass, flight booking, hotel reservation)"
}`,
          },
        ],
        output: { schema: AnalyzeTravelPdfOutputSchema },
      });

      return result.output!;
    } catch (error) {
      console.error('Error analyzing PDF:', error);
      // Return a fallback response with empty activities
      return {
        activities: [],
        summary: 'Failed to analyze the document. Please try again or check if the PDF is accessible.',
        documentType: 'unknown',
      };
    }
  }
);
