import React from 'react';
import { FrontierPoint, SimulationOutput } from '../simulation/types';
import { FrontierCharts } from './Charts';

interface ServiceFrontierProps {
  frontier: FrontierPoint[];
  output: SimulationOutput;
}

export const ServiceFrontier: React.FC<ServiceFrontierProps> = ({
  frontier,
  output,
}) => {
  const bestAA = frontier.reduce(
    (best, p) => (p.aaProfit > best.aaProfit ? p : best),
    frontier[0]
  );
  const bestNV = frontier.reduce(
    (best, p) => (p.nvProfit > best.nvProfit ? p : best),
    frontier[0]
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-900">
            Service Level &amp; Waste Trade-Off Frontier
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Sweeps Target Cycle Service Level α from 50% to 99% under current shelf life (M ={' '}
            {output.params.shelfLifeDays}d), markdown (δ ={' '}
            {Math.round(output.params.markdownPercent * 100)}%), and disposal cost (w = $
            {output.params.wasteDisposalCost.toFixed(2)}).
          </p>
        </div>

        <div className="flex items-center gap-6 shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-5">
          <div>
            <div className="text-[11px] text-sky-700 font-medium">Age-Aware Profit Peak</div>
            <div className="font-[family-name:var(--font-mono)] text-base font-semibold text-slate-900 tabular-nums">
              ${bestAA?.aaProfit.toFixed(2)}/wk @ {Math.round((bestAA?.serviceLevel ?? 0) * 100)}%
            </div>
          </div>
          <div>
            <div className="text-[11px] text-amber-700 font-medium">Simple NV Profit Peak</div>
            <div className="font-[family-name:var(--font-mono)] text-base font-semibold text-slate-700 tabular-nums">
              ${bestNV?.nvProfit.toFixed(2)}/wk @ {Math.round((bestNV?.serviceLevel ?? 0) * 100)}%
            </div>
          </div>
        </div>
      </section>

      <FrontierCharts
        points={frontier}
        currentServiceLevel={output.params.targetServiceLevel}
        criticalFractileClassic={output.criticalFractileClassic}
      />

      <section className="bg-white border border-slate-200 rounded-xl p-5 overflow-x-auto">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">
          Parametric Sweep Summary Table ({output.product.name})
        </h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-3 font-medium">Target SL (α)</th>
              <th className="py-2 px-3 text-right font-medium text-amber-700">NV Profit/wk</th>
              <th className="py-2 px-3 text-right font-medium text-sky-700">AA Profit/wk</th>
              <th className="py-2 px-3 text-right font-medium">NV Waste %</th>
              <th className="py-2 px-3 text-right font-medium">AA Waste %</th>
              <th className="py-2 px-3 text-right font-medium">NV Fill Rate</th>
              <th className="py-2 pl-3 text-right font-medium">AA Fill Rate</th>
            </tr>
          </thead>
          <tbody className="font-[family-name:var(--font-mono)] tabular-nums divide-y divide-slate-100">
            {frontier.map((p) => {
              const isCurrent =
                Math.abs(p.serviceLevel - output.params.targetServiceLevel) < 0.015;
              return (
                <tr
                  key={p.serviceLevel}
                  className={isCurrent ? 'bg-sky-50/70 font-semibold' : 'hover:bg-slate-50'}
                >
                  <td className="py-2 pr-3 text-slate-900">
                    {Math.round(p.serviceLevel * 100)}%
                    {isCurrent && (
                      <span className="ml-2 text-[10px] font-[family-name:var(--font-sans)] text-sky-700">
                        (current)
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-700">${p.nvProfit.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right text-sky-800">${p.aaProfit.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right text-rose-700">
                    {(p.nvWasteRate * 100).toFixed(1)}%
                  </td>
                  <td className="py-2 px-3 text-right text-slate-800">
                    {(p.aaWasteRate * 100).toFixed(1)}%
                  </td>
                  <td className="py-2 px-3 text-right text-slate-600">
                    {(p.nvFillRate * 100).toFixed(1)}%
                  </td>
                  <td className="py-2 pl-3 text-right text-slate-900">
                    {(p.aaFillRate * 100).toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
};
