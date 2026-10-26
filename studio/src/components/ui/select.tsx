import * as React from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOptionItem {
  value: string;
  label: string;
  sublabel?: string;
  group?: string;
}

interface SelectMenuProps {
  value: string;
  onValueChange: (val: string) => void;
  options: SelectOptionItem[];
  placeholder?: string;
  searchable?: boolean;
  className?: string;
}

export const SelectMenu: React.FC<SelectMenuProps> = ({
  value,
  onValueChange,
  options,
  placeholder = 'Select option...',
  searchable = false,
  className
}) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  React.useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q) ||
        (o.sublabel && o.sublabel.toLowerCase().includes(q)) ||
        (o.group && o.group.toLowerCase().includes(q))
    );
  }, [options, query]);

  const groups = React.useMemo(() => {
    const map = new Map<string, SelectOptionItem[]>();
    for (const item of filtered) {
      const g = item.group || 'Options';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(item);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex h-8 w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-950 shadow-2xs transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-400 cursor-pointer text-left"
      >
        <span className="truncate font-medium">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-zinc-500 shrink-0 ml-2" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-hidden rounded-xl border border-zinc-200 bg-white text-zinc-950 shadow-xl flex flex-col">
          {searchable && (
            <div className="flex items-center gap-2 border-b border-zinc-100 px-2.5 py-1.5 bg-zinc-50/60">
              <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter actions..."
                className="w-full bg-transparent text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
                autoFocus
              />
            </div>
          )}
          <div className="overflow-y-auto p-1 max-h-60 space-y-1">
            {groups.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-zinc-400">No matches found.</div>
            ) : (
              groups.map(([groupName, groupItems]) => (
                <div key={groupName}>
                  {groups.length > 1 && (
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {groupName}
                    </div>
                  )}
                  {groupItems.map((opt) => {
                    const isSelected = opt.value === value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          onValueChange(opt.value);
                          setOpen(false);
                          setQuery('');
                        }}
                        className={cn(
                          'flex w-full items-start justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer',
                          isSelected
                            ? 'bg-zinc-100 text-zinc-950 font-semibold'
                            : 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950'
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate">{opt.label}</div>
                          {opt.sublabel && (
                            <div className="truncate text-[10px] text-zinc-400 font-mono">
                              {opt.sublabel}
                            </div>
                          )}
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 text-zinc-950 shrink-0 mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
