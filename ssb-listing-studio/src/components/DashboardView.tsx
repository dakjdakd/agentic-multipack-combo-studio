import { useEffect, useState } from 'react';
import {
  Sparkles,
  MessageCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  TrendingUp,
  PlaySquare,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Product, TaskJob } from '../types';

interface DashboardViewProps {
  products: Product[];
  jobs: TaskJob[];
  onGenerateSku: (sku: string) => Promise<void> | void;
  onOpenChat: (sku: string) => void;
  onRunEval: () => void;
  onViewJobInTrace: (jobId: string) => void;
  totalSpent: number;
  pendingReviewsCount?: number;
  complianceRate?: number;
  isLoading?: boolean;
}

export default function DashboardView({
  products,
  jobs,
  onGenerateSku,
  onOpenChat,
  onRunEval,
  onViewJobInTrace,
  totalSpent,
  pendingReviewsCount = 0,
  complianceRate = 0,
  isLoading = false,
}: DashboardViewProps) {
  const availableSkusCount = products.length;
  const completedListingsCount = jobs.filter((j) => j.status === 'completed').length;
  const runningJob = jobs.find((job) => job.status === 'running' || job.status === 'pending');
  const skeletonRows = Array.from({ length: 8 }, (_, index) => index);
  const skeletonSkuRows = Array.from({ length: 6 }, (_, index) => index);

  const launchGenerate = (sku: string) => {
    if (isLoading) return;
    void onGenerateSku(sku);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans" aria-busy={isLoading}>
      <div className="bg-[#EEF4F8] p-5 border-2 border-slate-900 rounded flex justify-between items-center shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-mono tracking-tight uppercase">
            01 / OPERATIONAL OVERVIEW
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-mono">
            Central orchestration board tracking active pipeline queues and budget thresholds.
          </p>
        </div>
        <div className="bg-slate-900 text-yellow-400 text-xs px-3 py-1 font-mono rounded tracking-wider inline-flex items-center gap-2">
          {isLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
          {isLoading ? 'LIVE SYNC: HANDSHAKE' : 'LIVE STATUS: CALIBRATED'}
        </div>
      </div>

      {isLoading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-950 rounded px-4 py-3 font-mono text-[11px] flex items-center justify-between shadow-sm dashboard-reveal">
          <span className="inline-flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-800" />
            Synchronizing SSB products, recent jobs, review queue, and budget ledger from live APIs.
          </span>
          <span className="hidden md:inline text-blue-700">Rendering calibrated view once data is ready</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-[#0B2545] text-white p-4 rounded border-2 border-slate-900 flex flex-col justify-between shadow dashboard-reveal" style={{ animationDelay: '40ms' }}>
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono tracking-widest text-[#8DA9C4] uppercase">01 // INDEXED SKUS</span>
            <span className="bg-[#134074] text-[#EEF4F8] text-[9px] font-mono px-1.5 py-0.5 rounded">DB STATUS</span>
          </div>
          <div className="my-3">
            {isLoading ? (
              <MetricSkeleton tone="dark" />
            ) : (
              <AnimatedNumber value={availableSkusCount} className="text-3xl font-extrabold font-mono text-[#EEF4F8]" />
            )}
            <span className="text-xs font-mono ml-1 text-[#8DA9C4]">SKUs</span>
          </div>
          <p className="text-[10px] font-mono text-[#A3BFD9] border-t border-[#134074] pt-1.5">
            {isLoading ? 'Opening read-only SSB data node.' : 'Synchronized with SSB data node.'}
          </p>
        </div>

        <div className="bg-[#F8F9FA] text-slate-900 p-4 rounded border-2 border-slate-900 flex flex-col justify-between shadow dashboard-reveal" style={{ animationDelay: '90ms' }}>
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase col-span-2">02 // GENERATED COPIES</span>
            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-mono px-1.5 py-0.5 rounded font-bold">+100%</span>
          </div>
          <div className="my-3">
            {isLoading ? (
              <MetricSkeleton />
            ) : (
              <AnimatedNumber value={completedListingsCount} className="text-3xl font-extrabold font-mono text-slate-900" />
            )}
            <span className="text-xs font-mono ml-1 text-slate-500">LISTINGS</span>
          </div>
          <p className="text-[10px] font-[#5F7D95] font-mono border-t border-slate-300 pt-1.5">
            {isLoading ? 'Reading local artifact catalog.' : 'Active in active seller catalog.'}
          </p>
        </div>

        <div className="bg-[#FCF6E5] text-slate-900 p-4 rounded border-2 border-slate-900 flex flex-col justify-between shadow dashboard-reveal" style={{ animationDelay: '140ms' }}>
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono tracking-widest text-yellow-800 uppercase">03 // PENDING AUDIT</span>
            <span className="bg-yellow-400 text-slate-950 text-[9px] font-mono px-1.5 py-0.5 rounded font-bold">QUEUE_HTL</span>
          </div>
          <div className="my-3">
            {isLoading ? (
              <MetricSkeleton />
            ) : (
              <AnimatedNumber value={pendingReviewsCount} className="text-3xl font-extrabold font-mono text-slate-900" />
            )}
            <span className="text-xs font-mono ml-1 text-slate-500">ITEMS</span>
          </div>
          <p className="text-[10px] font-mono text-yellow-900 border-t border-yellow-300 pt-1.5">
            {isLoading ? 'Checking human review queue.' : 'Human-in-the-loop screening needed.'}
          </p>
        </div>

        <div className="bg-[#F8F9FA] text-slate-900 p-4 rounded border-2 border-slate-900 flex flex-col justify-between shadow dashboard-reveal" style={{ animationDelay: '190ms' }}>
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">04 // ESTIMATED SPENT</span>
            <span className="bg-slate-200 text-slate-800 text-[9px] font-mono px-1.5 py-0.5 rounded">CNY RMB</span>
          </div>
          <div className="my-3">
            {isLoading ? (
              <MetricSkeleton width="w-28" />
            ) : (
              <AnimatedNumber value={totalSpent} precision={2} prefix="RMB " className="text-2xl font-extrabold font-mono text-slate-900" />
            )}
            <span className="text-[10px] font-mono ml-1 text-slate-500">RMB</span>
          </div>
          <p className="text-[10px] font-[#5F7D95] font-mono border-t border-slate-300 pt-1.5">Target maximum: RMB 1,700.00</p>
        </div>

        <div className="bg-[#EBF7EE] text-[#14532D] p-4 rounded border-2 border-slate-900 flex flex-col justify-between shadow dashboard-reveal" style={{ animationDelay: '240ms' }}>
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono tracking-widest text-[#1B5E20] uppercase">05 // COMPLIANCE PASS</span>
            <span className="bg-emerald-200 text-emerald-950 text-[9px] font-mono px-1.5 py-0.5 rounded font-bold">ROBUST</span>
          </div>
          <div className="my-3">
            {isLoading ? (
              <MetricSkeleton width="w-24" />
            ) : (
              <AnimatedNumber value={complianceRate} precision={1} suffix="%" className="text-3xl font-extrabold font-mono text-emerald-900" />
            )}
          </div>
          <p className="text-[10px] font-mono text-[#2E7D32] border-t border-emerald-300 pt-1.5">
            {isLoading ? 'Waiting for latest eval summary.' : 'FTC / Amazon regulations checked.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border-2 border-slate-900 rounded p-5 shadow-sm space-y-4 dashboard-reveal" style={{ animationDelay: '290ms' }}>
          <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3">
            <h3 className="font-mono font-bold text-slate-900 text-sm tracking-tight uppercase flex items-center gap-2">
              {isLoading ? <RefreshCw className="w-4 h-4 text-slate-600 animate-spin" /> : <Clock className="w-4 h-4 text-slate-600" />}
              SYSTEM COMPILATION LOGS (RECENT PIPELINES)
            </h3>
            <span className="text-[11px] font-mono text-slate-500 uppercase">
              {isLoading ? 'SYNCING LIVE OPERATION TRACE' : 'RELOADS ON OPERATION TRACE'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px] border-b border-slate-300">
                  <th className="py-2.5 px-3">Job ID</th>
                  <th className="py-2.5 px-3">Target SKU</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">State</th>
                  <th className="py-2.5 px-3 text-right">Cost (RMB )</th>
                  <th className="py-2.5 px-3 text-right">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading &&
                  skeletonRows.map((row) => (
                    <tr key={`job-skeleton-${row}`} className="text-slate-800">
                      <td className="py-3 px-3"><SkeletonLine className="w-28" /></td>
                      <td className="py-3 px-3"><SkeletonLine className="w-24" /></td>
                      <td className="py-3 px-3"><SkeletonLine className="w-16" /></td>
                      <td className="py-3 px-3"><SkeletonLine className="w-14" /></td>
                      <td className="py-3 px-3"><SkeletonLine className="w-20 ml-auto" /></td>
                      <td className="py-3 px-3"><SkeletonLine className="w-14 ml-auto" /></td>
                    </tr>
                  ))}

                {!isLoading &&
                  jobs.map((job) => (
                    <tr
                      key={job.jobId}
                      className="hover:bg-slate-50 transition-all cursor-pointer text-slate-800 data-row-enter"
                      onClick={() => onViewJobInTrace(job.jobId)}
                    >
                      <td className="py-3 px-3 font-bold text-blue-900 underline flex items-center gap-1.5">
                        {job.jobId}
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{job.sku}</td>
                      <td className="py-3 px-3 uppercase text-[10px]">
                        <span
                          className={`px-2 py-0.5 rounded font-mono font-semibold ${
                            job.workflowType === 'listing'
                              ? 'bg-[#EEF4F8] text-[#0B2545] border border-blue-200'
                              : job.workflowType === 'multipack'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-orange-50 text-orange-750 border border-orange-250'
                          }`}
                        >
                          {job.workflowType}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            job.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : job.status === 'pending' || job.status === 'running'
                                ? 'bg-yellow-50 text-yellow-700 animate-pulse'
                                : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              job.status === 'completed'
                                ? 'bg-emerald-500'
                                : job.status === 'pending' || job.status === 'running'
                                  ? 'bg-yellow-500'
                                  : 'bg-rose-500'
                            }`}
                          />
                          {job.status === 'completed' ? 'PASS' : job.status === 'pending' || job.status === 'running' ? 'QUEUE' : 'CRITICAL'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-700">RMB {(job.cost * 7.15).toFixed(3)}</td>
                      <td className="py-3 px-3 text-right text-slate-500 text-[10px]">{job.time.split(' ')[1]}</td>
                    </tr>
                  ))}

                {!isLoading && jobs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 px-3 text-center text-slate-500">
                      No pipeline jobs yet. Generate a listing or chat recomposition to populate the operation log.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-[#EEF4F8] p-3 text-[11px] text-slate-600 rounded border border-slate-200 flex justify-between items-center">
            <span className="flex items-center gap-1.5">
              {isLoading ? <RefreshCw className="w-3.5 h-3.5 text-blue-700 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              {isLoading ? 'Loading trace pointers from the backend before enabling drill-down.' : 'Tip: Click any active Job ID to query its full trace graph directly in Agent Trace panel.'}
            </span>
          </div>
        </div>

        <div className="bg-white border-2 border-slate-900 rounded p-5 shadow-sm flex flex-col justify-between space-y-4 dashboard-reveal" style={{ animationDelay: '340ms' }}>
          <div className="space-y-4">
            <div className="border-b-2 border-slate-100 pb-3">
              <h3 className="font-mono font-bold text-slate-900 text-sm tracking-tight uppercase flex items-center gap-2">
                <PlaySquare className="w-4 h-4 text-blue-900" />
                INTELLIGENT ACCELERATORS
              </h3>
              <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                Execute core pipeline agents sequentially using indexed sku buffers.
              </p>
            </div>

            <div className="space-y-3">
              <div className="rounded p-3 bg-slate-50 border border-slate-200 space-y-2">
                <label className="block text-xs font-mono font-bold text-slate-800 uppercase">
                  Select Sku to dispatch Copywriter
                </label>
                {runningJob && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-950 rounded px-3 py-2 font-mono text-[10px] leading-relaxed">
                    Live pipeline running for {runningJob.sku}. Open Listing Studio or Agent Trace to watch progress.
                  </div>
                )}
                <div className="grid grid-cols-1 gap-2">
                  {isLoading &&
                    skeletonSkuRows.map((row) => (
                      <div key={`sku-skeleton-${row}`} className="flex items-center justify-between p-2 pl-3 bg-white border border-slate-200 rounded">
                        <div className="space-y-1.5">
                          <SkeletonLine className="w-28" />
                          <SkeletonLine className="w-48 h-2" />
                        </div>
                        <span className="bg-slate-200 text-white p-1 rounded">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-500" />
                        </span>
                      </div>
                    ))}

                  {!isLoading &&
                    products.map((p) => (
                      <button
                        key={p.sku}
                        disabled={!!runningJob}
                        onClick={() => launchGenerate(p.sku)}
                        className="flex items-center justify-between p-2 pl-3 bg-white border hover:bg-slate-50 hover:border-blue-500 rounded text-left transition-colors cursor-pointer group disabled:opacity-60 disabled:cursor-wait disabled:hover:border-slate-200 data-row-enter"
                      >
                        <div className="font-mono text-xs">
                          <span className="font-bold text-slate-900">{p.sku}</span>
                          <div className="text-[10px] text-slate-500 line-clamp-1 w-48 leading-none mt-1">{p.title}</div>
                        </div>
                        <span className="bg-[#134074] text-white p-1 rounded group-hover:bg-blue-600">
                          {runningJob?.sku === p.sku ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        </span>
                      </button>
                    ))}

                  {!isLoading && products.length === 0 && (
                    <div className="bg-white border border-slate-200 rounded p-3 font-mono text-[11px] text-slate-500">
                      No SKUs loaded yet. Check Settings provider status, then reload the dashboard.
                    </div>
                  )}
                </div>
              </div>

              <button
                disabled={isLoading || products.length === 0}
                onClick={() => onOpenChat(products[0]?.sku || '')}
                className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-[#0B2545] to-[#134074] hover:to-blue-850 text-white rounded font-mono text-xs border border-slate-900 font-bold tracking-wider transition-all cursor-pointer shadow-sm shadow-[#0B2545]/25 disabled:opacity-60 disabled:cursor-wait"
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-yellow-400" />
                  <span>{isLoading ? 'WAITING FOR SKU INDEX' : 'LAUNCH CHAT RECOMPOSER'}</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                disabled={isLoading}
                onClick={onRunEval}
                className="w-full flex items-center justify-between p-3 bg-yellow-400 hover:bg-yellow-500 text-slate-950 rounded font-mono text-xs border border-slate-900 font-bold tracking-wider transition-all cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-wait"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>{isLoading ? 'WAITING FOR COST LEDGER' : 'RUN COMPLIANCE EVALUATION'}</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-[#FCF6E5] p-3 text-[11px] text-slate-800 rounded border border-yellow-250 flex items-start gap-1.5 leading-snug">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="font-mono">
              <strong>Compliance Notice:</strong> Pre-generation rules mandate scanning SKU specifications for medical phrasing before drafting bullet copy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnimatedNumber({
  value,
  precision = 0,
  prefix = '',
  suffix = '',
  className = '',
}: {
  value: number;
  precision?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let frame = 0;
    const start = displayValue;
    const delta = value - start;
    const startedAt = performance.now();
    const duration = 650;

    if (Math.abs(delta) < 0.001) {
      setDisplayValue(value);
      return undefined;
    }

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(start + delta * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span className={className}>
      {prefix}
      {displayValue.toFixed(precision)}
      {suffix}
    </span>
  );
}

function MetricSkeleton({ tone = 'light', width = 'w-16' }: { tone?: 'light' | 'dark'; width?: string }) {
  const color = tone === 'dark' ? 'bg-[#8DA9C4]/40' : 'bg-slate-300';
  return <span className={`inline-block h-9 ${width} ${color} rounded animate-pulse align-middle`} />;
}

function SkeletonLine({ className = '' }: { className?: string }) {
  return <span className={`block h-3 rounded bg-slate-200 animate-pulse ${className}`} />;
}
