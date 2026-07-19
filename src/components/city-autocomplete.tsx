'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/motion/input';
import { searchCitiesAction, type CitySearchResult } from '@/lib/actions';
import { MapPin, Loader2, Sparkles } from 'lucide-react';

interface CityAutocompleteProps {
  id?: string;
  placeholder?: string;
  value: string;
  country: string;
  onSelect: (city: string, country: string) => void;
  onChange: (value: string) => void;
}

export function CityAutocomplete({
  id,
  placeholder = 'Search city...',
  value,
  country,
  onSelect,
  onChange,
}: CityAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<CitySearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isComingSoon, setIsComingSoon] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
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

  const searchCities = async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setIsComingSoon(false);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    const response = await searchCitiesAction(searchQuery);
    setIsLoading(false);

    if (response.comingSoon) {
      setResults([]);
      setIsComingSoon(true);
      setIsOpen(true);
      setSelectedIndex(-1);
      return;
    }

    if (response.results) {
      setResults(response.results);
      setIsComingSoon(false);
      setIsOpen(response.results.length > 0);
      setSelectedIndex(-1);
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
      searchCities(newValue);
    }, 300);
  };

  const handleSelect = (result: CitySearchResult) => {
    setQuery(result.city);
    onSelect(result.city, result.country);
    setIsOpen(false);
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

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
            if (results.length > 0) setIsOpen(true);
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
                City search is coming soon
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Type the city name manually for now.
              </p>
            </div>
          </div>
        </div>
      )}

      {isOpen && !isComingSoon && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 max-h-60 overflow-auto">
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
                  {result.city}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {result.country}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
