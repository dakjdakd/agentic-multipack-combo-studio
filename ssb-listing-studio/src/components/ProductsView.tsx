import { useEffect, useState } from 'react';
import { 
  Search, 
  Filter, 
  FileJson, 
  Sparkles, 
  Workflow, 
  AlertOctagon, 
  Database, 
  Layers, 
  CheckCircle2, 
  Plus,
  RefreshCw
} from 'lucide-react';
import { Product, VariationGroup } from '../types';
import { api } from '../api/client';

interface ProductsViewProps {
  products: Product[];
  onEnrichProduct: (sku: string) => Promise<void> | void;
  onGenerateListing: (sku: string) => Promise<void> | void;
}

export default function ProductsView({ products, onEnrichProduct, onGenerateListing }: ProductsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSku, setSelectedSku] = useState<string>(products[0]?.sku || '');
  const [variation, setVariation] = useState<VariationGroup | null>(null);
  const [pendingAction, setPendingAction] = useState<{ type: 'enrich' | 'generate'; sku: string } | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  // Lists for filtering dropdowns
  const brands = ['All', ...new Set(products.map(p => p.brand))];
  const categories = ['All', ...new Set(products.map(p => p.category.split(' > ')[0]))];

  // Filtering logic
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBrand = selectedBrand === 'All' || p.brand === selectedBrand;
    const matchesCategory = selectedCategory === 'All' || p.category.startsWith(selectedCategory);
    
    return matchesSearch && matchesBrand && matchesCategory;
  });

  const selectedProductObj = products.find(p => p.sku === selectedSku);
  const isEnrichingSelected = pendingAction?.type === 'enrich' && pendingAction.sku === selectedProductObj?.sku;
  const isGeneratingSelected = pendingAction?.type === 'generate' && pendingAction.sku === selectedProductObj?.sku;

  const handleEnrichClick = async (sku: string) => {
    if (pendingAction) return;
    setPendingAction({ type: 'enrich', sku });
    setActionError('');
    setActionMessage('Live enrichment running. Search grounding and source extraction can take a little while.');
    try {
      await onEnrichProduct(sku);
      setActionMessage('Enrichment completed. Normalized attributes and missing-field flags were refreshed.');
    } catch (err) {
      setActionError((err as Error).message || 'Enrichment failed.');
      setActionMessage('');
    } finally {
      setPendingAction(null);
    }
  };

  const handleGenerateClick = async (sku: string) => {
    if (pendingAction) return;
    setPendingAction({ type: 'generate', sku });
    setActionError('');
    setActionMessage('Routing to Listing Studio. The live multi-agent pipeline will show progress there.');
    try {
      await onGenerateListing(sku);
    } catch (err) {
      setActionError((err as Error).message || 'Listing generation failed.');
      setActionMessage('');
      setPendingAction(null);
    }
  };

  useEffect(() => {
    if (!selectedSku) return;
    let cancelled = false;
    api.variation(selectedSku)
      .then((group) => {
        if (!cancelled) setVariation(group);
      })
      .catch(() => {
        if (!cancelled) setVariation(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSku]);

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      
      {/* Title Header */}
      <div className="bg-[#EEF4F8] p-5 border-2 border-slate-900 rounded flex justify-between items-center shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-mono tracking-tight uppercase">
            02 / SSB PRODUCT DATABASE
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-mono">
            Browse normalized catalog indices, inspect raw tables, and trigger property enrichment loops.
          </p>
        </div>
        <div className="bg-slate-900 text-[#EEF4F8] text-[10px] font-mono px-3 py-1.5 rounded tracking-wide uppercase flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          MASTER REPOSITORY
        </div>
      </div>

      {/* Query Bar */}
      <div className="bg-white p-4 border-2 border-slate-900 rounded shadow-sm grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Search Input */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Query SKU name, brand tags, or titles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none focus:bg-white text-slate-900"
          />
        </div>

        {/* Brand Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase shrink-0">Brand:</span>
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 py-2.5 px-3 rounded font-mono text-xs focus:ring-1 text-slate-800"
          >
            {brands.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* Category Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase shrink-0">Cat:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 py-2.5 px-3 rounded font-mono text-xs focus:ring-1 text-slate-800"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main content grid: Table on Left, Details Sidebar on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* SKU Table list list */}
        <div className="lg:col-span-2 bg-white border-2 border-slate-900 rounded shadow-sm overflow-hidden">
          <div className="bg-slate-100 p-3.5 border-b-2 border-slate-300 flex justify-between items-center">
            <span className="font-mono text-xs font-bold text-slate-700 uppercase flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-600" />
              Indexed SKU Records ({filteredProducts.length})
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              SELECT SKU TO VIEW DETAILED SCHEMAS
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-300">
                  <th className="py-2.5 px-4 w-12">Photo</th>
                  <th className="py-2.5 px-3">SKU Code</th>
                  <th className="py-2.5 px-3">Primary specs title</th>
                  <th className="py-2.5 px-3">Brand</th>
                  <th className="py-2.5 px-3">Color</th>
                  <th className="py-2.5 px-3 text-right">Weight / Dims</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const isSelected = selectedSku === p.sku;
                  return (
                    <tr
                      key={p.sku}
                      id={`row-${p.sku}`}
                      onClick={() => setSelectedSku(p.sku)}
                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                        isSelected ? 'bg-yellow-100/40 border-l-4 border-yellow-500' : 'bg-transparent'
                      }`}
                    >
                      <td className="py-2 px-4">
                        <img
                          src={p.image}
                          alt={p.sku}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 object-cover rounded border border-slate-300 bg-slate-100"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 uppercase block">{p.sku}</span>
                        <span className={`text-[9px] px-1 py-0.2 rounded uppercase ${
                          p.missingFields.length > 0 
                            ? 'bg-rose-50 text-rose-700' 
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {p.missingFields.length > 0 ? `Alert: ${p.missingFields.length} missing` : 'Specs filled'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 max-w-xs truncate">{p.title}</td>
                      <td className="py-3 px-3 text-slate-800">{p.brand}</td>
                      <td className="py-3 px-3 text-slate-600">{p.color}</td>
                      <td className="py-3 px-3 text-right text-slate-600 font-bold leading-normal">
                        <div>{p.weight.value} {p.weight.unit}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {p.dimensions.length}x{p.dimensions.width}x{p.dimensions.height} {p.dimensions.unit}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredProducts.length === 0 && (
            <div className="p-8 text-center font-mono text-xs text-slate-500">
              No product SKUs match the current pipeline queries.
            </div>
          )}
        </div>

        {/* SKU Details Sidebar Pane */}
        {selectedProductObj && (
          <div className="bg-white border-2 border-slate-900 rounded shadow-sm overflow-hidden flex flex-col">
            <div className="bg-[#0B2545] p-3.5 text-white flex justify-between items-center">
              <span className="font-mono text-xs font-bold tracking-wider uppercase flex items-center gap-2">
                <FileJson className="w-4 h-4 text-yellow-400" />
                SKU DETAILS PANEL
              </span>
              <span className="text-[10px] font-mono text-[#8DA9C4] bg-[#134074] px-2 py-0.5 rounded">
                {selectedProductObj.sku}
              </span>
            </div>

            <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
              {/* Product Card summary */}
              <div className="flex gap-3 pb-3 border-b border-slate-200">
                <img
                  src={selectedProductObj.image}
                  alt={selectedProductObj.sku}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 object-cover rounded border-2 border-slate-350"
                />
                <div className="space-y-1">
                  <h4 className="text-xs font-mono font-bold text-slate-900 leading-tight">
                    {selectedProductObj.title}
                  </h4>
                  <div className="flex gap-2 text-[10px] font-mono text-slate-500">
                    <span className="bg-slate-100 px-1 rounded uppercase">Brand: {selectedProductObj.brand}</span>
                    <span className="bg-slate-100 px-1 rounded uppercase">Col: {selectedProductObj.color}</span>
                    <span className={`px-1 rounded uppercase ${selectedProductObj.source === 'ssb_mysql' ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      Source: {selectedProductObj.source || 'demo'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Missing Fields Indicators Alert */}
              <div className="space-y-1.5">
                <h5 className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <AlertOctagon className="w-3.5 h-3.5 text-amber-500" />
                  Regulatory & Verification Flags
                </h5>
                {selectedProductObj.missingFields.length > 0 ? (
                  <div className="bg-rose-50 border border-rose-250 p-3 rounded space-y-1">
                    {selectedProductObj.missingFields.map((err, i) => (
                      <div key={i} className="text-[10px] font-mono text-rose-800 flex items-start gap-1">
                        <span className="text-rose-500 font-bold shrink-0">-</span>
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-250 p-3 rounded flex items-center gap-2 text-[10px] font-mono text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Catalog attributes optimized! No raw fields flags detected.</span>
                  </div>
                )}
              </div>

              {/* Normalized JSON spec file render */}
              <div>
                <h5 className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1 shadow-sm">

              {selectedProductObj.warnings && selectedProductObj.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-250 p-3 rounded space-y-1">
                  {selectedProductObj.warnings.map((warning, i) => (
                    <div key={i} className="text-[10px] font-mono text-yellow-900">- {warning}</div>
                  ))}
                </div>
              )}

              <div>
                <h5 className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1 shadow-sm">
                  Variation & Pricing Suggestion
                </h5>
                <div className="bg-[#EEF4F8] border border-blue-150 rounded p-2.5 font-mono text-[10px] text-slate-700 space-y-1">
                  {variation ? (
                    <>
                      <div><strong>Parent SKU:</strong> {variation.parentSku || 'not declared'}</div>
                      <div><strong>Children:</strong> {variation.items.map((item) => `${item.sku}${item.color ? `/${item.color}` : ''}${item.size ? `/${item.size}` : ''}`).join(', ')}</div>
                      <div><strong>Suggested Price:</strong> {variation.pricingSuggestion.suggestedPrice ? `$${variation.pricingSuggestion.suggestedPrice}` : 'needs cost data'} / confidence {(variation.pricingSuggestion.confidence * 100).toFixed(0)}%</div>
                      <div className="text-slate-500">{variation.pricingSuggestion.notes}</div>
                    </>
                  ) : (
                    <div>Variation data is unavailable for this SKU.</div>
                  )}
                </div>
              </div>
                  Normalized Attribute Tree (JSON)
                </h5>
                <pre className="bg-[#0B2545]/10 font-mono text-[9.5px] p-2.5 rounded text-indigo-950 overflow-x-auto border border-blue-150 leading-relaxed max-h-48 overflow-y-auto">
                  {selectedProductObj.normalizedJson}
                </pre>
              </div>

              {/* Legacy legacy flat DB indices */}
              <div>
                <h5 className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1 shadow-sm">
                  Legacy SSB Database Logs (Raw)
                </h5>
                <pre className="bg-slate-900 font-mono text-[9px] p-2.5 rounded text-emerald-400 overflow-x-auto leading-relaxed max-h-36 overflow-y-auto">
                  {JSON.stringify(selectedProductObj.rawFields, null, 2)}
                </pre>
              </div>
            </div>

            {/* Actions trigger */}
            <div className="bg-slate-100 p-3 border-t border-slate-350 grid grid-cols-2 gap-2">
              <button
                disabled={!!pendingAction}
                onClick={() => void handleEnrichClick(selectedProductObj.sku)}
                className="py-2 px-3 font-mono text-[10px] font-bold border rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-white text-blue-900 border-slate-900 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-wait"
              >
                {isEnrichingSelected ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Workflow className="w-3.5 h-3.5" />}
                {isEnrichingSelected ? 'ENRICHING...' : 'ENRICH SPECS'}
              </button>

              <button
                disabled={!!pendingAction}
                onClick={() => void handleGenerateClick(selectedProductObj.sku)}
                className="py-2 px-3 font-mono text-[10px] bg-[#0B2545] text-white hover:bg-blue-850 rounded border border-slate-900 font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:bg-slate-400 disabled:cursor-wait"
              >
                {isGeneratingSelected ? <RefreshCw className="w-3.5 h-3.5 text-yellow-400 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-yellow-400" />}
                {isGeneratingSelected ? 'STARTING...' : 'GENERATE LISTING'}
              </button>
              {(actionMessage || actionError) && (
                <div className={`col-span-2 rounded border px-3 py-2 font-mono text-[10px] leading-relaxed ${
                  actionError ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-blue-50 border-blue-200 text-blue-950'
                }`}>
                  {actionError || actionMessage}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

