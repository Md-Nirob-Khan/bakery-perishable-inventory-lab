import React from 'react';
import { RefreshCw } from 'lucide-react';

export type ActiveView = 'overview' | 'inspector' | 'frontier' | 'formulation';

interface TopBarProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  onRerunMonteCarlo: () => void;
}

const NAV_ITEMS: { id: ActiveView; label: string }[] = [
  { id: 'overview', label: 'Simulation Lab' },
  { id: 'inspector', label: 'Daily Inspector' },
  { id: 'frontier', label: 'Service Frontier' },
  { id: 'formulation', label: 'Formulation' },
];

export const TopBar: React.FC<TopBarProps> = ({
  activeView,
  onSelectView,
  onRerunMonteCarlo,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <button
          type="button"
          onClick={() => onSelectView('overview')}
          className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-slate-900 whitespace-nowrap shrink-0 hover:text-sky-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 rounded"
        >
          Crumb &amp; Ledger
        </button>

        {/* Zone 2: 4 single-line navigation links */}
        <nav aria-label="Primary Workspace" className="hidden md:flex items-center gap-7">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 rounded ${
                  isActive
                    ? 'text-slate-900'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 -bottom-[1px] h-0.5 bg-sky-600 rounded-full"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onRerunMonteCarlo}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.99] rounded-lg transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            New Monte Carlo Seed
          </button>
        </div>
      </div>

      {/* Mobile navigation row */}
      <div className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center gap-2 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? 'bg-sky-50 text-sky-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
