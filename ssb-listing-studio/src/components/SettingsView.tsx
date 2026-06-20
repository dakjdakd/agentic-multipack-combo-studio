import { useState } from 'react';
import { 
  Settings, 
  Database, 
  ShieldCheck, 
  Cpu, 
  Search, 
  Sparkles, 
  AlertTriangle, 
  EyeOff, 
  HelpCircle, 
  CheckCircle2 
} from 'lucide-react';
import { SettingsState } from '../types';

interface SettingsViewProps {
  settings: SettingsState;
  onUpdateSettings: (updated: SettingsState) => void;
}

export default function SettingsView({ settings, onUpdateSettings }: SettingsViewProps) {
  const [showSecretConfirm, setShowSecretConfirm] = useState(false);

  const handleToggleDemo = () => {
    onUpdateSettings({
      ...settings,
      demoMode: !settings.demoMode
    });
  };

  const handleChangeProvider = (field: 'llmProvider' | 'imageProvider' | 'searchProvider', val: string) => {
    onUpdateSettings({
      ...settings,
      [field]: val
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      
      {/* Page Title */}
      <div className="bg-[#EEF4F8] p-5 border-2 border-slate-900 rounded flex justify-between items-center shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-mono tracking-tight uppercase">
            08 / OPERATIONAL SETTINGS & KEY STATUS
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-mono">
            Verify network connections, toggle demo simulation properties, and secure computational models.
          </p>
        </div>
        <div className="bg-slate-900 text-white text-[10px] font-mono px-3 py-1.5 rounded tracking-wide uppercase border border-slate-700">
          SYSTEM MANUAL CONSOLE
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column (Span 2): Configurations */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Environment health checks block */}
          <div className="bg-white border-2 border-slate-900 rounded p-5 shadow-sm space-y-4 font-mono">
            <h3 className="font-bold text-[#0B2545] text-xs uppercase tracking-widest border-b pb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              INTEGRATION SERVICES STATUS SCAN
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              
              {/* index 1 */}
              <div className="p-3 bg-slate-50 border rounded flex justify-between items-center">
                <div className="space-y-1">
                  <span className="font-bold text-slate-800 uppercase text-[11px] block">SSB Database Connection</span>
                  <p className="text-[10px] text-slate-500 leading-none">
                    Status: {settings.dbReachable ? 'Connected (Read-only)' : settings.dbConfigured ? 'Configured, not reachable' : 'Missing credentials'}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-300">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  {settings.dbReachable ? 'STABLE' : 'CHECK'}
                </span>
              </div>

              {/* index 2 */}
              <div className="p-3 bg-slate-50 border rounded flex justify-between items-center">
                <div className="space-y-1">
                  <span className="font-bold text-slate-800 uppercase text-[11px] block">LLM API Gateway</span>
                  <p className="text-[10px] text-slate-500 leading-none">{settings.llmProvider}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-300">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  {settings.llmApiConfigured ? 'AUTHENTICATED' : 'MISSING'}
                </span>
              </div>

              {/* index 3 */}
              <div className="p-3 bg-slate-50 border rounded flex justify-between items-center">
                <div className="space-y-1">
                  <span className="font-bold text-slate-800 uppercase text-[11px] block">Image API Synthesizer</span>
                  <p className="text-[10px] text-slate-500 leading-none">{settings.imageProvider}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-300">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  {settings.imageApiConfigured ? 'ONLINE' : 'DEMO'}
                </span>
              </div>

              {/* index 4 */}
              <div className="p-3 bg-slate-50 border rounded flex justify-between items-center">
                <div className="space-y-1">
                  <span className="font-bold text-slate-800 uppercase text-[11px] block">Search Grounding API</span>
                  <p className="text-[10px] text-slate-500 leading-none">{settings.searchProvider}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-300">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  {settings.searchApiConfigured ? 'ACTIVE' : 'DEMO'}
                </span>
              </div>

            </div>
          </div>

          {/* Model provider dropdown selections */}
          <div className="bg-white border-2 border-slate-900 rounded p-5 shadow-sm space-y-4 font-mono">
            <h3 className="font-bold text-[#0B2545] text-xs uppercase tracking-widest border-b pb-2 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#134074]" />
              COGNITIVE AGENTS PROVIDERS SPECIFICATIONS
            </h3>

            <div className="space-y-3.5 text-xs">
              
              {/* Drop 1 */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 uppercase">Primary LLM Model Provider</label>
                <select
                  value={settings.llmProvider}
                  onChange={(e) => handleChangeProvider('llmProvider', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-350 p-2.5 rounded font-mono text-xs focus:ring-1"
                >
                  <option value="Google Gemini 2.5 Flash (Production Server)">Google Gemini 2.5 Flash (Production Server)</option>
                  <option value="Gemini 1.5 Pro (Analytical heavy operations)">Gemini 1.5 Pro (Analytical heavy operations)</option>
                  <option value="DeepSeek V3 API Proxy Gateway">DeepSeek V3 API Proxy Gateway</option>
                  <option value="GPT-4o Custom Endpoint (Enterprise)">GPT-4o Custom Endpoint (Enterprise)</option>
                </select>
              </div>

              {/* Drop 2 */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 uppercase">Imaging Generator Engine</label>
                <select
                  value={settings.imageProvider}
                  onChange={(e) => handleChangeProvider('imageProvider', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-350 p-2.5 rounded font-mono text-xs focus:ring-1"
                >
                  <option value="Imagen 3 (Via Cloud Vertex Platform)">Imagen 3 (Via Cloud Vertex Platform)</option>
                  <option value="Stable Diffusion XL (External IP Node)">Stable Diffusion XL (External IP Node)</option>
                  <option value="Dall-E-3 API Node Integration">Dall-E-3 API Node Integration</option>
                </select>
              </div>

              {/* Drop 3 */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-705 uppercase">Web Search Grounding Engine</label>
                <select
                  value={settings.searchProvider}
                  onChange={(e) => handleChangeProvider('searchProvider', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-350 p-2.5 rounded font-mono text-xs focus:ring-1"
                >
                  <option value="Google Search Grounding Engine">Google Search Grounding Engine</option>
                  <option value="Bing Custom Search Index Pro">Bing Custom Search Index Pro</option>
                  <option value="Disabled (Bypass Web Research stage)">Disabled (Bypass Web Research stage)</option>
                </select>
              </div>

            </div>
          </div>

          {/* Sandbox toggle settings */}
          <div className="bg-white border-2 border-slate-900 rounded p-5 shadow-sm space-y-4 font-mono">
            <h3 className="font-bold text-[#0B2545] text-xs uppercase tracking-widest border-b pb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              DEMO SIMULATION AND SECURITY ENVELOPE
            </h3>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 p-4 border border-slate-200 rounded text-xs">
              <div className="space-y-1 max-w-md">
                <span className="font-bold text-slate-900 uppercase block">Active Offline Sandbox Mode</span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  When active, operations use deterministic local providers so the full workflow is reproducible without spending live API budget.
                </p>
              </div>
              <button
                onClick={handleToggleDemo}
                className={`py-2.5 px-6 font-mono text-xs font-bold border-2 border-slate-950 rounded cursor-pointer uppercase transition-colors shrink-0 ${
                  settings.demoMode 
                    ? 'bg-emerald-500 text-slate-950' 
                    : 'bg-rose-500 text-white border-slate-900'
                }`}
              >
                {settings.demoMode ? 'ENABLED (SAFE)' : 'DISABLE (USE LIVE KEYS)'}
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Key Security warnings */}
        <div className="space-y-6">
          
          {/* Key masking statement */}
          <div className="bg-slate-900 text-white p-5 rounded border-2 border-slate-900 space-y-4 font-mono">
            <div className="border-b border-slate-850 pb-2 flex items-center gap-2 text-yellow-405 font-bold text-xs uppercase tracking-widest">
              <EyeOff className="w-4 h-4 text-yellow-450" />
              AUTHENTICATION DATA MASKING
            </div>

            <div className="text-xs space-y-3.5 leading-relaxed text-[#B2C7DE]">
              <p>
                <strong>Security Mandate Compliance:</strong> Actual password tokens and environment credential files are never exposed to the browser. This panel only shows configured/missing status from the backend.
              </p>
              
              <div className="p-3 bg-slate-950 border border-slate-805 rounded text-[11px] font-mono select-none space-y-1">
                <span className="text-slate-500 uppercase block text-[9px]">LLM_API_KEY status</span>
                <span className="text-emerald-400 font-semibold block">● {settings.llmApiConfigured ? 'CONFIGURED' : 'MISSING - DEMO PROVIDER USED'}</span>
                
                <span className="text-slate-500 uppercase block text-[9px] pt-1.5">Database access mode</span>
                <strong className="text-slate-350 truncate block">SSB MySQL read-only adapter</strong>
              </div>

              <p className="text-[10px] text-slate-505">
                Configure variables in .env or Docker environment. Do not paste secrets into the frontend.
              </p>
            </div>
          </div>

          {/* Guidelines warning */}
          <div className="bg-yellow-50 border border-yellow-250 p-4 rounded font-mono text-xs text-yellow-950 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-amber-805 uppercase">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              Operational Reminder
            </div>
            <p className="text-[10px] leading-relaxed text-amber-900">
              Live mode requires backend environment credentials for LLM, image generation, search, and optional SSB MySQL. Missing keys produce clear backend configuration messages.
            </p>
            {settings.messages && settings.messages.length > 0 && (
              <ul className="mt-2 space-y-1 text-[10px] leading-relaxed text-amber-900">
                {settings.messages.map((message, idx) => <li key={idx}>- {message}</li>)}
              </ul>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
