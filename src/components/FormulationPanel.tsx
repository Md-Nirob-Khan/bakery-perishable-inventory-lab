import React from 'react';
import { SimulationOutput } from '../simulation/types';

interface FormulationPanelProps {
  output: SimulationOutput;
}

export const FormulationPanel: React.FC<FormulationPanelProps> = ({ output }) => {
  const { product, params, markdownPrice } = output;

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="text-xs text-slate-500">
          Graduate Production &amp; Inventory Control Reference
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-900 mt-1">
          Mathematical Formulation &amp; Algorithms
        </h1>
        <p className="text-sm text-slate-600 mt-2 max-w-3xl leading-relaxed">
          This simulator extends the classical single-period Newsvendor model into a multi-day
          perishable bakery setting with FIFO issuing, age-dependent markdown pricing,
          heterogeneous freshness preferences, and non-stationary weekday demand estimated online via
          Holt-Winters multiplicative exponential smoothing.
        </p>
      </section>

      {/* 1. Notation & Current Parameter Mapping */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          01. Sets, Parameters &amp; Current Calibration
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-4 font-medium">Symbol</th>
                <th className="py-2 px-4 font-medium">Definition</th>
                <th className="py-2 pl-4 text-right font-medium">Active Value ({product.name})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-2 pr-4 font-[family-name:var(--font-display)] italic text-sm text-slate-900">
                  M
                </td>
                <td className="py-2 px-4 text-slate-700">
                  Maximum shelf life in days (age 0 is fresh-baked; age M expires at close)
                </td>
                <td className="py-2 pl-4 text-right font-[family-name:var(--font-mono)] tabular-nums text-slate-900">
                  {params.shelfLifeDays} days
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-[family-name:var(--font-display)] italic text-sm text-slate-900">
                  c, p
                </td>
                <td className="py-2 px-4 text-slate-700">
                  Unit baking cost and full retail price for age-0 fresh items
                </td>
                <td className="py-2 pl-4 text-right font-[family-name:var(--font-mono)] tabular-nums text-slate-900">
                  c = ${product.unitCost.toFixed(2)}, p = ${product.unitPrice.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-[family-name:var(--font-display)] italic text-sm text-slate-900">
                  δ, pₘ
                </td>
                <td className="py-2 px-4 text-slate-700">
                  Day-old markdown discount and clearance price pₘ = (1 − δ) p
                </td>
                <td className="py-2 pl-4 text-right font-[family-name:var(--font-mono)] tabular-nums text-slate-900">
                  δ = {Math.round(params.markdownPercent * 100)}%, pₘ = ${markdownPrice.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-[family-name:var(--font-display)] italic text-sm text-slate-900">
                  w
                </td>
                <td className="py-2 px-4 text-slate-700">
                  Unit waste disposal / composting cost for expired items
                </td>
                <td className="py-2 pl-4 text-right font-[family-name:var(--font-mono)] tabular-nums text-slate-900">
                  ${params.wasteDisposalCost.toFixed(2)} / unit
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-[family-name:var(--font-display)] italic text-sm text-slate-900">
                  θ
                </td>
                <td className="py-2 px-4 text-slate-700">
                  Fresh-only customer segment share (refuses age ≥ 1 stock)
                </td>
                <td className="py-2 pl-4 text-right font-[family-name:var(--font-mono)] tabular-nums text-slate-900">
                  {params.freshOnlyShare.toFixed(2)} ({Math.round(params.freshOnlyShare * 100)}%)
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-[family-name:var(--font-display)] italic text-sm text-slate-900">
                  α
                </td>
                <td className="py-2 px-4 text-slate-700">
                  Target Type-1 Cycle Service Level; z = Φ⁻¹(α)
                </td>
                <td className="py-2 pl-4 text-right font-[family-name:var(--font-mono)] tabular-nums text-slate-900">
                  {(params.targetServiceLevel * 100).toFixed(0)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. Holt-Winters Forecasting + 3. FIFO State Transitions */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-4">
          <h2 className="text-base font-semibold text-slate-900">
            02. Weekday Demand Forecasting (Holt-Winters)
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            True daily demand on day t with weekday index k = t mod 7 follows a heteroskedastic
            seasonal normal distribution Dₜ ~ max(0, round(𝒩(μ · Sₖ, (CV · μ · Sₖ)²))). Because
            the bakery does not know true parameters, it maintains causal multiplicative
            exponential smoothing estimates (Lₜ, Ŝₖ, σ̂ₜ) updated after each day&apos;s demand:
          </p>

          <div className="bg-slate-50 rounded-lg p-4 font-[family-name:var(--font-mono)] text-xs text-slate-800 space-y-2 overflow-x-auto">
            <div>D̂ₜ = Lₜ₋₁ · Ŝ_{'{t-7}'} ,   σ̂ₜ = σ̂_base,t-1 · Ŝ_{'{t-7}'}</div>
            <div>Lₜ = α_L · (Dₜ / Ŝ_{'{t-7}'}) + (1 − α_L) · Lₜ₋₁</div>
            <div>Ŝₜ = γ_S · (Dₜ / Lₜ) + (1 − γ_S) · Ŝ_{'{t-7}'}   [normalized: ∑ Ŝ = 7]</div>
            <div>σ̂_base,t = β_σ · √(π/2) · (|Dₜ − D̂ₜ| / Ŝ_{'{t-7}'}) + (1 − β_σ) · σ̂_base,t-1</div>
          </div>

          <p className="text-xs text-slate-500">
            Smoothing constants: α_L = 0.14, γ_S = 0.18, β_σ = 0.14, calibrated after a 28-day
            historical burn-in window before evaluation Day 1.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-4">
          <h2 className="text-base font-semibold text-slate-900">
            03. FIFO Issuing &amp; Age-Cohort Transitions
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Let morning on-hand inventory be Iₜ = (Iₜ,₁, …, Iₜ,ₘ₋₁), where Iₜ,ₐ denotes units
            baked a days ago. Morning production Qₜ enters at age 0. Demand splits stochastically:
            Dₜ^fresh ~ Binomial(Dₜ, θ) and Dₜ^flex = Dₜ − Dₜ^fresh.
          </p>

          <div className="bg-slate-50 rounded-lg p-4 font-[family-name:var(--font-mono)] text-xs text-slate-800 space-y-2 overflow-x-auto">
            <div>1. FIFO Aged Depletion (a = M−1 down to 1):</div>
            <div>   sₜ,ₐ = min(Iₜ,ₐ, Rₜ,ₐ)  where Rₜ,ₘ₋₁ = Dₜ^flex, Rₜ,ₐ₋₁ = Rₜ,ₐ − sₜ,ₐ</div>
            <div>2. Fresh Fulfillment (Age 0):</div>
            <div>   sₜ,₀ = min(Qₜ, Dₜ^fresh + Rₜ,₀) ,  Stockout = (Dₜ^fresh + Rₜ,₀) − sₜ,₀</div>
            <div>3. Expiration &amp; Aging:</div>
            <div>   Eₜ = Iₜ,ₘ₋₁ − sₜ,ₘ₋₁  (or Qₜ − sₜ,₀ if M = 1)</div>
            <div>   I_{'{t+1,1}'} = Qₜ − sₜ,₀ ,   I_{'{t+1,a}'} = I_{'{t,a-1}'} − sₜ,ₐ₋₁  (a ≥ 2)</div>
            <div>4. Daily Net Profit:</div>
            <div>   Πₜ = p·sₜ,₀ + pₘ·∑_{'{a≥1}'} sₜ,ₐ − c·Qₜ − w·Eₜ</div>
          </div>
        </section>
      </div>

      {/* 4. Policy Comparison & Critical Fractile */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-4">
        <h2 className="text-base font-semibold text-slate-900">
          04. Control Policies: Simple Newsvendor vs. Age-Aware Order-Up-To
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-amber-800">
              Policy A — Simple Newsvendor (Age-Blind Baseline)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Treats each morning independently without observing carried-over aged stock Iₜ:
            </p>
            <div className="bg-slate-50 rounded-lg p-3.5 font-[family-name:var(--font-mono)] text-xs text-slate-800">
              Qₜ^NV = max(0, round(D̂ₜ + Φ⁻¹(α) · σ̂ₜ))
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              When M ≥ 2, ignoring carried-over stock causes repeated double-ordering after low
              demand days, triggering an expiration cascade at age M. Classic single-period critical
              fractile: CF* = (p − c) / (p + w) = {(output.criticalFractileClassic * 100).toFixed(1)}%.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-sky-800">
              Policy B — Age-Aware Order-Up-To (With Fresh-Segment Floor)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Offsets the total base-stock target Sₜ = D̂ₜ + Φ⁻¹(α)σ̂ₜ by usable aged stock while
              protecting fresh-only buyers via a segment safety floor Qₜ^floor:
            </p>
            <div className="bg-slate-50 rounded-lg p-3.5 font-[family-name:var(--font-mono)] text-xs text-slate-800 space-y-1.5">
              <div>Qₜ^floor = round(θ·D̂ₜ + Φ⁻¹(α)·√((θ·σ̂ₜ)² + θ(1−θ)D̂ₜ))</div>
              <div>Cap_flex = (1−θ)·D̂ₜ + 0.5·Φ⁻¹(α)·(1−θ)·σ̂ₜ</div>
              <div>Ĩ_aged = min(Iₜ,ₘ₋₁, Cap_flex) + min(∑_{'{a<M-1}'} Iₜ,ₐ, remCap + 0.35(1−θ)D̂_{'{t+1}'})</div>
              <div>Qₜ^AA = max(Qₜ^floor, round(Sₜ − Ĩ_aged))</div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Unlike naive base-stock subtraction (Sₜ − ∑Iₜ,ₐ), the floor Qₜ^floor prevents aged
              gluts from starving fresh-only customers. When M = 1, Iₜ = ∅ so Qₜ^AA ≡ Qₜ^NV.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Monte Carlo Algorithm */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          05. Paired Monte Carlo Evaluation Algorithm (CRN)
        </h2>
        <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs font-[family-name:var(--font-mono)] overflow-x-auto leading-relaxed">
{`For trial r = 1 .. N_trials:
  1. Generate burn-in sequence D_{-28..-1} and evaluation demand stream D_{0..7W-1}
     with Binomial segment splits (D_t^fresh, D_t^flex) using seed(r).
  2. Initialize Holt-Winters state (L_0, S_0..6, sigma_0) from burn-in history.
  3. For each Policy pi in {SimpleNewsvendor, AgeAwareOrderUpTo} on IDENTICAL demand stream:
     Initialize I_0 = [0, ..., 0] of length M - 1.
     For day t = 0 .. 7W - 1:
       a. Compute causal forecast (D_hat_t, D_hat_{t+1}, sigma_hat_t).
       b. Order morning bake Q_t = Policy_pi(D_hat_t, D_hat_{t+1}, sigma_hat_t, I_t).
       c. Issue aged stock I_t FIFO to D_t^flex; issue Q_t to D_t^fresh + remaining flex.
       d. Record revenue, production cost, expired waste E_t, stockouts, and profit Pi_t.
       e. Age surviving stock I_t -> I_{t+1} and update Holt-Winters with D_t.
  4. Aggregate weekly profit distribution, waste rate, stockouts, and Type-1/Type-2 fill rates.`}
        </pre>
      </section>
    </div>
  );
};
