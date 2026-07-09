import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NominatimResult {
  place_id: number;
  display_name: string;
  name: string;
  address: {
    city?: string;
    municipality?: string;
    city_district?: string;
    suburb?: string;
    state?: string;
    country?: string;
  };
  type: string;
  lat: string;
  lon: string;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** 'landmark' searches broadly; 'city' biases to cities/municipalities */
  mode?: 'landmark' | 'city';
  disabled?: boolean;
  className?: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function LocationAutocomplete({
  value,
  onChange,
  placeholder,
  mode = 'landmark',
  disabled,
  className,
}: LocationAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const debouncedInput = useDebounce(inputValue, 400);

  // Sync external value changes (e.g. form reset)
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: `${q}, Philippines`,
        format: 'json',
        countrycodes: 'ph',
        limit: '6',
        addressdetails: '1',
        dedupe: '1',
        ...(mode === 'city' ? { featuretype: 'city' } : {}),
      });

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        {
          signal: abortRef.current.signal,
          headers: { 'Accept-Language': 'en' },
        }
      );
      const data: NominatimResult[] = await res.json();
      setResults(data);
      setOpen(data.length > 0);
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') setResults([]);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    search(debouncedInput);
  }, [debouncedInput, search]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function selectResult(r: NominatimResult) {
    // Pick a clean display name
    let picked = r.name;
    if (mode === 'city') {
      picked =
        r.address.city ??
        r.address.municipality ??
        r.address.city_district ??
        r.name;
    }
    // Include province/state for context if available
    if (r.address.state && !picked.includes(r.address.state)) {
      picked = `${picked}, ${r.address.state}`;
    }
    setInputValue(picked);
    onChange(picked);
    setOpen(false);
    setResults([]);
  }

  function clear() {
    setInputValue('');
    onChange('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (!e.target.value) { onChange(''); setResults([]); setOpen(false); }
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-9 pr-8"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
        {!loading && inputValue && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg overflow-hidden">
          <ul className="divide-y divide-border max-h-56 overflow-y-auto">
            {results.map((r) => (
              <li key={r.place_id}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors flex items-start gap-2"
                  onMouseDown={(e) => { e.preventDefault(); selectResult(r); }}
                >
                  <MapPin className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.display_name}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
