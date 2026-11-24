import React, { useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { BAKERY_PRODUCTS } from '../simulation/products';
import { BakeryProduct, ProductId, SimulationParams } from '../simulation/types';

interface ControlDeckProps {
  params: SimulationParams;
  selectedProduct: BakeryProduct;
  criticalFractileClassic: number;
  criticalFractileMarkdown: number;
  onSelectProduct: (id: ProductId) => void;
  onUpdateParam: <K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) => void;
  onResetProductDefaults: () => void;
}

export const ControlDeck: React.FC<ControlDeckProps> = ({
  params,
  selectedProduct,
  criticalFractileClassic,
  criticalFractileMarkdown,
  onSelectProduct,
  onUpdateParam,
  onResetProductDefaults,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const markdownPrice = selectedProduct.unitPrice * (1 - params.markdownPercent);

  return (
    <aside
      aria-label="Simulation Parameters"
      className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-6"
    >
      {/* Product Selector */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900">Bakery SKU</h2>
          <span className="text-xs text-slate-500">6 artisan items</span>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {BAKERY_PRODUCTS.map((product) => {
            const isSelected = product.id === params.productId;
            const imgFailed = failedImages[product.id];
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => onSelectProduct(product.id)}
                className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
                  isSelected
                    ? 'border-sky-600 bg-sky-50/50'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                }`}
              >
                <div className="w-14 h-11 rounded-md overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
                  {!imgFailed ? (
                    <img
                      src={product.imagePath}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setFailedImages((prev) => ({ ...prev, [product.id]: true }))
                      }
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-medium text-slate-500">
                      {product.name.slice(0, 2)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900 truncate">
                      {product.name}
                    </span>
                    <span className="font-[family-name:var(--font-mono)] text-xs font-medium text-slate-700 tabular-nums shrink-0">
                      ${product.unitPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-[family-name:var(--font-mono)] tabular-nums truncate mt-0.5">
                    c=${product.unitCost.toFixed(2)} · μ={product.baseDailyMean}/d ·{' '}
                    {Math.round(product.freshOnlyShare * 100)}% fresh-only
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* Core Policy & Perishability Sliders */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Perishability &amp; Policy Controls</h2>
          <button
            type="button"
            onClick={onResetProductDefaults}
            className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 rounded"
          >
            <RotateCcw className="w-3 h-3" aria-hidden="true" />
            Defaults
          </button>
        </div>

        {/* 1. Shelf Life Slider */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label htmlFor="slider-shelf-life" className="text-xs font-medium text-slate-700">
              Shelf Life (M)
            </label>
            <span className="font-[family-name:var(--font-mono)] text-xs font-semibold text-slate-900 tabular-nums">
              {params.shelfLifeDays} {params.shelfLifeDays === 1 ? 'day (single-period)' : 'days'}
            </span>
          </div>
          <input
            id="slider-shelf-life"
            type="range"
            min={1}
            max={4}
            step={1}
            value={params.shelfLifeDays}
            onChange={(e) => onUpdateParam('shelfLifeDays', Number(e.target.value))}
            className="w-full accent-sky-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
          />
          <div className="flex justify-between text-[11px] text-slate-500 mt-1 font-[family-name:var(--font-mono)] tabular-nums">
            <span>1d</span>
            <span>2d</span>
            <span>3d</span>
            <span>4d</span>
          </div>
        </div>

        {/* 2. Markdown Percent Slider */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label htmlFor="slider-markdown" className="text-xs font-medium text-slate-700">
              Day-Old Markdown (δ)
            </label>
            <span className="font-[family-name:var(--font-mono)] text-xs font-semibold text-slate-900 tabular-nums">
              {Math.round(params.markdownPercent * 100)}% (${markdownPrice.toFixed(2)}/unit)
            </span>
          </div>
          <input
            id="slider-markdown"
            type="range"
            min={10}
            max={75}
            step={5}
            value={Math.round(params.markdownPercent * 100)}
            onChange={(e) => onUpdateParam('markdownPercent', Number(e.target.value) / 100)}
            className="w-full accent-sky-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
          />
          <div className="flex justify-between text-[11px] text-slate-500 mt-1 font-[family-name:var(--font-mono)] tabular-nums">
            <span>10% off</span>
            <span>40% off</span>
            <span>75% off</span>
          </div>
        </div>

        {/* 3. Waste Disposal Cost Slider */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label htmlFor="slider-waste-cost" className="text-xs font-medium text-slate-700">
              Waste Disposal Cost (w)
            </label>
            <span className="font-[family-name:var(--font-mono)] text-xs font-semibold text-slate-900 tabular-nums">
              ${params.wasteDisposalCost.toFixed(2)} / expired unit
            </span>
          </div>
          <input
            id="slider-waste-cost"
            type="range"
            min={0}
            max={2.5}
            step={0.1}
            value={params.wasteDisposalCost}
            onChange={(e) => onUpdateParam('wasteDisposalCost', Number(e.target.value))}
            className="w-full accent-sky-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
          />
          <div className="flex justify-between text-[11px] text-slate-500 mt-1 font-[family-name:var(--font-mono)] tabular-nums">
            <span>$0.00</span>
            <span>$1.25</span>
            <span>$2.50</span>
          </div>
        </div>

        {/* 4. Target Service Level Slider */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label htmlFor="slider-service-level" className="text-xs font-medium text-slate-700">
              Target Cycle Service Level (α)
            </label>
            <span className="font-[family-name:var(--font-mono)] text-xs font-semibold text-slate-900 tabular-nums">
              {Math.round(params.targetServiceLevel * 100)}%
            </span>
          </div>
          <input
            id="slider-service-level"
            type="range"
            min={50}
            max={99}
            step={1}
            value={Math.round(params.targetServiceLevel * 100)}
            onChange={(e) => onUpdateParam('targetServiceLevel', Number(e.target.value) / 100)}
            className="w-full accent-sky-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
          />
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
            <button
              type="button"
              onClick={() =>
                onUpdateParam(
                  'targetServiceLevel',
                  Math.min(0.99, Math.max(0.5, Number(criticalFractileClassic.toFixed(2))))
                )
              }
              className="hover:text-sky-700 underline decoration-dotted cursor-pointer font-[family-name:var(--font-mono)] tabular-nums"
            >
              1-day CF: {(criticalFractileClassic * 100).toFixed(1)}%
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateParam(
                  'targetServiceLevel',
                  Math.min(0.99, Math.max(0.5, Number(criticalFractileMarkdown.toFixed(2))))
                )
              }
              className="hover:text-sky-700 underline decoration-dotted cursor-pointer font-[family-name:var(--font-mono)] tabular-nums"
            >
              Salvage CF: {(criticalFractileMarkdown * 100).toFixed(1)}%
            </button>
          </div>
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* Secondary / Monte Carlo Settings */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer py-1"
        >
          <span>Customer Segment &amp; Monte Carlo Setup</span>
          {showAdvanced ? (
            <ChevronUp className="w-4 h-4 text-slate-500" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" aria-hidden="true" />
          )}
        </button>

        {showAdvanced && (
          <div className="mt-4 flex flex-col gap-4">
            {/* Fresh-Only Share */}
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <label htmlFor="slider-fresh-share" className="text-xs font-medium text-slate-700">
                  Fresh-Only Customer Share (θ)
                </label>
                <span className="font-[family-name:var(--font-mono)] text-xs font-semibold text-slate-900 tabular-nums">
                  {Math.round(params.freshOnlyShare * 100)}%
                </span>
              </div>
              <input
                id="slider-fresh-share"
                type="range"
                min={0}
                max={95}
                step={5}
                value={Math.round(params.freshOnlyShare * 100)}
                onChange={(e) => onUpdateParam('freshOnlyShare', Number(e.target.value) / 100)}
                className="w-full accent-sky-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
            </div>

            {/* Weeks Horizon */}
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <label htmlFor="slider-weeks" className="text-xs font-medium text-slate-700">
                  Simulation Horizon (Weeks)
                </label>
                <span className="font-[family-name:var(--font-mono)] text-xs font-semibold text-slate-900 tabular-nums">
                  {params.weeks} wks ({params.weeks * 7} days)
                </span>
              </div>
              <input
                id="slider-weeks"
                type="range"
                min={12}
                max={52}
                step={4}
                value={params.weeks}
                onChange={(e) => onUpdateParam('weeks', Number(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
            </div>

            {/* Monte Carlo Trials */}
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <label htmlFor="slider-trials" className="text-xs font-medium text-slate-700">
                  Monte Carlo Trials (N)
                </label>
                <span className="font-[family-name:var(--font-mono)] text-xs font-semibold text-slate-900 tabular-nums">
                  {params.monteCarloTrials} runs
                </span>
              </div>
              <input
                id="slider-trials"
                type="range"
                min={50}
                max={400}
                step={50}
                value={params.monteCarloTrials}
                onChange={(e) => onUpdateParam('monteCarloTrials', Number(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
