/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { ControlDeck } from './components/ControlDeck';
import { DailyInspector } from './components/DailyInspector';
import { FormulationPanel } from './components/FormulationPanel';
import { OverviewLab } from './components/OverviewLab';
import { ServiceFrontier } from './components/ServiceFrontier';
import { ActiveView, TopBar } from './components/TopBar';
import {
  runMonteCarloSimulation,
  runServiceLevelFrontier,
} from './simulation/engine';
import { PRODUCT_MAP } from './simulation/products';
import { ProductId, SimulationParams } from './simulation/types';

const INITIAL_PRODUCT_ID: ProductId = 'croissant';
const initialProduct = PRODUCT_MAP[INITIAL_PRODUCT_ID];

const INITIAL_PARAMS: SimulationParams = {
  productId: INITIAL_PRODUCT_ID,
  shelfLifeDays: initialProduct.defaultShelfLife,
  markdownPercent: 0.40,
  wasteDisposalCost: 0.40,
  targetServiceLevel: 0.85,
  freshOnlyShare: initialProduct.freshOnlyShare,
  weeks: 24,
  monteCarloTrials: 150,
  seed: 4201,
};

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [params, setParams] = useState<SimulationParams>(INITIAL_PARAMS);

  const selectedProduct = PRODUCT_MAP[params.productId];

  const simulationOutput = useMemo(
    () => runMonteCarloSimulation(params),
    [params]
  );

  const frontierPoints = useMemo(() => {
    if (activeView !== 'frontier') return [];
    return runServiceLevelFrontier(params);
  }, [activeView, params]);

  const handleSelectProduct = (productId: ProductId) => {
    const product = PRODUCT_MAP[productId];
    setParams((prev) => ({
      ...prev,
      productId,
      shelfLifeDays: product.defaultShelfLife,
      freshOnlyShare: product.freshOnlyShare,
    }));
  };

  const handleUpdateParam = <K extends keyof SimulationParams>(
    key: K,
    value: SimulationParams[K]
  ) => {
    setParams((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleResetProductDefaults = () => {
    const product = PRODUCT_MAP[params.productId];
    setParams((prev) => ({
      ...prev,
      shelfLifeDays: product.defaultShelfLife,
      markdownPercent: 0.40,
      wasteDisposalCost: 0.40,
      targetServiceLevel: 0.85,
      freshOnlyShare: product.freshOnlyShare,
    }));
  };

  const handleRerunMonteCarlo = () => {
    setParams((prev) => ({
      ...prev,
      seed: prev.seed + 137,
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      <TopBar
        activeView={activeView}
        onSelectView={setActiveView}
        onRerunMonteCarlo={handleRerunMonteCarlo}
      />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
          <ControlDeck
            params={params}
            selectedProduct={selectedProduct}
            criticalFractileClassic={simulationOutput.criticalFractileClassic}
            criticalFractileMarkdown={simulationOutput.criticalFractileMarkdown}
            onSelectProduct={handleSelectProduct}
            onUpdateParam={handleUpdateParam}
            onResetProductDefaults={handleResetProductDefaults}
          />

          <div className="min-w-0">
            {activeView === 'overview' && <OverviewLab output={simulationOutput} />}
            {activeView === 'inspector' && <DailyInspector output={simulationOutput} />}
            {activeView === 'frontier' && (
              <ServiceFrontier frontier={frontierPoints} output={simulationOutput} />
            )}
            {activeView === 'formulation' && <FormulationPanel output={simulationOutput} />}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white mt-8">
        <div className="max-w-[1440px] mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            Crumb &amp; Ledger — Perishable Bakery Inventory Simulator
          </span>
          <span className="font-[family-name:var(--font-mono)] tabular-nums">
            Seed #{params.seed} · Holt-Winters Multiplicative Weekday Model
          </span>
        </div>
      </footer>
    </div>
  );
}
