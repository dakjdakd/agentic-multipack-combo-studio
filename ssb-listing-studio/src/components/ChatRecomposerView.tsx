import { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Sparkles, 
  ArrowRight, 
  Layers, 
  RefreshCcw, 
  HelpCircle, 
  SlidersHorizontal, 
  Scale, 
  Check, 
  Tag, 
  Package, 
  ImageIcon 
} from 'lucide-react';
import { Product, ChatMessage } from '../types';

interface ChatRecomposerViewProps {
  products: Product[];
  chatHistory: ChatMessage[];
  onAddChatMessage: (msg: ChatMessage) => void;
  deductBudget: (costUsd: number) => void;
  onSendPrompt?: (sku: string, message: string) => void;
  activeSkuFromApp?: string;
}

const PRESET_PROMPTS = [
  { text: "Make this a 3-pack", label: "Create 3-Pack" },
  { text: "Combine this with SKU STAND-ALUM-09", label: "Create Combo Pack" },
  { text: "Change it to a 2-pack and make the title shorter", label: "Compact 2-Pack" }
];

export default function ChatRecomposerView({
  products,
  chatHistory,
  onAddChatMessage,
  deductBudget,
  onSendPrompt,
  activeSkuFromApp
}: ChatRecomposerViewProps) {
  const [inputText, setInputText] = useState('');
  const [activeSku, setActiveSku] = useState(activeSkuFromApp || products[0]?.sku || "CHARGER-GAN-65");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const selectedProduct = products.find(p => p.sku === activeSku) || products[0] || null;
  const hasProducts = products.length > 0;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  useEffect(() => {
    if (activeSkuFromApp) setActiveSku(activeSkuFromApp);
  }, [activeSkuFromApp]);

  useEffect(() => {
    if (hasProducts && !products.some((p) => p.sku === activeSku)) {
      setActiveSku(products[0].sku);
    }
  }, [activeSku, hasProducts, products]);

  const handleSendPrompt = (promptText: string) => {
    if (!promptText.trim()) return;
    if (!selectedProduct) {
      onAddChatMessage({
        id: `m-sys-${Date.now()}`,
        sender: 'assistant',
        text: 'No SKU is loaded yet. Please wait for Products DB to finish loading, then try the multipack or combo request again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      return;
    }
    if (onSendPrompt) {
      onSendPrompt(activeSku, promptText);
      setInputText('');
      return;
    }

    // 1. Append user bubble
    const userMsg: ChatMessage = {
      id: `m-usr-${Date.now()}`,
      sender: 'user',
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    onAddChatMessage(userMsg);
    setInputText('');

    // Deduct standard charge
    deductBudget(0.08);

    // 2. Generate structured response mapping to requested intents
    setTimeout(() => {
      let intent = "MULTIPACK_CREATION";
      let unit = 3;
      let totalWeight = "0.96 lbs (0.32 lbs each)";
      let totalDims = "4.5 x 3.6 x 1.5 inches";
      let refSku = "CHARGER-GAN-65";
      let updatedTitle = "";
      let updatedBullets: string[] = [];
      let imgOrig = selectedProduct.image;
      let imgNew = "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600";

      const lowPrompt = promptText.toLowerCase();

      if (lowPrompt.includes('combine') || lowPrompt.includes('sku') || lowPrompt.includes('stand')) {
        intent = "HYBRID_COMBO_BUNDLING";
        refSku = "STAND-ALUM-09";
        unit = 2; // Mat + stand
        totalWeight = "1.72 lbs (Charger + Laptop Stand)";
        totalDims = "9.8 x 8.5 x 2.7 inches Combined Pack";
        updatedTitle = `Veloce Dual-Power [ErgoCharge Combo Kit] - Includes 65W GaN Multi-Port Wall Adapter & ErgoLift Aerospace-Grade Aluminum Laptop Stand Adjuster`;
        updatedBullets = [
          "COMPLETE EXECUTIVE WORKSTATION PACK: Renders a synchronized fast charging power terminal and an eye-level metal ergonomic laptop riser block together.",
          "65W GAN III FAST ADAPTER: Directs high-speed energy to run MacBook, Dell, or iPad models. Features double-port USB heat throttle throttling.",
          "6 ADJ_ANGLE LAPTOP LIFTER: CNC refined heavy anodized metals support maximum load weight limits up to 40 lbs without structural strain.",
          "COHESIVE SILVER & WHITE AESTHETICS: Modern clean layout aligns elegantly into home offices, executive studios, and creative workspace environments.",
          "VALUE INTEGRATED GIFT SET: Consolidates primary physical computing essentials inside one single master box listing, reducing logistics waste."
        ];
        imgNew = "https://images.unsplash.com/photo-1616440347437-b1c73416efc2?w=600";
      } else if (lowPrompt.includes('2-pack') || lowPrompt.includes('shorter') || lowPrompt.includes('2pack')) {
        intent = "COMPACT_MULTIPACK_REWRITE";
        refSku = "CHARGER-GAN-65";
        unit = 2;
        totalWeight = "0.64 lbs (0.32 lbs x 2)";
        totalDims = "3.2 x 2.5 x 1.5 inches";
        updatedTitle = `Veloce [2-Pack] Compact 65W GaN Fast Charger - Twin USB-C Wall Charging Plugs (Arctic White)`;
        updatedBullets = [
          "TWIN POWER PACK BUNDLE: Includes two matching 65W Gallium Nitride wall chargers to distribute fast power to bedside and office.",
          "FAST 65W PD CHARGING: Restores hardware power up to 50% capacity within 25 standard minutes. Full safety UL certifications pass.",
          "COMPACT FOLD-PRONG TERM: Compact flippable prongs bypass backpack clutter. Fits in travel pockets.",
          "GAN SEMICONDUCTOR ENGINES: Minimizes electrical resistance, lowering temperatures by up to 30 degrees during active flow.",
          "SAFE STEP THROTTLING: Smart chips auto-negotiate wattage targets dynamically to shelter device micro-batteries."
        ];
        imgNew = "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600";
      } else {
        // Standard "3-pack" or general multipack
        intent = "STANDARD_MULTIPACK_CONSTRUCT";
        refSku = "CHARGER-GAN-65";
        unit = 3;
        totalWeight = "0.96 lbs (0.32 lbs x 3)";
        totalDims = "4.5 x 3.6 x 1.5 inches";
        updatedTitle = `Veloce [3-Pack Value Bundle] 65W GaN Charger Block - Ultra-Compact Dual Port USB-C Wall Adapter Plugs (Arctic White)`;
        updatedBullets = [
          "VALUE 3-PACK DISTRIBUTION: Spreads three high-power 65W plugs across your bedroom, living room, and travel case securely.",
          "65W GAN DYNAMIC INTENSITY: Gallium Nitride semiconductors optimize high energy delivery for portable computers and phone blocks.",
          "DUAL PORT ALLOCATION CHIP: Allows concurrent multiple item powering. Smart adapters negotiate limits dynamically.",
          "COOLING DESIGN INTEGRITY: Runs 40% cooler than generic chargers, saving cabinet space and maintaining low heat metrics.",
          "USA COLLAPSIBLE TERMINALS: Secure folding prongs prevent cosmetic abrasions to travel gear. Standard 110V coverage."
        ];
        imgNew = "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600";
      }

      const assistantMsg: ChatMessage = {
        id: `m-ast-${Date.now()}`,
        sender: 'assistant',
        text: `Understood. Detected request to execute brand recomposition. Recomputed physical characteristics and drafted updated copy points for the requested structure. Let's inspect the calculated listings below:`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recomposeResult: {
          intent,
          referencedSku: refSku,
          originalSku: selectedProduct.sku,
          unitCount: unit,
          weight: totalWeight,
          dimensions: totalDims,
          title: updatedTitle,
          bullets: updatedBullets,
          images: {
            original: imgOrig,
            recomposed: imgNew
          }
        }
      };
      onAddChatMessage(assistantMsg);
    }, 1000);
  };

  // Find most recent assistant message with a recomposeResult to inspect
  const latestRecompose = [...chatHistory]
    .reverse()
    .find(m => m.sender === 'assistant' && m.recomposeResult)?.recomposeResult;

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      
      {/* Page Title */}
      <div className="bg-[#EEF4F8] p-5 border-2 border-slate-900 rounded flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-mono tracking-tight uppercase">
            05 / NATURAL CHAT RECOMPOSER
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-mono">
            Direct natural language requests to restyle listings for wholesale multi-packs, value bundles, and hybrid SKUs.
          </p>
        </div>

        {/* Selected target SKU to write prompts on */}
        <div className="flex items-center gap-2 bg-white p-2 border-2 border-slate-900 rounded shadow-sm">
          <span className="text-[10px] font-mono text-slate-700 font-bold uppercase">FOCUS CONTEXT:</span>
          <select
            value={activeSku}
            onChange={(e) => setActiveSku(e.target.value)}
            disabled={!hasProducts}
            className="bg-slate-50 border border-slate-350 px-2 py-0.5 font-mono text-xs font-bold text-blue-900 rounded focus:outline-none"
          >
            {!hasProducts ? (
              <option value="">Loading SKU data...</option>
            ) : (
              products.map(p => (
                <option key={p.sku} value={p.sku}>{p.sku} ({p.color || 'no color'})</option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Main split column: Chat panel on left, results showcase on right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Left Hand: Interactive Chat Panel */}
        <div className="bg-white border-2 border-slate-900 rounded flex flex-col h-[580px] justify-between shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-slate-100 p-3.5 border-b border-slate-300 flex justify-between items-center font-mono text-xs font-bold">
            <span className="text-slate-700 uppercase flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#134074]" />
              Natural Language Bundle Builder Console
            </span>
            <span className="bg-slate-300 text-slate-800 text-[10px] px-1.5 py-0.2 rounded uppercase">
              NLP PORTAL
            </span>
          </div>

          {/* Sku Anchor Info Card */}
          <div className="p-3 bg-indigo-50 border-b border-indigo-150 flex items-center justify-between font-mono">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-950" />
              <div className="text-[10px]">
                <span className="text-slate-500">Active context anchor:</span>{' '}
                <strong className="text-slate-800">{selectedProduct?.sku || 'Waiting for SKU'}</strong>
                {selectedProduct ? ` - ${selectedProduct.title.substring(0, 45)}...` : ' - Products DB is still loading.'}
              </div>
            </div>
            <span className="text-[9px] bg-blue-150 text-blue-900 px-1 py-0.2 uppercase font-semibold">
              BASE_Q: {selectedProduct?.unitCount || 1}
            </span>
          </div>

          {/* Chat Bubble Logs scrollable */}
          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            {chatHistory.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 max-w-[85%] rounded border font-mono text-xs ${
                    isUser
                      ? 'bg-yellow-105 border-yellow-400 text-slate-900 rounded-br-none shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-800 rounded-bl-none shadow'
                  }`}>
                    <div className="text-[9px] text-slate-400 uppercase tracking-widest mb-1 font-bold">
                      {isUser ? 'HUMAN OPERATOR' : 'RECOMPOSER AGENT'}
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    <span className="text-[8px] text-slate-400 block text-right mt-1.5">{msg.timestamp}</span>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Lower controls: quick triggers & typing box */}
          <div className="p-3 bg-slate-50 border-t border-slate-300 space-y-3 font-mono">
            
            {/* Quick Presets list */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Example queries:</span>
              {PRESET_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSendPrompt(p.text)}
                  className="text-[10px] bg-white border hover:bg-yellow-550 hover:border-slate-850 px-2.5 py-1 text-slate-700 hover:text-black rounded cursor-pointer transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Input Form typing bar */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendPrompt(inputText);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Declare pack structures (e.g. 'Make this a 3-pack and emphasize fast MacBook charge')..."
                className="w-full bg-white border border-slate-300 font-mono text-xs px-3.5 py-2.5 rounded focus:outline-none focus:ring-1 focus:border-blue-900"
              />
              <button
                type="submit"
                className="p-3 bg-[#0B2545] hover:bg-blue-900 text-white rounded cursor-pointer transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Hand: Recomposition Outcome Panel */}
        <div className="bg-white border-2 border-slate-900 rounded shadow-sm overflow-hidden flex flex-col h-[580px]">
          <div className="bg-[#0B2545] p-3.5 text-white flex justify-between items-center font-mono text-xs font-bold">
            <span className="uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              REAL-TIME OUTPUT TRANSFORMATION FIELD
            </span>
            <span className="text-[10px] font-mono text-[#8DA9C4] bg-[#134074] px-2 py-0.5 rounded uppercase">
              {latestRecompose ? latestRecompose.intent : 'Awaiting prompt'}
            </span>
          </div>

          {!latestRecompose ? (
            <div className="p-10 text-center font-mono text-xs text-slate-500 flex-1 flex flex-col justify-center items-center gap-2">
              <Layers className="w-10 h-10 text-indigo-150 animate-bounce" />
              <span>Select SKU and send a structural prompt (e.g., &quot;Make this a 3-pack&quot;) to inspect recomputed metrics and text variables.</span>
            </div>
          ) : (
            <div className="p-4 space-y-4 flex-1 overflow-y-auto leading-relaxed">
              
              {/* Calculated Physical Metrics comparisons box */}
              <div className="bg-[#EEF4F8] p-3 border border-blue-200 rounded font-mono text-[11px] text-slate-950 space-y-2">
                <div className="text-[10px] uppercase font-bold text-[#0B2545] border-b border-blue-150 pb-1 flex items-center gap-1.5">
                  <Package className="w-4 h-4" />
                  RECALCULATED PHYSICAL ATTRIBUTE SPECS
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-500 block uppercase text-[9px]">Calculated Unit Qty</span>
                    <strong className="text-slate-900 text-sm">{latestRecompose.unitCount} Pieces</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[9px]">Aggregate Package Weight</span>
                    <strong className="text-slate-900 text-xs">{latestRecompose.weight}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block uppercase text-[9px]">Recounted Package Dimensions</span>
                    <strong className="text-slate-900 text-xs">{latestRecompose.dimensions}</strong>
                  </div>
                </div>
              </div>

              {/* Text visual transformations */}
              <div className="space-y-3 font-mono">
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Optimized Bundle Title</span>
                  <p className="bg-[#FCF6E5] text-slate-900 text-xs p-3.5 border border-yellow-250 rounded font-bold leading-normal">
                    {latestRecompose.title}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Calculated Bullet features</span>
                  <div className="space-y-1.5">
                    {(latestRecompose.bullets || []).map((b, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] leading-relaxed flex gap-2">
                        <span className="font-extrabold text-[#0B2545] text-xs">0{idx+1}</span>
                        <p className="text-slate-800">{b}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Comparative Image Updates layout */}
              <div className="space-y-2">
                <span className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">Visual Asset Update Check</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 text-center font-mono">
                    <span className="text-[8px] text-slate-400 block uppercase">Original base asset</span>
                    <div className="border rounded h-28 aspect-square overflow-hidden bg-slate-100 mx-auto">
                      {latestRecompose.images?.original ? (
                        <img src={latestRecompose.images.original} alt="Orig" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-400">No image</div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 text-center font-mono">
                    <span className="text-[8px] text-emerald-600 block uppercase font-bold">RECOMPOSED VALUE BUNDLE</span>
                    <div className="border border-emerald-400 rounded h-28 aspect-square overflow-hidden bg-slate-100 mx-auto ring-1 ring-emerald-300">
                      {latestRecompose.images?.recomposed ? (
                        <img src={latestRecompose.images.recomposed} alt="Recomp" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-400">Pending image</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          <div className="bg-slate-50 p-3 border-t font-mono text-center text-[10.5px] text-slate-400 leading-none">
            NLP transformation output cached in operational state.
          </div>
        </div>

      </div>
    </div>
  );
}
