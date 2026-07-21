'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/motion/input';
import { searchPlacesAction } from '@/lib/actions';
import { MapPin, Loader2, Plus, Sparkles } from 'lucide-react';
import type { GeoLocation } from '@/types';

interface PlaceSearchResult {
  id: string;
  name: string;
  address: string;
  location?: GeoLocation;
}

interface PlaceAutocompleteProps {
  id?: string;
  placeholder?: string;
  value: string;
  onSelect: (place: { name: string; address: string; location?: GeoLocation }) => void;
  onChange: (value: string) => void;
  proximity?: { lat: number; lng: number };
  allowManualEntry?: boolean;
}

export function PlaceAutocomplete({
  id,
  placeholder = 'Search for a place or enter an address...',
  value,
  onSelect,
  onChange,
  proximity,
  allowManualEntry = true,
}: PlaceAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [hasSearched, setHasSearched] = useState(false);
  const [isComingSoon, setIsComingSoon] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync query with external value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchPlaces = async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      setHasSearched(false);
      setIsComingSoon(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    const response = await searchPlacesAction(searchQuery, proximity);
    setIsLoading(false);

    if (response.comingSoon) {
      setResults([]);
      setIsComingSoon(true);
      setIsOpen(true);
      setSelectedIndex(-1);
      return;
    }

    setIsComingSoon(false);
    if (response.results) {
      setResults(response.results);
      // Show dropdown if we have results OR if manual entry is allowed
      setIsOpen(response.results.length > 0 || allowManualEntry);
      setSelectedIndex(-1);
    } else {
      setResults([]);
      setIsOpen(allowManualEntry);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    onChange(newValue);

    // Debounce the search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchPlaces(newValue);
    }, 300);
  };

  const handleSelect = (result: PlaceSearchResult) => {
    setQuery(result.name);
    onSelect({
      name: result.name,
      address: result.address,
      location: result.location,
    });
    setIsOpen(false);
    setResults([]);
    setHasSearched(false);
  };

  const handleUseManualEntry = () => {
    if (!query.trim()) return;

    // Use the query as both name and address
    onSelect({
      name: query.trim(),
      address: query.trim(),
      location: undefined, // Will be geocoded later when calculating route
    });
    setIsOpen(false);
    setResults([]);
    setHasSearched(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    const totalOptions = results.length + (allowManualEntry && query.trim() ? 1 : 0);
    if (totalOptions === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < totalOptions - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        } else if (selectedIndex === results.length && allowManualEntry && query.trim()) {
          handleUseManualEntry();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const showManualEntryOption = allowManualEntry && query.trim().length >= 3 && hasSearched && !isLoading;

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Input
          id={id}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0 || showManualEntryOption) setIsOpen(true);
          }}
          autoComplete="off"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          </div>
        )}
      </div>

      {isOpen && isComingSoon && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
          <div className="px-3 py-3 flex items-start gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-slate-800 dark:text-slate-200">
                Place search is coming soon
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {allowManualEntry
                  ? 'Enter the address manually below and press Enter.'
                  : 'Type the place name and we’ll use it as-is for now.'}
              </p>
            </div>
          </div>
          {showManualEntryOption && (
            <>
              <div className="border-t border-slate-200 dark:border-slate-700" />
              <button
                type="button"
                onClick={handleUseManualEntry}
                className="w-full px-3 py-2.5 text-left flex items-start gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
              >
                <Plus className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm text-emerald-700 dark:text-emerald-400">
                    Use &quot;{query.trim()}&quot;
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Add this address manually
                  </p>
                </div>
              </button>
            </>
          )}
        </div>
      )}

      {isOpen && !isComingSoon && (results.length > 0 || showManualEntryOption) && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 max-h-72 overflow-auto">
          {/* Search results */}
          {results.map((result, index) => (
            <button
              key={result.id}
              type="button"
              onClick={() => handleSelect(result)}
              className={`w-full px-3 py-2 text-left flex items-start gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                index === selectedIndex ? 'bg-slate-50 dark:bg-slate-700' : ''
              }`}
            >
              <MapPin className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">
                  {result.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {result.address}
                </p>
              </div>
            </button>
          ))}

          {/* Manual entry option */}
          {showManualEntryOption && (
            <>
              {results.length > 0 && (
                <div className="border-t border-slate-200 dark:border-slate-700" />
              )}
              <button
                type="button"
                onClick={handleUseManualEntry}
                className={`w-full px-3 py-2.5 text-left flex items-start gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors ${
                  selectedIndex === results.length ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
                }`}
              >
                <Plus className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm text-emerald-700 dark:text-emerald-400">
                    Use &quot;{query.trim()}&quot;
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Add this address manually
                  </p>
                </div>
              </button>
            </>
          )}

          {/* No results message */}
          {results.length === 0 && !showManualEntryOption && hasSearched && !isLoading && (
            <div className="px-3 py-4 text-center text-sm text-slate-500">
              No places found. Try a different search term.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
