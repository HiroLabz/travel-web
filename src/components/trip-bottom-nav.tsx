'use client';

import {
  Home,
  Calendar,
  Folder,
  DollarSign,
  MapPin,
  MoreHorizontal,
  Route,
  Globe,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type Tab = 'dashboard' | 'itinerary' | 'documents' | 'expense' | 'commute' | 'explore' | 'information';

interface TripBottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  showInfoTab: boolean;
}

const PRIMARY_TABS = [
  { id: 'dashboard' as Tab, label: 'Home', icon: Home },
  { id: 'itinerary' as Tab, label: 'Itinerary', icon: Calendar },
  { id: 'documents' as Tab, label: 'Docs', icon: Folder },
  { id: 'expense' as Tab, label: 'Expense', icon: DollarSign },
  { id: 'commute' as Tab, label: 'Commute', icon: Route },
];

const MORE_TABS = [
  { id: 'explore' as Tab, label: 'Explore', icon: MapPin },
  { id: 'information' as Tab, label: 'Info', icon: Globe, internationalOnly: true },
];

export function TripBottomNav({ activeTab, onTabChange, showInfoTab }: TripBottomNavProps) {
  const isMoreActive = MORE_TABS.some(t => t.id === activeTab && (!t.internationalOnly || showInfoTab));

  const visibleMoreTabs = MORE_TABS.filter(t => !t.internationalOnly || showInfoTab);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {PRIMARY_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full px-1 transition-colors",
              activeTab === tab.id
                ? "text-blue-600 dark:text-blue-400"
                : "text-slate-500 dark:text-slate-400"
            )}
          >
            <tab.icon className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[10px] sm:text-xs mt-1 truncate">{tab.label}</span>
          </button>
        ))}

        {/* More Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full px-1 transition-colors",
                isMoreActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-500 dark:text-slate-400"
              )}
            >
              <MoreHorizontal className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-[10px] sm:text-xs mt-1">More</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="end"
            className="w-48 mb-2"
          >
            {visibleMoreTabs.map((tab) => (
              <DropdownMenuItem
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-3 cursor-pointer",
                  activeTab === tab.id && "bg-slate-100 dark:bg-slate-700"
                )}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
