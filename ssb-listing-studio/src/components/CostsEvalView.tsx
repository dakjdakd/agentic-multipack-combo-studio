import { useState } from 'react';
import { 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart4, 
  PieChart, 
  Calendar, 
  ChevronRight, 
  Sparkles, 
  ShieldAlert, 
  CheckCircle2, 
  SlidersHorizontal 
} from 'lucide-react';
import { BudgetConfig, CostBreakdown, EvaluationHarness } from '../types';

interface CostsEvalViewProps {
  budget: BudgetConfig;
  costsBreakdown: CostBreakdown;
  evalHarness: EvaluationHarness;
  onTriggerBenchmark: () => Promise<void> | void;
  isLoading: boolean;
}

export default function CostsEvalView({
  budget,
  costsBreakdown,
  evalHarness,
  onTriggerBenchmark,
  isLoading
}: CostsEvalViewProps) {
  const [activeTab, setActiveTab] = useState<'budget' | 'agent' | 'evaluation'>('budget');
  const llmLabel = [costsBreakdown.llmProvider, costsBreakdown.llmModel].filter(Boolean).join(' / ') || 'Configured LLM';
  const imageLabel = [costsBreakdown.imageProvider, costsBreakdown.imageModel].filter(Boolean).join(' / ') || 'Configured image provider';
  const searchLabel = costsBreakdown.searchProvider || 'Configured search provider';
  const costNotice = costsBreakdown.costNotice || 'Estimated/simulated ledger values only; not an actual provider invoice for this browser run.';

  // Fallback display is used only before the backend cost ledger has rows.
  const agentsCostData = costsBreakdown.perAgentCosts && costsBreakdown.perAgentCosts.length > 0 ? costsBreakdown.perAgentCosts : [
    { name: "Supervisor Specialist", calls: 42, tokens: "411,000", latency: "710ms", costRmb: 48.20, efficiency: "98%" },
    { name: "Product Researcher", calls: 58, tokens: "294,000", latency: "1,450ms", costRmb: 85.50, efficiency: "94%" },
    { name: "Expert Copywriter", calls: 36, tokens: "385,050", latency: "2,200ms", costRmb: 110.10, efficiency: "96%" },
    { name: "Agnes Image Synthesizer", calls: 24, tokens: "0 (Generations: 96)", latency: "3,110ms", costRmb: 28.50, efficiency: "90%" },
    { name: "Audit Critic", calls: 36, tokens: "154,000", latency: "890ms", costRmb: 8.40, efficiency: "92%" },
    { name: "FTC Compliance Scan", calls: 41, tokens: "96,200", latency: "540ms", costRmb: 3.80, efficiency: "99%" }
  ];

  const totalSpentPercent = Math.min(100, (budget.spentRmb / budget.targetRmb) * 100);

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      
      {/* Title Header */}
      <div className="bg-[#EEF4F8] p-5 border-2 border-slate-900 rounded flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-mono tracking-tight uppercase">
            07 / EXPENSES & QUALITY BENCHMARKS
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-mono">
            Track simulated API cost allocations, budget ceilings, and multi-SKU quality assessment metrics.
          </p>
        </div>
        <div className="bg-slate-900 text-[#EEF4F8] text-[10px] font-mono px-3 py-1.5 rounded tracking-wide uppercase flex items-center gap-1.5 border border-slate-700">
          <Coins className="w-4 h-4 text-yellow-400" />
          SIMULATED RMB LEDGER
        </div>
      </div>

      {/* Tabs navigation for metrics views */}
      <div className="flex border-b-2 border-slate-950 font-mono text-xs font-semibold uppercase">
        <button
          onClick={() => setActiveTab('budget')}
          className={`px-4 py-2 text-center border-t border-x rounded-t cursor-pointer transition-colors ${
            activeTab === 'budget' 
              ? 'bg-[#0B2545] text-white border-slate-900 font-bold' 
              : 'bg-white text-slate-500 hover:text-slate-800 border-transparent hover:bg-slate-50'
          }`}
        >
          Budget Allocations
        </button>
        <button
          onClick={() => setActiveTab('agent')}
          className={`px-4 py-2 text-center border-t border-x rounded-t cursor-pointer transition-colors ${
            activeTab === 'agent' 
              ? 'bg-[#0B2545] text-white border-slate-900 font-bold' 
              : 'bg-white text-slate-500 hover:text-slate-800 border-transparent hover:bg-slate-50'
          }`}
        >
          Agent Efficiency Table
        </button>
        <button
          onClick={() => setActiveTab('evaluation')}
          className={`px-4 py-2 text-center border-t border-x rounded-t cursor-pointer transition-colors ${
            activeTab === 'evaluation' 
              ? 'bg-[#0B2545] text-white border-slate-900 font-bold' 
              : 'bg-white text-slate-500 hover:text-slate-800 border-transparent hover:bg-slate-50'
          }`}
        >
          Quality Evaluations Harness
        </button>
      </div>

      {/* Renders Tab Panels */}
      {activeTab === 'budget' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Columns (Span 2): Budget details */}
          <div className="lg:col-span-2 bg-white border-2 border-slate-900 rounded p-5 shadow-sm space-y-6">
            
            {/* Primary progress bar item */}
            <div className="space-y-3 font-mono">
              <div className="bg-amber-50 border border-amber-300 text-amber-950 rounded p-3 text-[11px] leading-relaxed">
                <strong className="uppercase">Cost display note:</strong> {costNotice}
              </div>
              <div className="flex justify-between items-end text-xs text-slate-500 uppercase">
                <span>Simulated cumulative computational expenditure against budget limit</span>
                <span className="font-bold text-[#0B2545]">RMB {budget.spentRmb.toFixed(2)} / RMB {budget.targetRmb.toFixed(2)} Target Limit</span>
              </div>
              <div className="bg-slate-100 h-6 w-full rounded overflow-hidden border border-slate-350 p-1 flex">
                <div 
                  style={{ width: `${totalSpentPercent}%` }}
                  className="bg-[#0B2545] h-full rounded transition-all duration-500"
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                <span>0.00 RMB</span>
                <span>{totalSpentPercent.toFixed(1)}% Used</span>
                <span>RMB {budget.targetRmb} RMB (Cap)</span>
              </div>
            </div>

            {/* Split Metrics: Remaining vs. Forecast */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="p-4 bg-emerald-50 border border-emerald-350 rounded font-mono text-center">
                <span className="text-[10px] text-emerald-800 uppercase block tracking-wider leading-none">Simulated Remaining Budget</span>
                <div className="text-xl font-bold text-emerald-950 mt-1.5 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 mr-1 shrink-0" />
                  RMB {budget.remainingRmb.toFixed(2)}
                </div>
                <p className="text-[9px] text-emerald-600 mt-1 leading-none uppercase font-semibold">Budget guardrail, not cash balance</p>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-350 rounded font-mono text-center">
                <span className="text-[10px] text-blue-850 uppercase block tracking-wider leading-none">Simulated Forecast</span>
                <div className="text-xl font-bold text-blue-950 mt-1.5 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 mr-1 shrink-0" />
                  RMB {budget.forecastRmb.toFixed(2)}
                </div>
                <p className="text-[9px] text-blue-550 mt-1 leading-none uppercase font-semibold">Projected ledger value</p>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-350 rounded font-mono text-center">
                <span className="text-[10px] text-amber-800 uppercase block tracking-wider leading-none">Cached Cost Savings</span>
                <div className="text-xl font-bold text-amber-950 mt-1.5 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 mr-1 text-amber-600 shrink-0" />
                  RMB {costsBreakdown.cachedSavingsRmb.toFixed(2)}
                </div>
                <p className="text-[9px] text-amber-705 mt-1 leading-none uppercase font-semibold">Estimated avoided repeat calls</p>
              </div>

            </div>

            {/* Detailed itemized cost credit usage */}
            <div className="border border-slate-205 rounded overflow-hidden">
              <div className="bg-slate-100 p-2.5 border-b font-mono text-xs font-bold text-slate-800 uppercase">
                Computational Unit breakdown (Resource level billing)
              </div>
              <div className="divide-y divide-slate-150 font-mono text-xs">
                
                <div className="p-3 bg-slate-50/50 flex justify-between items-center gap-4">
                  <span className="font-bold text-slate-650">LLM Input Sequences ({llmLabel})</span>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 block">{costsBreakdown.llmInputTokens.toLocaleString()} Tokens</span>
                    <span className="text-[10px] text-slate-400">RMB {(costsBreakdown.llmInputCostRmb || 0).toFixed(2)} estimated</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50/50 flex justify-between items-center gap-4">
                  <span className="font-bold text-slate-650">LLM Output Sequences ({llmLabel})</span>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 block">{costsBreakdown.llmOutputTokens.toLocaleString()} Tokens</span>
                    <span className="text-[10px] text-slate-400">RMB {(costsBreakdown.llmOutputCostRmb || 0).toFixed(2)} estimated</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50/50 flex justify-between items-center gap-4">
                  <span className="font-bold text-slate-650">Creative Studio Imagery ({imageLabel})</span>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 block">{costsBreakdown.imageGenerationsCount} Images created</span>
                    <span className="text-[10px] text-slate-400">RMB {(costsBreakdown.imageGenerationCostRmb || 0).toFixed(2)} estimated</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50/50 flex justify-between items-center gap-4">
                  <span className="font-bold text-slate-650">Web Search Grounding requests ({searchLabel})</span>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 block">{costsBreakdown.webSearchesCount} Queries executed</span>
                    <span className="text-[10px] text-slate-400">RMB {(costsBreakdown.webSearchCostRmb || 0).toFixed(2)} estimated</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50/50 flex justify-between items-center">
                  <span className="font-bold text-slate-650">Prompt Compiler Retries (Errors shielding resilience)</span>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 block">{costsBreakdown.retriesCount} Automatic attempts</span>
                    <span className="text-[10px] text-rose-500">RMB {(costsBreakdown.retriesCostRmb || 0).toFixed(2)} estimated</span>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Right Column: Mini budget summaries info card */}
          <div className="bg-slate-900 text-white p-5 rounded border-2 border-slate-900 space-y-4">
            <h4 className="font-mono text-yellow-400 font-bold text-xs uppercase tracking-widest border-b border-slate-800 pb-2">
              SSB BUDGET AUDIT FRAMEWORK
            </h4>
            <div className="font-mono text-xs space-y-2 leading-relaxed">
              <p>
                <strong>Operational Constraint Rule:</strong> Listing creation uses deterministic local providers when demo mode is active, reducing actual {llmLabel}, {imageLabel}, and {searchLabel} spend.
              </p>
              <p className="text-[#A3BFD9] text-[11px]">
                In non-demo mode, this panel still shows estimated CNY values calculated from configured unit prices, token lengths, image counts, and search groundings.
              </p>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'agent' && (
        <div className="bg-white border-2 border-slate-900 rounded shadow-sm overflow-hidden p-5 space-y-4">
          <h3 className="font-mono font-bold text-[#0B2545] text-sm uppercase flex items-center gap-2 border-b pb-2">
            <Activity className="w-4 h-4 text-slate-600 animate-spin" />
            AGENT RESOURCE CONSUMPTION AND PERFORMANCE LOGS
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b">
                  <th className="py-2.5 px-3">Agent Node Role</th>
                  <th className="py-2.5 px-3 text-right">Invocations</th>
                  <th className="py-2.5 px-3 text-right">Allocated Tokens</th>
                  <th className="py-2.5 px-3 text-right">Mean Latency</th>
                  <th className="py-2.5 px-3 text-right">Aggregate Cost (RMB)</th>
                  <th className="py-2.5 px-3 text-right">SLA Score</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-755">
                {agentsCostData.map((ag) => (
                  <tr key={ag.name} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-semibold text-[#0B2545]">{ag.name}</td>
                    <td className="py-3 px-3 text-right font-bold">{ag.calls} calls</td>
                    <td className="py-3 px-3 text-right text-slate-500">{ag.tokens}</td>
                    <td className="py-3 px-3 text-right">{ag.latency}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">RMB {ag.costRmb.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right text-emerald-700 font-extrabold">{ag.efficiency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'evaluation' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Main evaluations layout: Span 2 */}
          <div className="lg:col-span-2 bg-white border-2 border-slate-900 rounded p-5 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b pb-3 text-sm font-mono font-bold text-indigo-905 uppercase">
              <span>EVALUATION SUITE SCORE METERS</span>
              <button
                disabled={isLoading}
                onClick={onTriggerBenchmark}
                className="py-1 px-3 bg-[#0B2545] text-white hover:bg-slate-900 text-[10.5px] rounded border uppercase cursor-pointer disabled:bg-slate-400 disabled:cursor-wait"
              >
                {isLoading ? 'Recalculating...' : 'RE-RUN HARNESS EVAL'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Score card 1 */}
              <div className="p-3 bg-[#F8F9FA] border rounded font-mono text-center space-y-1">
                <span className="text-[9px] text-slate-500 block uppercase">Regs Compliance</span>
                <div className="text-xl font-extrabold text-emerald-850">{evalHarness.complianceScore.toFixed(1)}%</div>
                <div className="h-1.5 bg-slate-205 w-full rounded overflow-hidden">
                  <div style={{ width: `${evalHarness.complianceScore}%` }} className="bg-emerald-600 h-full" />
                </div>
              </div>

              {/* Score card 2 */}
              <div className="p-3 bg-[#F8F9FA] border rounded font-mono text-center space-y-1">
                <span className="text-[9px] text-slate-500 block uppercase">Physical Sync</span>
                <div className="text-xl font-extrabold text-indigo-850">{evalHarness.physicalConsistencyScore.toFixed(1)}%</div>
                <div className="h-1.5 bg-slate-205 w-full rounded overflow-hidden">
                  <div style={{ width: `${evalHarness.physicalConsistencyScore}%` }} className="bg-indigo-600 h-full" />
                </div>
              </div>

              {/* Score card 3 */}
              <div className="p-3 bg-[#F8F9FA] border rounded font-mono text-center space-y-1">
                <span className="text-[9px] text-slate-500 block uppercase">Copy Grade Index</span>
                <div className="text-xl font-extrabold text-[#0B2545]">{evalHarness.listingQualityScore.toFixed(1)}%</div>
                <div className="h-1.5 bg-slate-205 w-full rounded overflow-hidden">
                  <div style={{ width: `${evalHarness.listingQualityScore}%` }} className="bg-blue-600 h-full" />
                </div>
              </div>

              {/* Score card 4 - Overall */}
              <div className="p-3 bg-yellow-105 border border-yellow-405 rounded font-mono text-center space-y-1 ring-1 ring-yellow-250">
                <span className="text-[9px] text-slate-505 block font-bold uppercase">Overall Index Score</span>
                <div className="text-2xl font-extrabold text-slate-900">{evalHarness.overallScore.toFixed(1)}%</div>
                <div className="h-2 bg-slate-200 w-full rounded overflow-hidden mt-1">
                  <div style={{ width: `${evalHarness.overallScore}%` }} className="bg-yellow-400 h-full" />
                </div>
              </div>

            </div>

            {/* Benchmark SKUs items */}
            <div className="bg-slate-50 border p-3 rounded font-mono text-xs text-slate-600 space-y-1.5">
              <span className="font-bold text-slate-800 uppercase block text-[10px]">Benchmark Sample Scope:</span>
              <div className="flex gap-2 font-bold select-none text-[#0B2545]">
                {evalHarness.selectedSkus.map(s => (
                  <span key={s} className="bg-white border rounded px-2.5 py-1 text-[10.5px]">#{s}</span>
                ))}
              </div>
            </div>

          </div>

          {/* Right evaluations help parameters */}
          <div className="bg-white border-2 border-slate-900 rounded p-4 shadow-sm font-mono text-xs space-y-3">
            <h4 className="text-slate-900 font-bold border-b pb-2 uppercase text-[10px]">EVAL HARNESS PARAMETERS</h4>
            <div className="space-y-2 text-slate-600 leading-relaxed text-[11px]">
              <p>
                <strong>Regulatory Standards Scan:</strong> Scanning for clinical cure statements, unverified guarantee words, or deceptive weight targets inside drafted outlines.
              </p>
              <p>
                <strong>Physical Attributes Lock:</strong> Auto critic parses generating images pixels matching colors, component quantities, and materials tags listed inside standard records.
              </p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

