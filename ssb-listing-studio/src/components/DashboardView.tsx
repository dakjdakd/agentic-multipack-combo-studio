import { 
  PlusSquare, 
  Sparkles, 
  MessageCircle, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  TrendingUp, 
  PlaySquare, 
  AlertTriangle 
} from 'lucide-react';
import { Product, TaskJob } from '../types';

interface DashboardViewProps {
  products: Product[];
  jobs: TaskJob[];
  onGenerateSku: (sku: string) => void;
  onOpenChat: (sku: string) => void;
  onRunEval: () => void;
  onViewJobInTrace: (jobId: string) => void;
  totalSpent: number;
  pendingReviewsCount?: number;
  complianceRate?: number;
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
  complianceRate = 0
}: DashboardViewProps) {
  // Compute basic stats
  const availableSkusCount = products.length;
  const completedListingsCount = jobs.filter(j => j.status === 'completed').length;

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* Page Title Header */}
      <div className="bg-[#EEF4F8] p-5 border-2 border-slate-900 rounded flex justify-between items-center shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-mono tracking-tight uppercase">
            01 / OPERATIONAL OVERVIEW
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-mono">
            Central orchestration board tracking active pipeline queues and budget thresholds.
          </p>
        </div>
        <div className="bg-slate-900 text-yellow-400 text-xs px-3 py-1 font-mono rounded tracking-wider">
          LIVE STATUS: CALIBRATED
        </div>
      </div>

      {/* Grid of KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Card 1: Available SKUs */}
        <div className="bg-[#0B2545] text-white p-4 rounded border-2 border-slate-900 flex flex-col justify-between shadow">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono tracking-widest text-[#8DA9C4] uppercase">
              01 // INDEXED SKUS
            </span>
            <span className="bg-[#134074] text-[#EEF4F8] text-[9px] font-mono px-1.5 py-0.5 rounded">
              DB STATUS
            </span>
          </div>
          <div className="my-3">
            <span className="text-3xl font-extrabold font-mono text-[#EEF4F8]">{availableSkusCount}</span>
            <span className="text-xs font-mono ml-1 text-[#8DA9C4]">SKUs</span>
          </div>
          <p className="text-[10px] font-mono text-[#A3BFD9] border-t border-[#134074] pt-1.5">
            Synchronized with SSB data node.
          </p>
        </div>

        {/* Card 2: Generated Listings */}
        <div className="bg-[#F8F9FA] text-slate-900 p-4 rounded border-2 border-slate-900 flex flex-col justify-between shadow">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase col-span-2">
              02 // GENERATED COPIES
            </span>
            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-mono px-1.5 py-0.5 rounded font-bold">
              +100%
            </span>
          </div>
          <div className="my-3">
            <span className="text-3xl font-extrabold font-mono text-slate-900">{completedListingsCount}</span>
            <span className="text-xs font-mono ml-1 text-slate-500">LISTINGS</span>
          </div>
          <p className="text-[10px] font-[#5F7D95] font-mono border-t border-slate-300 pt-1.5">
            Active in active seller catalog.
          </p>
        </div>

        {/* Card 3: Pending Reviews */}
        <div className="bg-[#FCF6E5] text-slate-900 p-4 rounded border-2 border-slate-900 flex flex-col justify-between shadow">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono tracking-widest text-yellow-800 uppercase">
              03 // PENDING AUDIT
            </span>
            <span className="bg-yellow-400 text-slate-950 text-[9px] font-mono px-1.5 py-0.5 rounded font-bold">
              QUEUE_HTL
            </span>
          </div>
          <div className="my-3">
            <span className="text-3xl font-extrabold font-mono text-slate-900">{pendingReviewsCount}</span>
            <span className="text-xs font-mono ml-1 text-slate-500">ITEMS</span>
          </div>
          <p className="text-[10px] font-mono text-yellow-900 border-t border-yellow-300 pt-1.5">
            Human-in-the-loop screening needed.
          </p>
        </div>

        {/* Card 4: Estimated Cost */}
        <div className="bg-[#F8F9FA] text-slate-900 p-4 rounded border-2 border-slate-900 flex flex-col justify-between shadow">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
              04 // ESTIMATED SPENT
            </span>
            <span className="bg-slate-200 text-slate-800 text-[9px] font-mono px-1.5 py-0.5 rounded">
              CNY RMB </span>
          </div>
          <div className="my-3">
            <span className="text-2xl font-extrabold font-mono text-slate-900">RMB {totalSpent.toFixed(2)}</span>
            <span className="text-[10px] font-mono ml-1 text-slate-500">RMB</span>
          </div>
          <p className="text-[10px] font-[#5F7D95] font-mono border-t border-slate-300 pt-1.5">
            Target maximum: RMB 1,700.00
          </p>
        </div>

        {/* Card 5: Compliance Passed */}
        <div className="bg-[#EBF7EE] text-[#14532D] p-4 rounded border-2 border-slate-900 flex flex-col justify-between shadow">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono tracking-widest text-[#1B5E20] uppercase">
              05 // COMPLIANCE PASS
            </span>
            <span className="bg-emerald-200 text-emerald-950 text-[9px] font-mono px-1.5 py-0.5 rounded font-bold">
              ROBUST
            </span>
          </div>
          <div className="my-3">
            <span className="text-3xl font-extrabold font-mono text-emerald-900">{complianceRate.toFixed(1)}%</span>
          </div>
          <p className="text-[10px] font-mono text-[#2E7D32] border-t border-emerald-300 pt-1.5">
            FTC / Amazon regulations checked.
          </p>
        </div>
      </div>

      {/* Main Grid: Recent Tasks & Quick Launch Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Recent Jobs Table */}
        <div className="lg:col-span-2 bg-white border-2 border-slate-900 rounded p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3">
            <h3 className="font-mono font-bold text-slate-900 text-sm tracking-tight uppercase flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-600" />
              SYSTEM COMPILATION LOGS (RECENT PIPELINES)
            </h3>
            <span className="text-[11px] font-mono text-slate-500 uppercase">
              RELOADS ON OPERATION TRACE
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
                {jobs.map((job) => (
                  <tr 
                    key={job.jobId} 
                    className="hover:bg-slate-50 transition-all cursor-pointer text-slate-800"
                    onClick={() => onViewJobInTrace(job.jobId)}
                  >
                    <td className="py-3 px-3 font-bold text-blue-900 underline flex items-center gap-1.5">
                      {job.jobId}
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{job.sku}</td>
                    <td className="py-3 px-3 uppercase text-[10px]">
                      <span className={`px-2 py-0.5 rounded font-mono font-semibold ${
                        job.workflowType === 'listing' 
                          ? 'bg-[#EEF4F8] text-[#0B2545] border border-blue-200' 
                          : job.workflowType === 'multipack'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-orange-50 text-orange-750 border border-orange-250'
                      }`}>
                        {job.workflowType}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        job.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : job.status === 'pending' || job.status === 'running'
                          ? 'bg-yellow-50 text-yellow-700 animate-pulse'
                          : 'bg-rose-50 text-rose-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          job.status === 'completed' 
                            ? 'bg-emerald-500' 
                          : job.status === 'pending' || job.status === 'running' 
                            ? 'bg-yellow-500' 
                            : 'bg-rose-500'
                        }`} />
                        {job.status === 'completed' ? 'PASS' : job.status === 'pending' || job.status === 'running' ? 'QUEUE' : 'CRITICAL'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-700">
                      RMB {(job.cost * 7.15).toFixed(3)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-500 text-[10px]">
                      {job.time.split(' ')[1]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-[#EEF4F8] p-3 text-[11px] text-slate-600 rounded border border-slate-200 flex justify-between items-center">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Tip: Click any active Job ID to query its full trace graph directly in Agent Trace panel.
            </span>
          </div>
        </div>

        {/* Right Column: Quick Launch Action Console */}
        <div className="bg-white border-2 border-slate-900 rounded p-5 shadow-sm flex flex-col justify-between space-y-4">
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

            {/* Quick Sku List Dropdown / Trigger */}
            <div className="space-y-3">
              <div className="rounded p-3 bg-slate-50 border border-slate-200 space-y-2">
                <label className="block text-xs font-mono font-bold text-slate-800 uppercase">
                  Select Sku to dispatch Copywriter
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {products.map((p) => (
                    <button
                      key={p.sku}
                      onClick={() => onGenerateSku(p.sku)}
                      className="flex items-center justify-between p-2 pl-3 bg-white border hover:bg-slate-50 hover:border-blue-500 rounded text-left transition-colors cursor-pointer group"
                    >
                      <div className="font-mono text-xs">
                        <span className="font-bold text-slate-900">{p.sku}</span>
                        <div className="text-[10px] text-slate-500 line-clamp-1 w-48 leading-none mt-1">
                          {p.title}
                        </div>
                      </div>
                      <span className="bg-[#134074] text-white p-1 rounded group-hover:bg-blue-600">
                        <Sparkles className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action 2: Chat Recomposer */}
              <button
                onClick={() => onOpenChat(products[0]?.sku || '')}
                className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-[#0B2545] to-[#134074] hover:to-blue-850 text-white rounded font-mono text-xs border border-slate-900 font-bold tracking-wider transition-all cursor-pointer shadow-sm shadow-[#0B2545]/25"
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-yellow-400" />
                  <span>LAUNCH CHAT RECOMPOSER</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Action 3: Evaluation Suite */}
              <button
                onClick={onRunEval}
                className="w-full flex items-center justify-between p-3 bg-yellow-400 hover:bg-yellow-500 text-slate-950 rounded font-mono text-xs border border-slate-900 font-bold tracking-wider transition-all cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>RUN COMPLIANCE EVALUATION</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Compliance notice footer */}
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

