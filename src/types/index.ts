import type { Timestamp } from 'firebase/firestore';

export enum TripVibe {
  FAMILY = 'Family Friendly',
  ADVENTURE = 'Adventure',
  RELAXATION = 'Relaxation',
  ROMANTIC = 'Romantic',
  CULTURAL = 'Cultural',
  FOODIE = 'Foodie',
  BUDGET = 'Budget',
  LUXURY = 'Luxury'
}

export interface HistoricalMember {
  uid?: string;
  email?: string;
  name: string;
  photoURL?: string | null;
  lastSeenInHouseholdId: string;
  addedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;

  // Multi-household support
  householdIds?: string[];              // Array of household IDs
  defaultHouseholdId?: string | null;   // Last active household
  householdId?: string | null;          // Legacy field for migration

  // Member suggestions
  historicalMembers?: HistoricalMember[];

  // Account creation by household owner
  requirePasswordChange?: boolean;      // Force password change on first login
  createdByHouseholdOwner?: string;     // UID of owner who created this account

  // Subscription info
  subscription?: SubscriptionInfo;

  // Stripe integration
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeSubscriptionStatus?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid' | 'paused';

  // Onboarding flow
  onboardingStep?: 'plan' | 'group' | 'completed';
}

// Subscription Plan Types
export type SubscriptionPlan = 'starter' | 'wanderer';

export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  planStartDate: string;      // ISO date - when plan was assigned/started
  creditsUsed: number;        // Credits used in current billing period
  creditResetDate: string;    // ISO date - when credits reset next (30 days from planStartDate)
  updatedAt?: string;         // ISO date - last update timestamp
  trialEnd?: string;          // ISO date - when trial ends (if in trial)
}

export const PLAN_LIMITS = {
  starter: { maxHouseholds: 1, monthlyCredits: 50 },
  wanderer: { maxHouseholds: Infinity, monthlyCredits: 1000 },
} as const;

export type AIFeature =
  | 'trip_itinerary'
  | 'travel_plan'
  | 'pdf_analysis'
  | 'country_info'
  | 'receipt_analysis'
  | 'top_rated_places'
  | 'top_review_places'
  | 'airport_transfer'
  | 'commute_recommendations';

export const AI_CREDIT_COST: Record<AIFeature, number> = {
  trip_itinerary: 1,
  travel_plan: 1,
  pdf_analysis: 1,
  country_info: 1,
  receipt_analysis: 1,
  top_rated_places: 1,
  top_review_places: 1,
  airport_transfer: 1,
  commute_recommendations: 1,
};

export interface HouseholdBudgetCategory {
  id: string;
  name: string;
}

export type TimeFormat = '12h' | '24h';

export interface HouseholdMember {
  uid?: string;                  // Optional for manual entries
  email?: string | null;
  role: 'owner' | 'member' | 'child';
  name: string | null;
  photoURL?: string | null;
  isManualEntry?: boolean;        // true if no account needed
  addedAt?: string;
  addedBy?: string;              // uid of person who added
}

export interface Household {
  id: string;
  name: string;
  members: HouseholdMember[];
  memberIds: string[];
  currency?: string;
  countryOfOrigin?: string;
  cityOfOrigin?: string;
  budgetCategories?: HouseholdBudgetCategory[];
  timeFormat?: TimeFormat;
  createdAt?: Timestamp | string;
  createdBy?: string;
}

export type ItineraryActivity = {
  description: string;
  estimated_cost: number;
};

export type ItineraryDay = {
  day: number;
  title: string;
  activities: ItineraryActivity[];
};

export type TripType = 'local' | 'international';

export type Destination = {
  city: string;
  country: string;
  province?: string;
  startDate?: string;
  endDate?: string;
};

export const TRIP_TYPE_LABELS: Record<TripType, string> = {
  local: 'Local',
  international: 'International'
};

// Travel Plan Types (for route planning)
export interface TravelPlanOption {
  id: string;
  type: string;
  from: string;
  to: string;
  provider: string;
  duration: string;
  estimatedCost: string;
  frequency: string;
  tips?: string;
}

export interface TravelPlanLeg {
  from: string;
  to: string;
  options: TravelPlanOption[];
  recommendation: string;
}

export interface TravelPlan {
  legs: TravelPlanLeg[];
  summary: string;
  totalEstimatedCost: string;
  tips: string[];
  generatedAt: string;
  originCity: string;
  originCountry?: string;
}

export interface Trip {
  id: string;
  householdId: string;
  title: string;
  tripType: TripType;
  destination: string; // Primary destination for AI
  destinations: Destination[]; // Multi-destination support
  days: number;
  vibe: string;
  itinerary: ItineraryDay[];
  noteContent?: string;
  imageUrl?: string;
  imageHint?: string;
  startDate: string;
  endDate: string;
  documents?: TravelDocument[];
  itineraryDocUrl?: string;
  itineraryDocName?: string;
  itineraryDocType?: 'pdf' | 'docx';
  budgetItems?: BudgetItem[];
  budgetCurrency?: string;
  expenses?: Expense[];
  pinned?: boolean;
  archived?: boolean;
  travelPlan?: TravelPlan;
  exploreCache?: {
    topRatedPlaces?: {
      places: TopRatedPlace[];
      summary: string;
      generatedAt: string;
      cacheKey: string;
    };
    topReviewPlaces?: {
      places: TopReviewPlace[];
      summary: string;
      generatedAt: string;
      cacheKey: string;
    };
    airportTransfer?: {
      airportName: string;
      airportCode: string;
      transferOptions: AirportTransferOption[];
      recommendedOption: string;
      generalTips: string[];
      importantNotes: string[];
      generatedAt: string;
      cacheKey: string;
    };
  };
  commuteSettings?: CommuteSettings;
  // Trip-level notes and checklist
  tripNotes?: string; // Quick notes for the entire trip
  tripChecklist?: ChecklistItem[]; // Master checklist for packing/prep
  // Currency exchange settings
  exchangeRates?: ExchangeRateCache;
  destinationCurrencies?: DestinationCurrency[];
}

export interface TravelDocument {
  id: string;
  tripId: string;
  householdId: string;
  name: string;
  url: string;
  folder: string;
  uploadDate: Timestamp | string;
  uploader: {
    uid: string;
    name: string | null;
  };
  size: string;
  // Member assignment - which household member this document is assigned to
  assignedTo?: string; // 'all' or member uid/name identifier
  assignedToName?: string; // Display name for the assigned member
  // Activity linking
  linkedActivityId?: string; // ID of the wizard item this document is linked to
  linkedActivityAction?: 'created' | 'merged' | 'skipped'; // How this document related to the activity
}

export interface TripFolder {
  id: string;
  tripId: string;
  householdId: string;
  name: string;
  createdAt: Timestamp;
  createdBy: {
    uid: string;
    name: string | null;
  };
}

// Travel/Activity type for categorization
export type ActivityTravelType = 'air' | 'land' | 'sea' | 'accommodation' | 'activity';

export const ACTIVITY_TRAVEL_TYPE_LABELS: Record<ActivityTravelType, string> = {
  air: 'Air Travel',
  land: 'Land Travel',
  sea: 'Sea Travel',
  accommodation: 'Accommodation',
  activity: 'Activity'
};

export const ACTIVITY_TRAVEL_TYPE_ICONS: Record<ActivityTravelType, string> = {
  air: '✈️',
  land: '🚗',
  sea: '🚢',
  accommodation: '🏨',
  activity: '📍'
};

// Passenger information for boarding passes
export interface PassengerInfo {
  name: string;
  seatNumber?: string;
  ticketNumber?: string;
  class?: string; // Economy, Business, First
}

// Document reference for linking source documents to activities
export interface DocumentReference {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
}

// Checklist item for notes and to-do tracking
export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  order: number;
  createdAt: string;
}

export interface WizardItineraryItem {
  id: string;
  tripId: string;
  placeName: string;
  address: string;
  dateFrom: string;
  dateTo: string;
  timeFrom: string;
  timeTo: string;
  description: string;
  createdAt: Timestamp | string;
  order: number;
  estimatedCost?: number;
  currency?: string;
  contactNumber?: string;
  // New fields for enhanced travel info
  travelType?: ActivityTravelType;
  operatorName?: string; // Airline, bus company, ferry operator, hotel name
  operatorContact?: string; // Contact number for operator/hotel
  googleMapsUrl?: string; // Direct Google Maps link for departure/main location
  terminalInfo?: string; // DEPARTURE: Airport terminal, bus station, port, etc.
  arrivalInfo?: string; // ARRIVAL: Airport terminal, station, port, etc.
  arrivalGoogleMapsUrl?: string; // Direct Google Maps link for arrival location
  confirmationNumber?: string; // Booking/confirmation reference
  checkInInstructions?: string; // Hotel check-in instructions, special notes
  flightNumber?: string; // Flight number for air travel
  passengers?: PassengerInfo[]; // Passenger list with seat numbers
  gateNumber?: string; // Gate number for boarding
  boardingTime?: string; // Boarding time (different from departure)
  // Document linking fields
  sourceDocuments?: DocumentReference[]; // All documents linked to this activity
  documentMetadata?: {
    [documentId: string]: {
      documentName: string;
      documentUrl: string;
      documentType: string; // 'ticket', 'boarding_pass', 'confirmation', 'voucher'
      contributedFields: string[]; // Fields that this document contributed
      uploadedAt: string;
    };
  };
  // Merge tracking
  mergedAt?: string; // Last merge timestamp
  mergeCount?: number; // Number of documents merged into this activity
  // Notes and checklist
  quickNotes?: string; // Simple text notes separate from rich description
  checklist?: ChecklistItem[]; // Per-activity checklist items
}

// Budget Types
export interface BudgetItem {
  id: string;
  categoryId: string; // References HouseholdBudgetCategory.id
  amount: number;
  currency: string;
}

// Expense Split Types
export interface ExpenseSplit {
  memberId: string;             // Member uid or name identifier
  memberName: string;           // Display name
  amount: number;               // Amount this member owes
}

// Expense Types
export interface Expense {
  id: string;
  tripId: string;
  categoryId: string;           // References HouseholdBudgetCategory.id
  amount: number;               // Total expense amount
  currency: string;
  description: string;
  date: string;                 // YYYY-MM-DD
  assignedTo: string;           // 'all' or member uid/name identifier (for simple assignment)
  assignedToName: string;       // Display name for the assigned member
  createdAt: string;
  createdBy: {
    uid: string;
    name: string | null;
  };
  // Bill splitting
  splitType?: 'none' | 'equal' | 'custom';  // How the bill is split
  splits?: ExpenseSplit[];      // Individual splits when splitType is 'equal' or 'custom'
  // Receipt reference (stored in Firebase Storage)
  receiptUrl?: string;
  receiptName?: string;
  // AI extraction metadata
  aiExtracted?: boolean;
  // Currency conversion tracking
  originalCurrency?: string;      // Currency when expense was recorded
  originalAmount?: number;        // Amount in original currency
  convertedAmount?: number;       // Amount converted to home currency
  exchangeRateUsed?: number;      // Rate used for conversion
}

export interface ReceiptLineItem {
  description: string;
  amount: number;
  quantity?: number;
  suggestedCategoryId?: string;
}

export interface ReceiptAnalysisOutput {
  vendor: string;
  date: string;           // YYYY-MM-DD
  totalAmount: number;
  currency: string;
  lineItems: ReceiptLineItem[];
  suggestedCategoryId: string;
  confidence: 'high' | 'medium' | 'low';
}

// Default budget categories for new households
export const DEFAULT_BUDGET_CATEGORIES: HouseholdBudgetCategory[] = [
  { id: 'flights', name: 'Flights' },
  { id: 'accommodation', name: 'Accommodation' },
  { id: 'food', name: 'Food & Dining' },
  { id: 'activities', name: 'Activities' },
  { id: 'transport', name: 'Local Transport' },
  { id: 'shopping', name: 'Shopping' },
  { id: 'other', name: 'Other' }
];

// Color palette for budget categories (cycles through these)
export const BUDGET_CATEGORY_COLORS = [
  '#6366f1', // indigo
  '#0ea5e9', // sky
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#06b6d4', // cyan
  '#64748b', // slate
  '#ef4444', // red
  '#14b8a6', // teal
  '#f97316', // orange
];

// Travel Preferences Types
export type VacationType = 'beach' | 'city' | 'adventure' | 'cultural' | 'nature' | 'culinary';
export type TravelGroup = 'solo' | 'couple' | 'family' | 'friends' | 'business';
export type BudgetLevel = 'budget' | 'midrange' | 'luxury' | 'ultra';
export type TransportOption = 'flights' | 'train' | 'taxi' | 'car_rental' | 'buses' | 'walking' | 'bicycle';
export type DiningPreference = 'street_food' | 'casual' | 'fine_dining' | 'mix';
export type ExperienceType = 'museums' | 'landmarks' | 'historical' | 'nature' | 'adventure' | 'shopping' | 'nightlife' | 'food_tours' | 'art' | 'religious' | 'markets';

export interface TravelPreferences {
  vacationTypes: VacationType[];  // Changed to array for multi-select
  travelGroup: TravelGroup;
  budget: BudgetLevel;
  transport: TransportOption[];
  dining: DiningPreference;
  experiences: ExperienceType[];
}

export interface RecommendedPlace {
  id: string;
  name: string;
  address: string;
  description: string;
  category: ExperienceType;
  googleMapsUrl: string;
  imageSearchUrl: string;  // Google image search URL for the place
  estimatedDuration: string;
  priceLevel: string;
  tips?: string;
}

export interface TransportRecommendation {
  type: string;
  name: string;
  description: string;
  costInfo: string;
  availability: string;
  tips?: string;
  apps?: string[];
  bestFor: string;
}

export interface TransportRecommendations {
  transportOptions: TransportRecommendation[];
  generalTips: string;
  cardRecommendation?: string;
}

// Display labels for preferences
export const VACATION_TYPE_LABELS: Record<VacationType, string> = {
  beach: 'Beach & Relaxation',
  city: 'City Exploration',
  adventure: 'Adventure',
  cultural: 'Cultural Heritage',
  nature: 'Nature & Wildlife',
  culinary: 'Food & Culinary'
};

export const VACATION_TYPE_ICONS: Record<VacationType, string> = {
  beach: '🏖️',
  city: '🏙️',
  adventure: '🧗',
  cultural: '🏛️',
  nature: '🌲',
  culinary: '🍽️'
};

export const TRAVEL_GROUP_LABELS: Record<TravelGroup, string> = {
  solo: 'Solo',
  couple: 'Couple',
  family: 'Family',
  friends: 'Friends',
  business: 'Business'
};

export const BUDGET_LABELS: Record<BudgetLevel, string> = {
  budget: 'Budget ($)',
  midrange: 'Mid-range ($$)',
  luxury: 'Luxury ($$$)',
  ultra: 'Ultra-luxury ($$$$)'
};

export const TRANSPORT_LABELS: Record<TransportOption, string> = {
  flights: 'Flights',
  train: 'Train',
  taxi: 'Taxi/Rideshare',
  car_rental: 'Car Rental',
  buses: 'Buses',
  walking: 'Walking',
  bicycle: 'Bicycle'
};

export const TRANSPORT_ICONS: Record<TransportOption, string> = {
  flights: '✈️',
  train: '🚂',
  taxi: '🚕',
  car_rental: '🚗',
  buses: '🚌',
  walking: '🚶',
  bicycle: '🚲'
};

export const TRANSPORT_SUGGESTIONS: Record<TransportOption, string> = {
  flights: 'Best for long distances between cities',
  train: 'Scenic routes, comfortable for day trips',
  taxi: 'Convenient for short trips, airport transfers',
  car_rental: 'Freedom to explore at your own pace',
  buses: 'Budget-friendly, good for local routes',
  walking: 'Best way to explore city centers',
  bicycle: 'Eco-friendly, great for flat cities'
};

export const DINING_LABELS: Record<DiningPreference, string> = {
  street_food: 'Local Street Food',
  casual: 'Casual Dining',
  fine_dining: 'Fine Dining',
  mix: 'Mix of All'
};

export const EXPERIENCE_LABELS: Record<ExperienceType, string> = {
  museums: 'Museums',
  landmarks: 'Cultural Landmarks',
  historical: 'Historical Sites',
  nature: 'Nature/Parks',
  adventure: 'Adventure Activities',
  shopping: 'Shopping',
  nightlife: 'Nightlife',
  food_tours: 'Food Tours',
  art: 'Art Galleries',
  religious: 'Religious Sites',
  markets: 'Local Markets'
};

export const EXPERIENCE_ICONS: Record<ExperienceType, string> = {
  museums: '🏛️',
  landmarks: '🏯',
  historical: '🏰',
  nature: '🌳',
  adventure: '🎢',
  shopping: '🛍️',
  nightlife: '🌃',
  food_tours: '🍜',
  art: '🎨',
  religious: '⛩️',
  markets: '🏪'
};

// Explore Tab Types

export interface TopRatedPlace {
  id: string;
  name: string;
  address: string;
  description: string;
  category: string;
  estimatedDuration: string;
  priceLevel: string;
  rating: string; // e.g., "4.8/5"
  accolades?: string; // e.g., "UNESCO World Heritage Site"
  tips?: string;
  googleMapsUrl?: string;
  imageSearchUrl?: string;
}

export interface TopReviewPlace {
  id: string;
  name: string;
  address: string;
  description: string;
  category: string;
  estimatedDuration: string;
  priceLevel: string;
  reviewCount: string; // e.g., "15,000+ reviews"
  averageRating: string; // e.g., "4.5/5"
  tips?: string;
  googleMapsUrl?: string;
  imageSearchUrl?: string;
}

export interface AirportTransferOption {
  id: string;
  type: string; // "taxi", "shuttle", "train", "bus", "metro", "car_rental"
  name: string;
  description: string; // Step-by-step instructions
  estimatedCost: string;
  estimatedDuration: string;
  availability: string;
  bookingInfo: string;
  tips: string[];
  bestFor: string;
  difficulty: 'easy' | 'moderate' | 'advanced';
}

export interface AirportTransferGuide {
  airportName: string;
  airportCode: string;
  transferOptions: AirportTransferOption[];
  recommendedOption: string;
  generalTips: string[];
  importantNotes: string[];
}

// Commute Planner Types
export type CommuteTransportMode = 'walking' | 'driving' | 'cycling' | 'driving-traffic';

export const COMMUTE_TRANSPORT_MODE_LABELS: Record<CommuteTransportMode, string> = {
  walking: 'Walking',
  driving: 'Driving',
  cycling: 'Cycling',
  'driving-traffic': 'Driving (with traffic)'
};

export interface GeoLocation {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export interface CommuteRouteSegment {
  id: string;
  from: {
    itemId: string;
    name: string;
    location: GeoLocation;
  };
  to: {
    itemId: string;
    name: string;
    location: GeoLocation;
  };
  distance: {
    text: string;
    value: number; // meters
  };
  duration: {
    [key in CommuteTransportMode]?: {
      text: string;
      value: number; // seconds
    };
  };
  transitRecommendation?: CommuteRecommendationOutput;
}

export interface CommuteRoute {
  id: string;
  tripId: string;
  baseAccommodationId: string;
  selectedActivityIds: string[];
  segments: CommuteRouteSegment[];
  optimizedOrder?: string[];
  totalDistance: { text: string; value: number };
  generatedAt: string;
}

export interface CommuteSettings {
  tripId: string;
  defaultAccommodationId?: string;
  preferredTransportMode: CommuteTransportMode;
  lastUpdated: string;
}

// AI-generated transit recommendation
export interface CommuteRecommendationOutput {
  transitRecommendation: string;
  transitSteps: {
    mode: string;
    instruction: string;
    duration?: string;
  }[];
  alternativeOptions: string[];
  tips: string[];
  estimatedCost?: string;
  bestTimeToTravel?: string;
}

// Exchange Rate Types for Trip Settings
export interface ExchangeRateCache {
  baseCurrency: string;  // Home currency (e.g., "USD")
  rates: Record<string, { rate: number; fetchedAt: string }>;  // currency code -> rate info
  lastUpdated: string;  // ISO timestamp of last refresh
}

export interface DestinationCurrency {
  city: string;
  country: string;
  currency: string;  // Currency code (e.g., "EUR", "JPY")
}

// Route Planner Types
export interface RouteWaypoint {
  id: string;
  itemId: string;
  name: string;
  location: GeoLocation;
  order: number;
  scheduledTime?: {
    date: string;
    timeFrom: string;
    timeTo: string;
  };
}

export interface RouteSegmentWithMode {
  id: string;
  from: RouteWaypoint;
  to: RouteWaypoint;
  transportMode: CommuteTransportMode;
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  geometry?: { coordinates: [number, number][] };
}

export interface RoutePlan {
  id: string;
  tripId: string;
  originId: string;
  waypointIds: string[];
  segments: RouteSegmentWithMode[];
  totalDistance: { text: string; value: number };
  totalDuration: { text: string; value: number };
  sortOrder: 'manual' | 'nearest' | 'farthest';
  generatedAt: string;
}

export interface RouteTimeEdit {
  itemId: string;
  itemName: string;
  currentTime: { date: string; timeFrom: string; timeTo: string };
  newTime: { date: string; timeFrom: string; timeTo: string };
  suggestedTime?: { date: string; timeFrom: string; timeTo: string };
  isDirty: boolean;
}

// Day Route Planner Types
export type RoutePlannerPlaceCategory =
  | 'attraction'
  | 'restaurant'
  | 'cafe'
  | 'shopping'
  | 'museum'
  | 'park'
  | 'entertainment'
  | 'other';

export const ROUTE_PLANNER_CATEGORY_LABELS: Record<RoutePlannerPlaceCategory, string> = {
  attraction: 'Attraction',
  restaurant: 'Restaurant',
  cafe: 'Cafe',
  shopping: 'Shopping',
  museum: 'Museum',
  park: 'Park',
  entertainment: 'Entertainment',
  other: 'Other',
};

// Icon names from lucide-react for category display
export const ROUTE_PLANNER_CATEGORY_ICONS: Record<RoutePlannerPlaceCategory, string> = {
  attraction: 'Landmark',
  restaurant: 'UtensilsCrossed',
  cafe: 'Coffee',
  shopping: 'ShoppingBag',
  museum: 'Palette',
  park: 'TreePine',
  entertainment: 'Clapperboard',
  other: 'MapPin',
};

export interface RoutePlannerPlace {
  id: string;
  name: string;
  address: string;
  location?: GeoLocation;
  visitDuration: number; // minutes
  isExistingActivity: boolean;
  existingActivityId?: string;
  category?: RoutePlannerPlaceCategory;
  entranceFee?: number; // entrance fee amount
  currency?: string; // currency for entrance fee
  isMealStop?: boolean; // auto-added meal stop
  mealType?: 'lunch' | 'dinner'; // type of meal if it's a meal stop
}

export interface RoutePlannerResultItem {
  place: RoutePlannerPlace;
  orderNumber: number;
  distanceFromPrevious: { text: string; value: number };
  travelTimeFromPrevious: { text: string; value: number };
  estimatedArrival: string; // "HH:mm"
  estimatedDeparture: string; // "HH:mm"
  transportMode: CommuteTransportMode;
  isTimeEdited?: boolean; // whether user has manually edited the time
}

export interface RoutePlannerResults {
  id: string;
  tripId: string;
  originHotel: {
    id: string;
    name: string;
    address: string;
    location: GeoLocation;
  };
  items: RoutePlannerResultItem[];
  totalDistance: { text: string; value: number };
  totalTravelTime: { text: string; value: number };
  totalVisitTime: number; // minutes
  totalEntranceFees: number; // total entrance fees
  currency?: string; // currency for fees
  sortStrategy: 'nearest' | 'farthest' | 'manual';
  startTime: string; // "HH:mm"
  generatedAt: string;
}
