import { WizardItineraryItem } from './index';

export interface DragEndResult {
  itemId: string;
  sourceDate: string;
  targetDate: string;
  sourceIndex: number;
  targetIndex: number;
}

export interface DroppableContainerData {
  date: string;
  items: WizardItineraryItem[];
}

export interface ReorderUpdate {
  id: string;
  order: number;
  timeFrom: string;
  timeTo: string;
  dateFrom?: string;
  dateTo?: string;
}
