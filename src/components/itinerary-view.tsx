import type { ItineraryDay } from '@/types';
import { Card, CardContent } from '@/components/ui/card';

export function ItineraryView({ itinerary }: { itinerary: ItineraryDay[] }) {
  if (!itinerary || itinerary.length === 0) {
    return (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
            <p className="text-slate-500 font-medium mb-2">No itinerary generated yet.</p>
        </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {itinerary.map((day) => (
            <div key={day.day} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden h-full">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                    <span className="font-bold text-slate-700">Day {day.day}</span>
                    <span className="text-xs font-medium text-primary px-2 py-0.5 bg-primary/10 rounded-full border border-primary/20 truncate max-w-[150px]">
                        {day.title}
                    </span>
                </div>
                <div className="p-4 space-y-4">
                    {day.activities.map((act, i) => (
                        <div key={i} className="flex gap-4">
                            <div className="w-16 flex-shrink-0 text-xs font-semibold text-slate-400 pt-1 text-right">
                                {act.estimated_cost}$
                            </div>
                            <div className="flex-1 pb-2 border-l border-slate-100 pl-4 relative">
                                <span className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary/40 ring-4 ring-white"></span>
                                <p className="text-sm font-medium text-slate-800">{act.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ))}
    </div>
  );
}
