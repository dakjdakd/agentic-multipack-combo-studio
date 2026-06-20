import { useState } from 'react';
import { 
  Activity, 
  Clock, 
  Cpu, 
  Database, 
  Terminal, 
  Tag, 
  DollarSign, 
  PieChart, 
  ArrowRight, 
  ChevronRight, 
  FileText, 
  Info,
  Sliders, 
  AlertTriangle 
} from 'lucide-react';
import { Product, TaskJob, TraceGroup, AgentStepTrace } from '../types';

interface AgentTraceViewProps {
  products: Product[];
  jobs: TaskJob[];
  traces: Record<string, TraceGroup>;
  selectedSku: string;
  setSelectedSku: (sku: string) => void;
  selectedJobId: string;
  setSelectedJobId: (jobId: string) => void;
}

export default function AgentTraceView({
  products,
  jobs,
  traces,
  selectedSku,
  setSelectedSku,
  selectedJobId,
  setSelectedJobId
}: AgentTraceViewProps) {
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);

  const fallbackJobId = selectedJobId || jobs[0]?.jobId || '';
  const activeTraceGroup = traces[fallbackJobId];
  const activeStep = activeTraceGroup?.steps[selectedStepIndex];

  // Calculate sum metrics for current trace group
  const totalLatencySec = activeTraceGroup 
    ? (activeTraceGroup.steps.reduce((acc, step) => acc + step.latencyMs, 0) / 1000).toFixed(2)
    : '0.00';
  const totalCostUsd = activeTraceGroup
    ? activeTraceGroup.steps.reduce((acc, step) => acc + step.estimatedCostUsd, 0).toFixed(3)
    : '0.000';
  const totalTokens = activeTraceGroup
    ? activeTraceGroup.steps.reduce((acc, step) => acc + step.inputTokens + step.outputTokens, 0).toLocaleString()
    : '0';

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* Title Header */}
      <div className="bg-[#EEF4F8] p-5 border-2 border-slate-900 rounded flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-mono tracking-tight uppercase">
            04 / COGNITIVE AGENT TRACE LOGS
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-mono">
            Audit runtime step variables, sub-agent micro-routines, tool calls, and model cost allocation sheets.
          </p>
        </div>

        {/* Job Trace Selector */}
        <div className="flex items-center gap-2 bg-white p-2 border-2 border-slate-900 rounded shadow-sm">
          <span className="text-[10px] font-mono font-bold text-slate-700 uppercase">JOB TRACE:</span>
          <select
            value={fallbackJobId}
            onChange={(e) => {
              const jobId = e.target.value;
              setSelectedJobId(jobId);
              const job = jobs.find((j) => j.jobId === jobId);
              if (job) setSelectedSku(job.sku);
              setSelectedStepIndex(0); // Reset index on SKU swap
            }}
            className="bg-slate-50 border border-slate-350 px-2 py-1 font-mono text-xs font-bold text-blue-900 rounded focus:outline-none focus:ring-1"
          >
            {jobs.map(job => (
              <option key={job.jobId} value={job.jobId}>{job.jobId} / {job.sku} / {job.workflowType}</option>
            ))}
          </select>
        </div>
      </div>

      {!activeTraceGroup ? (
        <div className="bg-white border-2 border-slate-900 p-16 text-center rounded font-mono text-xs text-slate-500">
          No trace yet for {selectedSku}. Generate a listing, multipack, or combo first, then return here to inspect the real backend trace.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left / Center timeline section: Span 2 */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Telemetry aggregate bar */}
            <div className="grid grid-cols-3 gap-3 bg-[#0B2545] p-4 text-white rounded border-2 border-slate-900 shadow font-mono">
              <div className="p-2 bg-[#134074] rounded border border-slate-800 text-center">
                <div className="text-[9px] text-[#A3BFD9] uppercase tracking-widest leading-none">Pipeline Latency</div>
                <div className="text-xl font-bold text-[#EEF4F8] mt-1.5 flex items-center justify-center gap-1">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  {totalLatencySec}s
                </div>
              </div>

              <div className="p-2 bg-[#134074] rounded border border-slate-800 text-center">
                <div className="text-[9px] text-[#A3BFD9] uppercase tracking-widest leading-none">Token Sequence</div>
                <div className="text-xl font-bold text-white mt-1.5 flex items-center justify-center gap-1">
                  <Cpu className="w-4 h-4 text-emerald-400 font-normal" />
                  {totalTokens}
                </div>
              </div>

              <div className="p-2 bg-[#134074] rounded border border-slate-800 text-center">
                <div className="text-[9px] text-[#A3BFD9] uppercase tracking-widest leading-none">Execution Cost</div>
                <div className="text-xl font-bold text-yellow-400 mt-1.5 flex items-center justify-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  RMB {(parseFloat(totalCostUsd) * 7.15).toFixed(3)}
                </div>
              </div>
            </div>

            {/* Timeline Steps Card */}
            <div className="bg-white border-2 border-slate-900 rounded p-4 shadow-sm space-y-4">
              <h3 className="font-mono font-bold text-slate-800 text-sm tracking-tight uppercase border-b pb-2.5">
                AGENT TRACE FLOW TIME-LINE
              </h3>

              <div className="relative pl-6 border-l-2 border-[#134074]/30 space-y-6 py-2">
                {activeTraceGroup.steps.map((step, idx) => {
                  const isSelected = selectedStepIndex === idx;
                  const stepNumber = `0${idx + 1}`;

                  return (
                    <div 
                      key={step.agentName} 
                      onClick={() => setSelectedStepIndex(idx)}
                      className={`relative p-3.5 border rounded cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-yellow-105 border-yellow-500 shadow-md ring-1 ring-yellow-400' 
                          : 'bg-slate-50 hover:bg-slate-100/70 border-slate-200'
                      }`}
                    >
                      {/* Left timeline dot indicator */}
                      <span className={`absolute -left-10 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center font-mono text-[9px] font-bold ${
                        isSelected 
                          ? 'bg-yellow-400 border-slate-900 text-slate-950' 
                          : 'bg-[#0B2545] border-slate-900 text-[#EEF4F8]'
                      }`}>
                        {stepNumber}
                      </span>

                      {/* Header details of step */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-2 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="bg-[#0B2545] text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                            {step.agentName} Agent
                          </span>
                          <span className="text-slate-400 text-xs">/</span>
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">
                            L: {step.latencyMs}ms
                          </span>
                        </div>
                        <div className="flex gap-3 text-[10px] text-slate-500">
                          <span>Tokens: {step.inputTokens + step.outputTokens}</span>
                          <span className="font-bold text-[#14532D]">RMB {(step.estimatedCostUsd * 7.15).toFixed(4)}</span>
                        </div>
                      </div>

                      {/* Body snippet */}
                      <p className="text-xs text-slate-700 font-mono line-clamp-2 leading-relaxed bg-white p-2 border border-slate-150 rounded">
                        <strong>Input context:</strong> {step.inputSummary}
                      </p>

                      {/* Tool Calls indicators list */}
                      {step.toolCalls.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
                          <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">Tools Dispatched:</span>
                          {step.toolCalls.map((t, tid) => (
                            <span key={tid} className="bg-slate-100 border border-slate-250 text-[#0B2545] text-[9px] font-mono px-2 py-0.5 rounded flex items-center gap-1 font-semibold">
                              <Terminal className="w-3 h-3 text-[#134074]" />
                              {t.name}()
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>

          </div>

          {/* Right Column: Step variables details drawer */}
          <div className="bg-white border-2 border-slate-900 rounded shadow-sm overflow-hidden flex flex-col">
            <div className="bg-[#0B2545] p-3 text-white flex justify-between items-center">
              <span className="font-mono text-xs font-bold tracking-wider uppercase flex items-center gap-2">
                <Sliders className="w-4 h-4 text-yellow-400" />
                TRACE TELEMETRY VIEWER
              </span>
              <span className="text-[10px] font-mono text-[#8DA9C4] bg-[#134074] px-2 py-0.5 rounded">
                0{selectedStepIndex + 1}
              </span>
            </div>

            {activeStep && <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
              {/* Variable metrics */}
              <div className="grid grid-cols-2 gap-2 border-b pb-3.5">
                <div className="p-2 bg-slate-50 rounded border border-slate-200">
                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Input Tokens</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">{activeStep.inputTokens}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-200">
                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Output Tokens</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">{activeStep.outputTokens}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-200">
                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Step Latency</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">{(activeStep.latencyMs/1000).toFixed(2)}s</span>
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-200">
                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Sub cost</span>
                  <span className="font-mono font-bold text-emerald-800 text-xs">RMB {(activeStep.estimatedCostUsd*7.15).toFixed(4)}</span>
                </div>
              </div>

              {/* Input details */}
              <div className="space-y-1">
                <h5 className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-blue-900" />
                  Primary prompt snippet sample
                </h5>
                <p className="bg-[#EEF4F8] text-slate-800 text-[10.5px] font-mono p-3 rounded leading-relaxed border border-blue-200 max-h-36 overflow-y-auto">
                  {activeStep.promptSnippet}
                </p>
              </div>

              {/* Tool outputs */}
              <div className="space-y-1">
                <h5 className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <Terminal className="w-3.5 h-3.5 text-indigo-800" />
                  Structured outputs / Tool artifacts
                </h5>
                <pre className="bg-slate-900 text-emerald-400 text-[9.5px] font-mono p-3 rounded overflow-x-auto leading-relaxed max-h-48 overflow-y-auto">
                  {activeStep.outputArtifact}
                </pre>
              </div>

              {/* Tool Calls schema list layout */}
              {activeStep.toolCalls.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                    Detailed micro-tool invocations
                  </h5>
                  <div className="space-y-1.5">
                    {activeStep.toolCalls.map((t, idx) => (
                      <div key={idx} className="p-2 bg-slate-50 border border-slate-250 rounded text-[10px] font-mono">
                        <div className="text-[#0B2545] font-bold">{t.name}()</div>
                        <div className="text-slate-500 mt-1 truncate">args: {t.input}</div>
                        <div className="text-slate-400 text-[9px] text-right mt-1 font-semibold">{t.durationMs}ms</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning reports */}
              {activeStep.warningsOrErrors && (
                <div className="bg-rose-50 border border-rose-250 p-3 rounded text-[10px] font-mono text-rose-800 flex items-start gap-1.5 line-height-normal">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Step flags:</strong> {activeStep.warningsOrErrors}
                  </div>
                </div>
              )}
            </div>}

            <div className="bg-slate-50 p-3 border-t font-mono text-center text-[10px] text-slate-400">
              Audit trails locked & calibrated.
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

