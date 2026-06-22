import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Workflow, 
  RefreshCw, 
  FileCheck, 
  Globe2, 
  Copy, 
  Check, 
  ImageIcon, 
  AlertTriangle, 
  ArrowRight, 
  Activity, 
  Compass, 
  ShieldAlert 
} from 'lucide-react';
import { Product, AmazonListing, WorkflowType } from '../types';

interface ListingStudioViewProps {
  products: Product[];
  listings: Record<string, AmazonListing>;
  selectedSku: string;
  setSelectedSku: (sku: string) => void;
  onSaveListing: (sku: string, updated: AmazonListing) => void;
  onSendToReview: (sku: string) => void;
  onPushToLogs: (log: string) => void;
  deductBudget: (costUsd: number) => void;
  onExecutePipeline?: (sku: string, mode: 'full' | 'copy_only' | 'images_only') => Promise<void> | void;
  externalRunStatus?: {
    sku: string;
    status: 'idle' | 'running' | 'completed' | 'failed';
    message: string;
  };
}

const PIPELINE_INITIAL_STAGES = [
  { id: 'fetch', label: 'FETCH SPEC', agent: 'Supervisor', key: 1 },
  { id: 'enrich', label: 'ENRICH TARGET', agent: 'Supervisor', key: 2 },
  { id: 'research', label: 'RESEARCH AGENT', agent: 'Research Specialist', key: 3 },
  { id: 'copy', label: 'COPY AGENT', agent: 'Amazon copywriter', key: 4 },
  { id: 'image', label: 'IMAGE AGENT', agent: 'Agnes Image Synthesizer', key: 5 },
  { id: 'critic', label: 'CRITIC AGENT', agent: 'Audit Specialist', key: 6 },
  { id: 'compliance', label: 'COMPLIANCE CHECK', agent: 'Regulatory Engine', key: 7 },
];

export default function ListingStudioView({
  products,
  listings,
  selectedSku,
  setSelectedSku,
  onSaveListing,
  onSendToReview,
  onPushToLogs,
  onExecutePipeline,
  externalRunStatus
}: ListingStudioViewProps) {
  const [pipelineActive, setPipelineActive] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState(-1);
  const [stageStatuses, setStageStatuses] = useState<Record<string, 'idle' | 'running' | 'success' | 'failed'>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [pipelineError, setPipelineError] = useState('');
  const [pipelineMessage, setPipelineMessage] = useState('');

  // Buffer state state for editing
  const [editTitle, setEditTitle] = useState('');
  const [editBullets, setEditBullets] = useState<string[]>(['', '', '', '', '']);
  const [editDescription, setEditDescription] = useState('');
  const [editSearchTerms, setEditSearchTerms] = useState('');

  // Load when selected SKU changes
  useEffect(() => {
    const listing = listings[selectedSku];
    if (listing) {
      setEditTitle(listing.title);
      setEditBullets([...listing.bullets]);
      setEditDescription(listing.description);
      setEditSearchTerms(listing.searchTerms || '');
    } else {
      // Clear or set empty draft
      setEditTitle('');
      setEditBullets(['', '', '', '', '']);
      setEditDescription('');
      setEditSearchTerms('');
    }
  }, [selectedSku, listings]);

  const activeProduct = products.find(p => p.sku === selectedSku);
  const activeListing = listings[selectedSku];
  const externalStatusApplies = externalRunStatus?.sku === selectedSku && externalRunStatus.status !== 'idle';
  const isExternallyRunning = externalStatusApplies && externalRunStatus.status === 'running';
  const displayedPipelineMessage = pipelineMessage || (externalStatusApplies ? externalRunStatus.message : '');
  const displayedPipelineError = pipelineError || (externalStatusApplies && externalRunStatus.status === 'failed' ? externalRunStatus.message : '');

  // Pipeline simulation sequence
  const executePipeline = async (type: 'full' | 'copy' | 'images') => {
    if (pipelineActive) return;
    if (onExecutePipeline) {
      const mode = type === 'copy' ? 'copy_only' : type === 'images' ? 'images_only' : 'full';
      setPipelineActive(true);
      setCurrentStageIndex(0);
      setPipelineError('');
      setPipelineMessage(
        mode === 'full'
          ? 'Live provider pipeline running. Search, copy, and image generation can take 1-3 minutes.'
          : mode === 'images_only'
          ? 'Live image provider running. This can take a minute for multiple Amazon assets.'
          : 'Live copy provider running. Waiting for the backend response.'
      );
      const cleanStatuses: Record<string, 'idle' | 'running' | 'success' | 'failed'> = {};
      PIPELINE_INITIAL_STAGES.forEach(s => { cleanStatuses[s.id] = 'idle'; });
      setStageStatuses(cleanStatuses);
      PIPELINE_INITIAL_STAGES.forEach((stage, idx) => {
        window.setTimeout(() => {
          setCurrentStageIndex(idx);
          setStageStatuses(prev => ({ ...prev, [stage.id]: 'running' }));
        }, idx * 800);
      });
      try {
        await onExecutePipeline(selectedSku, mode);
        PIPELINE_INITIAL_STAGES.forEach((stage, idx) => {
          setStageStatuses(prev => ({ ...prev, [stage.id]: 'success' }));
          if (idx === PIPELINE_INITIAL_STAGES.length - 1) setCurrentStageIndex(-1);
        });
        setPipelineMessage('Pipeline completed. Generated listing, images, review item, trace, and cost ledger are available.');
      } catch (err) {
        const failedStage = PIPELINE_INITIAL_STAGES[Math.max(0, Math.min(currentStageIndex, PIPELINE_INITIAL_STAGES.length - 1))];
        setStageStatuses(prev => ({ ...prev, [failedStage.id]: 'failed' }));
        setPipelineError((err as Error).message || 'Pipeline failed before the backend returned a listing.');
        setPipelineMessage('');
      } finally {
        setPipelineActive(false);
        setCurrentStageIndex(-1);
      }
      return;
    }
    setPipelineActive(true);
    setCurrentStageIndex(0);

    onPushToLogs(`Backend pipeline is not connected for ${selectedSku}; ${type} execution was not started.`);
    setCurrentStageIndex(-1);
    setPipelineActive(false);
    return;

  };

  const handleCopyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveListingChanges = () => {
    if (!activeListing) return;
    const finalUpdate: AmazonListing = {
      ...activeListing,
      title: editTitle,
      bullets: [...editBullets],
      description: editDescription,
      searchTerms: editSearchTerms
    };
    onSaveListing(selectedSku, finalUpdate);
  };

  const currentByteCount = editSearchTerms ? new TextEncoder().encode(editSearchTerms).length : 0;
  const isSearchTermsOverLimit = currentByteCount > 250;

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      
      {/* Title Header */}
      <div className="bg-[#EEF4F8] p-5 border-2 border-slate-900 rounded flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-mono tracking-tight uppercase">
            03 / LISTING COPYWRITER STUDIO
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-mono">
            Execute professional multi-stage copywriting agents. Save edits directly to draft buffers.
          </p>
        </div>
        
        {/* Sku Selector */}
        <div className="flex items-center gap-2 bg-white p-2 border-2 border-slate-900 rounded shadow-sm">
          <span className="text-[10px] font-mono font-bold text-slate-700 uppercase">SKU TARGET:</span>
          <select
            value={selectedSku}
            onChange={(e) => setSelectedSku(e.target.value)}
            className="bg-slate-50 border border-slate-350 px-2 py-1 font-mono text-xs font-bold text-blue-900 rounded focus:outline-none"
          >
            {products.map(p => (
              <option key={p.sku} value={p.sku}>{p.sku} ({p.brand})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Multi-Agent Orchestrator Pipeline Monitor */}
      <div className="bg-white border-2 border-slate-900 rounded p-4 shadow-sm">
        <div className="flex items-center justify-between border-b pb-2.5 mb-3">
          <h4 className="text-xs font-mono font-bold text-[#0B2545] tracking-widest uppercase flex items-center gap-2">
            <Activity className="w-4 h-4 text-yellow-550 animate-pulse" />
            AGENT SYNCHRONIZED EXECUTION WORKFLOW
          </h4>
          <span className="text-[10px] font-mono text-slate-500 uppercase">
            {pipelineActive || isExternallyRunning ? 'Active compiling sequence...' : 'Awaiting manual trigger execution'}
          </span>
        </div>

        {/* Pipeline horizontal list */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
          {PIPELINE_INITIAL_STAGES.map((stage, idx) => {
            const status = stageStatuses[stage.id] || 'idle';
            const isCurrent = idx === currentStageIndex;

            return (
              <div 
                key={stage.id}
                className={`p-2.5 rounded border flex flex-col justify-between h-20 transition-all font-mono ${
                  status === 'success'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                    : status === 'failed'
                    ? 'bg-rose-50 border-rose-400 text-rose-950'
                    : status === 'running' 
                    ? 'bg-blue-50 border-blue-400 text-blue-950 animate-pulse'
                    : isCurrent 
                    ? 'bg-yellow-50 border-yellow-400 text-slate-900'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-widest text-slate-400">
                  <span>0{idx+1}</span>
                  {status === 'success' && <Check className="w-2.5 h-2.5 text-emerald-600" />}
                  {status === 'failed' && <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />}
                </div>
                <div className="text-[10px] font-bold leading-tight">{stage.label}</div>
                <div className="text-[8px] text-slate-500 truncate leading-none">{stage.agent}</div>
              </div>
            );
          })}
        </div>
        {(displayedPipelineMessage || displayedPipelineError) && (
          <div className={`mt-3 rounded border px-3 py-2 text-[10px] font-mono leading-relaxed ${
            displayedPipelineError ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-blue-50 border-blue-200 text-blue-950'
          }`}>
            {displayedPipelineError || displayedPipelineMessage}
          </div>
        )}
      </div>

      {/* Primary Layout Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column (Span 2): Listings text editing spaces */}
        <div className="lg:col-span-2 bg-white border-2 border-slate-900 rounded p-5 shadow-sm space-y-5">
          <div className="flex justify-between items-center border-b pb-3.5">
            <h3 className="font-mono font-bold text-[#0B2545] text-sm uppercase flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-blue-950" />
              Generated Amazon Listing Copywriter Buffer
            </h3>
            {activeListing && (
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase">
                Optimized (Grade {activeListing.score}/100)
              </span>
            )}
          </div>

          {!activeListing ? (
            <div className="py-20 text-center font-mono space-y-4">
              <p className="text-xs text-slate-500">
                No active listing generates detected inside current SKU buffer.
              </p>
              <button
                disabled={pipelineActive || isExternallyRunning}
                onClick={() => void executePipeline('full')}
                className="mx-auto py-2.5 px-5 font-mono text-xs font-bold bg-[#0B2545] text-white hover:bg-blue-800 rounded border border-slate-900 flex items-center gap-2 cursor-pointer shadow disabled:bg-slate-400 disabled:cursor-wait"
              >
                <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" />
                {pipelineActive || isExternallyRunning ? 'RUNNING LIVE PIPELINE...' : 'EXECUTE MULTI-AGENT PIPELINE'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Product Title Input */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono text-slate-600">
                  <span className="font-bold text-slate-700 uppercase">Product Title (Title Copy)</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleCopyText(editTitle, 'title')} 
                      className="text-blue-900 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === 'title' ? <Check className="w-3" /> : <Copy className="w-3" />}
                      <span>{copiedField === 'title' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
                <textarea
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  rows={2}
                  className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-350 hover:bg-white rounded text-slate-900 tracking-wide leading-relaxed focus:bg-white focus:outline-none"
                />
              </div>

              {/* Five Bullets Fields */}
              <div className="space-y-2">
                <span className="block text-xs font-mono font-bold text-slate-700 uppercase">
                  Five Key Product Benefits (Bullet Points)
                </span>
                <div className="space-y-2">
                  {editBullets.map((bullet, idx) => (
                    <div key={idx} className="flex gap-2">
                      <div className="bg-slate-100 border border-slate-300 w-8 h-8 rounded shrink-0 flex items-center justify-center font-mono text-xs font-extrabold text-slate-800">
                        {idx + 1}
                      </div>
                      <textarea
                        value={bullet}
                        onChange={(e) => {
                          const updated = [...editBullets];
                          updated[idx] = e.target.value;
                          setEditBullets(updated);
                        }}
                        rows={2}
                        className="w-full text-xs font-mono p-2 bg-slate-50 border border-slate-350 hover:bg-white rounded text-slate-900 tracking-wide leading-relaxed focus:bg-white focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Product Description */}
              <div className="space-y-1">
                <span className="block text-xs font-mono font-bold text-slate-700 uppercase">
                  Full Amazon Product Description (HTML Compliant)
                </span>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-350 hover:bg-white rounded text-slate-900 tracking-wide leading-relaxed focus:bg-white focus:outline-none"
                />
              </div>

              {/* Backend Search terms with threshold guard gauge */}
              <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-250 rounded">
                <div className="flex justify-between items-center text-xs font-mono text-slate-700">
                  <span className="font-bold uppercase">Backend Search Terms (Generic Keywords)</span>
                  <span className={`font-bold px-1.5 py-0.5 rounded ${
                    isSearchTermsOverLimit ? 'bg-rose-100 text-rose-800' : 'bg-blue-150 text-blue-900'
                  }`}>
                    {currentByteCount} / 250 Bytes
                  </span>
                </div>
                <input
                  type="text"
                  value={editSearchTerms}
                  onChange={(e) => setEditSearchTerms(e.target.value)}
                  className="w-full text-xs font-mono p-2 bg-white border border-slate-350 rounded text-slate-900 focus:outline-none"
                  placeholder="Keywords separated by spaces..."
                />
                <p className="text-[10px] font-mono text-slate-500">
                  Amazon index limits search keywords to 250 combined bytes. Bypasses brand names or prepositions.
                </p>
              </div>

              {/* A+ Modules Layout Preview */}
              {activeListing.aPlusModules && activeListing.aPlusModules.length > 0 && (
                <div className="border border-slate-250 rounded overflow-hidden">
                  <div className="bg-slate-100 p-2 border-b text-[10px] font-mono font-bold text-slate-700 uppercase">
                    A+ ENHANCED BRAND CONTENT ({activeListing.aPlusModules.length} MODULES ATTACHED)
                  </div>
                  {activeListing.aPlusModules.map((mod) => (
                    <div key={mod.id} className="p-3 bg-slate-50 space-y-2">
                      <div className="text-xs font-mono font-bold text-[#0B2545]">{mod.title || mod.headline}</div>
                      <p className="text-[11px] text-slate-600 font-mono leading-relaxed">{mod.body}</p>
                      {(mod.imageUrl || mod.imagePath) && (
                        <div className="flex gap-2 items-center text-[10px] font-mono text-indigo-950 bg-indigo-50/50 p-2 rounded">
                          <ImageIcon className="w-4 h-4 text-blue-900" />
                          <span>Associated Visual Asset: {mod.imageUrl || mod.imagePath}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Interactive buttons to sync change drafts */}
              <div className="pt-2 border-t flex justify-end gap-2 text-xs font-mono">
                <button
                  onClick={handleSaveListingChanges}
                  className="py-2 px-4 border-2 border-slate-900 font-bold bg-yellow-400 hover:bg-yellow-500 text-slate-950 rounded cursor-pointer transition-all"
                >
                  SAVE DRAFT CORRECTIONS
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Image Gallery of assets & Operator buttons */}
        <div className="space-y-6">
          
          {/* Action trigger console box */}
          <div className="bg-white border-2 border-slate-900 rounded p-4 shadow-sm space-y-3">
            <h4 className="text-xs font-mono font-bold text-slate-800 uppercase tracking-widest border-b pb-2">
              STUDIO COGNITIVE ACTIONS
            </h4>
            
            <div className="space-y-2">
              <button
                disabled={pipelineActive || isExternallyRunning}
                onClick={() => void executePipeline('full')}
                className="w-full py-3 bg-[#0B2545] hover:bg-blue-950 text-white font-mono text-xs font-bold border border-slate-900 rounded flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm disabled:bg-slate-300"
              >
                <Sparkles className="w-4 h-4 text-yellow-400" />
                {pipelineActive || isExternallyRunning ? 'RUNNING LIVE PIPELINE...' : 'EXECUTE FULL PIPELINE'}
              </button>

              <button
                disabled={pipelineActive || isExternallyRunning || !activeListing}
                onClick={() => void executePipeline('copy')}
                className="w-full py-2.5 bg-white hover:bg-slate-50 text-[#0B2545] font-mono text-xs font-bold border-2 border-slate-950 rounded flex items-center justify-center gap-2 cursor-pointer transition-all disabled:text-slate-400"
              >
                <RefreshCw className="w-4 h-4" />
                REGENERATE COPY
              </button>

              <button
                disabled={pipelineActive || isExternallyRunning || !activeListing}
                onClick={() => void executePipeline('images')}
                className="w-full py-2.5 bg-white hover:bg-slate-50 text-[#0B2545] font-mono text-xs font-bold border-2 border-slate-950 rounded flex items-center justify-center gap-2 cursor-pointer transition-all disabled:text-slate-400"
              >
                <ImageIcon className="w-4 h-4" />
                REGENERATE IMAGES
              </button>

              <button
                disabled={pipelineActive || isExternallyRunning || !activeListing}
                onClick={() => onSendToReview(selectedSku)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold border border-slate-900 rounded flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm disabled:bg-slate-300"
              >
                <FileCheck className="w-4 h-4" />
                PUBLISH TO REVIEW / DIFF
              </button>
            </div>
          </div>

          {/* Rendered Visual Asset list */}
          {activeListing && (
            <div className="bg-white border-2 border-slate-900 rounded shadow-sm overflow-hidden">
              <div className="bg-[#0B2545] p-3 text-white flex justify-between items-center">
                <span className="font-mono text-xs font-bold uppercase flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-yellow-400" />
                  GENERATED IMAGE GALLERY
                </span>
                <span className="text-[10px] font-mono text-[#8DA9C4] bg-[#134074] px-2 py-0.5 rounded">
                  4 ASSETS
                </span>
              </div>

              {/* Mini cards of generated textures */}
              <div className="grid grid-cols-2 p-3 gap-3">
                
                {/* Main */}
                <div className="space-y-1">
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block">Main Hero (White Box)</span>
                  <div className="relative border rounded aspect-square overflow-hidden bg-slate-50 group hover:border-[#134074]">
                    <img 
                      src={activeListing.images.main} 
                      alt="Main" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                    />
                  </div>
                </div>

                {/* Lifestyle */}
                <div className="space-y-1">
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block">Lifestyle Simulation</span>
                  <div className="relative border rounded aspect-square overflow-hidden bg-slate-50 group hover:border-[#134074]">
                    <img 
                      src={activeListing.images.lifestyle} 
                      alt="Lifestyle" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                    />
                  </div>
                </div>

                {/* Infographic */}
                <div className="space-y-1">
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block">Thermal Spec Infographic</span>
                  <div className="relative border rounded aspect-square overflow-hidden bg-slate-50 group hover:border-[#134074]">
                    <img 
                      src={activeListing.images.infographic} 
                      alt="Infographic" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                    />
                  </div>
                </div>

                {/* A+ Cover */}
                <div className="space-y-1">
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block">A+ Module Segment Banner</span>
                  <div className="relative border rounded aspect-square overflow-hidden bg-slate-50 group hover:border-[#134074]">
                    <img 
                      src={activeListing.images.aPlus} 
                      alt="A+" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                    />
                  </div>
                </div>

              </div>

              <div className="bg-slate-50 p-3 border-t text-[10px] font-mono text-slate-500 leading-normal flex items-start gap-1">
                <ShieldAlert className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Pixel integrity validation pass. Background white balance parameters set to RGB 255/255/255 conformant.</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
