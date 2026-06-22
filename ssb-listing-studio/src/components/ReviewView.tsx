import { useState } from 'react';
import { 
  ClipboardCheck, 
  Check, 
  AlertOctagon, 
  ArrowRight, 
  History, 
  ThumbsUp, 
  ThumbsDown, 
  Eye, 
  HeartCrack, 
  ShieldAlert, 
  Camera, 
  Binary, 
  RefreshCw 
} from 'lucide-react';
import { ReviewItem, AmazonListing } from '../types';

interface ReviewViewProps {
  reviews: ReviewItem[];
  onApproveReview: (id: string) => Promise<void> | void;
  onRejectReview: (id: string) => Promise<void> | void;
  onRequestRevision: (id: string, notes: string) => Promise<void> | void;
}

export default function ReviewView({
  reviews,
  onApproveReview,
  onRejectReview,
  onRequestRevision
}: ReviewViewProps) {
  const [selectedReviewId, setSelectedReviewId] = useState<string>(reviews[0]?.id || '');
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [pendingDecision, setPendingDecision] = useState<'approve' | 'reject' | 'revision' | null>(null);
  const [decisionMessage, setDecisionMessage] = useState('');
  const [decisionError, setDecisionError] = useState('');

  const activeReviewItem = reviews.find(r => r.id === selectedReviewId) || reviews[0];

  const handleApplyApprove = async () => {
    if (!activeReviewItem) return;
    if (pendingDecision) return;
    setPendingDecision('approve');
    setDecisionError('');
    setDecisionMessage('Saving approval and refreshing review queue...');
    try {
      await onApproveReview(activeReviewItem.id);
      setDecisionMessage('Approval saved. Review queue and cost summary were refreshed.');
    } catch (err) {
      setDecisionError((err as Error).message || 'Approve failed.');
      setDecisionMessage('');
    } finally {
      setPendingDecision(null);
    }
  };

  const handleApplyReject = async () => {
    if (!activeReviewItem) return;
    if (pendingDecision) return;
    setPendingDecision('reject');
    setDecisionError('');
    setDecisionMessage('Saving rejection and refreshing review queue...');
    try {
      await onRejectReview(activeReviewItem.id);
      setDecisionMessage('Rejection saved. Review queue and cost summary were refreshed.');
    } catch (err) {
      setDecisionError((err as Error).message || 'Reject failed.');
      setDecisionMessage('');
    } finally {
      setPendingDecision(null);
    }
  };

  const handleApplyRequestRevision = async () => {
    if (!activeReviewItem || !revisionFeedback.trim()) return;
    if (pendingDecision) return;
    const notes = revisionFeedback;
    setPendingDecision('revision');
    setDecisionError('');
    setDecisionMessage('Saving revision request and refreshing review queue...');
    try {
      await onRequestRevision(activeReviewItem.id, notes);
      setRevisionFeedback('');
      setDecisionMessage('Revision request saved. Review queue and cost summary were refreshed.');
    } catch (err) {
      setDecisionError((err as Error).message || 'Revision request failed.');
      setDecisionMessage('');
    } finally {
      setPendingDecision(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      
      {/* Page Title */}
      <div className="bg-[#EEF4F8] p-5 border-2 border-slate-900 rounded flex justify-between items-center shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-mono tracking-tight uppercase">
            06 / HUMAN-IN-THE-LOOP REVIEW
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-mono">
            Execute professional audits, examine differences in text structures, inspect physical components verification reports.
          </p>
        </div>
        <div className="bg-slate-900 text-yellow-400 text-[10px] font-mono px-3 py-1.5 rounded tracking-wide uppercase flex items-center gap-1.5">
          <ClipboardCheck className="w-4 h-4" />
          AUDIT QUEUE: {reviews.filter(r => r.status === 'pending').length} ACTIVE
        </div>
      </div>

      {/* Review Workflow Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: List of items awaiting screening */}
        <div className="bg-white border-2 border-slate-900 rounded shadow-sm overflow-hidden flex flex-col">
          <div className="bg-slate-150 p-3 border-b-2 border-slate-300 flex justify-between items-center font-mono text-xs font-bold text-slate-700">
            <span>Review Queue Checklist</span>
            <span className="font-mono text-[9px] text-slate-400">SELECT TO INSPECT DATA DIFFS</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
            {reviews.map((item) => {
              const isActive = selectedReviewId === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedReviewId(item.id)}
                  className={`p-3.5 cursor-pointer transition-colors hover:bg-slate-50 font-mono text-xs ${
                    isActive ? 'bg-yellow-100/40 border-l-4 border-yellow-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-bold text-indigo-905">{item.id}</span>
                    <span className={`px-2 py-0.2 uppercase text-[9px] font-extrabold rounded ${
                      item.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : item.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.status === 'rejected'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-indigo-100 text-indigo-805'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-[11px] mb-1 truncate">
                    SKU: {item.sku} ({item.workflowType})
                  </div>
                  <div className="text-[10px] text-slate-400 flex justify-between">
                    <span>Date: {item.requestDate.split(' ')[1]}</span>
                    <span className="font-semibold text-slate-700">Score: {item.generatedListing.score}/100</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Section (Span 2): Full Comparative Diff Panel */}
        {activeReviewItem && (
          <div className="lg:col-span-2 space-y-6">
            
            {/* Diff Layout Display */}
            <div className="bg-white border-2 border-slate-900 rounded shadow-sm overflow-hidden">
              <div className="bg-[#0B2545] p-3 text-white flex justify-between items-center font-mono text-xs font-bold uppercase">
                <span>Side-by-Side Copywriter Diff ({activeReviewItem.id})</span>
                <span className="text-[10px] text-yellow-400">Target SKU: {activeReviewItem.sku}</span>
              </div>

              <div className="p-4 space-y-4">
                
                {/* Before vs. After Segment */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Before */}
                  <div className="border border-slate-200 rounded overflow-hidden">
                    <div className="bg-slate-150 p-2 text-[10px] font-mono font-bold text-slate-600 border-b uppercase">
                      Legacy / Raw Product Copy
                    </div>
                    <div className="p-3 bg-slate-50 min-h-36 max-h-56 overflow-y-auto space-y-2 text-[11px] font-mono text-slate-500 leading-relaxed">
                      {activeReviewItem.originalListing ? (
                        <>
                          <div className="font-bold pb-2 border-b text-[#0B2545]">{activeReviewItem.originalListing.title}</div>
                          <div className="space-y-1 pt-1 text-slate-500">
                            {activeReviewItem.originalListing.bullets.map((b, i) => (
                              <div key={i} className="line-clamp-2">■ {b}</div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-slate-400 italic">No legacy data found. Fresh compilation pipeline launch.</p>
                      )}
                    </div>
                  </div>

                  {/* After */}
                  <div className="border border-emerald-300 rounded overflow-hidden ring-1 ring-emerald-100">
                    <div className="bg-[#EBF7EE] p-2 text-[10px] font-mono font-bold text-emerald-800 border-b border-emerald-250 uppercase flex justify-between items-center">
                      <span>Compiled Copy Blueprint</span>
                      <span className="bg-emerald-600 text-white text-[9px] px-1 py-0.2 font-bold uppercase">
                        + Optimized
                      </span>
                    </div>
                    <div className="p-3 bg-white min-h-36 max-h-56 overflow-y-auto space-y-2 text-[11px] font-mono leading-relaxed">
                      <div className="font-bold pb-2 border-b text-indigo-950 bg-yellow-50/50 p-1 rounded-sm">{activeReviewItem.generatedListing.title}</div>
                      <div className="space-y-1.5 pt-1 text-slate-800">
                        {activeReviewItem.generatedListing.bullets.map((b, i) => (
                          <div key={i} className="border-b border-dashed border-slate-100 pb-1 font-semibold text-slate-900">
                            <span className="text-emerald-600 font-bold">✓</span> {b}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compliance Report lists */}
                <div className="border border-slate-250 rounded overflow-hidden shadow-xs font-mono text-xs">
                  <div className="bg-slate-100 p-2.5 border-b border-slate-350 font-bold text-slate-800 uppercase flex items-center gap-1.5">
                    <Binary className="w-4 h-4 text-[#134074]" />
                    Physical Attribute Diff
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-white">
                    <div className="p-2 bg-slate-50 border rounded">
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest block">Unit Count</span>
                      <strong>{activeReviewItem.generatedListing.physicalAttributes?.unitCount ?? 'unknown'}</strong>
                    </div>
                    <div className="p-2 bg-slate-50 border rounded">
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest block">Weight</span>
                      <strong>{activeReviewItem.generatedListing.physicalAttributes?.weight?.value ?? 'unknown'} {activeReviewItem.generatedListing.physicalAttributes?.weight?.unit ?? ''}</strong>
                    </div>
                    <div className="p-2 bg-slate-50 border rounded">
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest block">Dimensions</span>
                      <strong>
                        {activeReviewItem.generatedListing.physicalAttributes?.dimensions?.length ?? 'unknown'} x {activeReviewItem.generatedListing.physicalAttributes?.dimensions?.width ?? 'unknown'} x {activeReviewItem.generatedListing.physicalAttributes?.dimensions?.height ?? 'unknown'} {activeReviewItem.generatedListing.physicalAttributes?.dimensions?.unit ?? ''}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Compliance Report lists */}
                <div className="border border-slate-250 rounded overflow-hidden shadow-xs font-mono text-xs">
                  <div className="bg-slate-100 p-2.5 border-b border-slate-350 font-bold text-slate-800 uppercase flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-[#134074]" />
                    Regulatory & Compliance Audit Scan ({activeReviewItem.complianceReport.length} Checked)
                  </div>
                  <div className="divide-y divide-slate-200">
                    {activeReviewItem.complianceReport.map((rep) => (
                      <div key={rep.id} className="p-2.5 flex justify-between items-center bg-slate-50/50 hover:bg-slate-50">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800 block">{rep.rule}</span>
                          <span className="text-[10px] text-slate-500">Limits constraint: {rep.expectedLimit}</span>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <span className="text-[11px] text-slate-600">Actual: {rep.observedValue}</span>
                          <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                            rep.status === 'passed'
                              ? 'bg-emerald-50 text-emerald-800'
                              : rep.status === 'warning'
                              ? 'bg-yellow-55 text-amber-900 text-yellow-900'
                              : 'bg-rose-50 text-rose-800'
                          }`}>
                            {rep.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Physical Consistency Report */}
                <div className="border border-slate-250 rounded overflow-hidden shadow-xs font-mono text-xs">
                  <div className="bg-slate-100 p-2.5 border-b border-slate-350 font-bold text-slate-800 uppercase flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-[#134074]" />
                    Visual Asset vs. Attribute Consistency Verification
                  </div>
                  <div className="p-3 bg-[#EEF4F8]/40 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-2 bg-white rounded border">
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest block">Color Alignment</span>
                      <strong className="text-slate-800 text-[10.5px]">Expected: {activeReviewItem.physicalConsistency.expectedColor}</strong>
                      <div className="text-[10px] text-slate-500 mt-1">Observed: {activeReviewItem.physicalConsistency.observedColorInImage}</div>
                    </div>
                    <div className="p-2 bg-white rounded border">
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest block">Material Integrity</span>
                      <strong className="text-slate-800 text-[10.5px]">Expected: {activeReviewItem.physicalConsistency.expectedMaterial}</strong>
                      <div className="text-[10px] text-slate-500 mt-1">Observed: {activeReviewItem.physicalConsistency.observedMaterialInImage}</div>
                    </div>
                    <div className="p-2 bg-white rounded border">
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest block">Unit Counter Check</span>
                      <strong className="text-slate-800 text-[10.5px]">Expected Qty: {activeReviewItem.physicalConsistency.expectedUnitCount}</strong>
                      <div className="text-[10px] text-slate-505 mt-1 font-bold text-emerald-700">Observed: {activeReviewItem.physicalConsistency.observedUnitCountInImage} units</div>
                    </div>
                  </div>
                  <div className="p-3 bg-[#F8F9FA] border-t leading-relaxed text-[11px] text-slate-750 flex items-start gap-1.5 border-slate-200">
                    <AlertOctagon className="w-3.5 h-3.5 text-[#134074] shrink-0 mt-0.5" />
                    <div>
                      <strong>Audit Critic Verdict:</strong> {activeReviewItem.physicalConsistency.imageCriticVerdict}
                    </div>
                  </div>
                </div>

                {/* Revision Notes display if requested before */}
                {activeReviewItem.status === 'revision-requested' && activeReviewItem.revisionNotes && (
                  <div className="bg-yellow-50 border border-yellow-250 p-3 rounded font-mono text-xs text-yellow-900 border-l-4 border-l-yellow-600 leading-relaxed">
                    <strong>Historic Audit Notes / Required Revision directives:</strong>
                    <p className="mt-1">{activeReviewItem.revisionNotes}</p>
                  </div>
                )}

              </div>

              {/* Lower Decision Console */}
              <div className="bg-slate-50 p-4 border-t-2 border-slate-900 flex flex-col md:flex-row justify-between items-center gap-3">
                
                {/* Revision request form inline input */}
                <div className="flex gap-2 w-full md:w-3/5 font-mono">
                  <input
                    type="text"
                    placeholder="Enter details on why this listing is rejected or needs revision..."
                    value={revisionFeedback}
                    onChange={(e) => setRevisionFeedback(e.target.value)}
                    disabled={!!pendingDecision}
                    className="w-full text-xs p-2.5 bg-white border border-slate-350 rounded focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                  />
                  <button
                    disabled={!!pendingDecision || !revisionFeedback.trim()}
                    onClick={() => void handleApplyRequestRevision()}
                    className="bg-[#0B2545] hover:bg-slate-950 text-white font-mono font-bold text-xs px-3 rounded uppercase shrink-0 cursor-pointer transition-colors disabled:bg-slate-400 disabled:cursor-wait"
                  >
                    {pendingDecision === 'revision' ? 'Saving...' : 'Send Revision Notes'}
                  </button>
                </div>

                {/* Approve / Reject primary buttons */}
                <div className="flex gap-2 w-full md:w-auto font-mono text-xs">
                  <button
                    disabled={!!pendingDecision}
                    onClick={() => void handleApplyReject()}
                    className="w-1/2 md:w-auto px-4 py-2.5 bg-rose-50 text-rose-800 border-2 border-rose-600 font-bold hover:bg-rose-100 uppercase rounded cursor-pointer flex items-center justify-center gap-1 disabled:opacity-60 disabled:cursor-wait"
                  >
                    {pendingDecision === 'reject' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ThumbsDown className="w-3.5 h-3.5" />}
                    {pendingDecision === 'reject' ? 'Saving...' : 'Reject'}
                  </button>
                  <button
                    disabled={!!pendingDecision}
                    onClick={() => void handleApplyApprove()}
                    className="w-1/2 md:w-auto px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-bold border-2 border-slate-900 uppercase rounded cursor-pointer flex items-center justify-center gap-1 shadow-sm disabled:opacity-60 disabled:cursor-wait"
                  >
                    {pendingDecision === 'approve' ? <RefreshCw className="w-3.5 h-3.5 text-slate-950 animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5 text-slate-950 font-semibold" />}
                    {pendingDecision === 'approve' ? 'Saving...' : 'APPROVE COPY'}
                  </button>
                </div>

              </div>
              {(decisionMessage || decisionError) && (
                <div className={`px-4 py-2 border-t font-mono text-[10px] leading-relaxed ${
                  decisionError ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-blue-50 border-blue-200 text-blue-950'
                }`}>
                  {decisionError || decisionMessage}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
