import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  EyeOff,
  Search,
  ShieldCheck,
  Sparkles,
  Settings,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { SettingsState } from '../types';

interface SettingsViewProps {
  settings: SettingsState;
  onUpdateSettings: (updated: SettingsState) => void;
}

function statusPill(label: string, ok: boolean, demoMode = false) {
  const color = ok
    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
    : demoMode
      ? 'bg-amber-50 text-amber-800 border-amber-300'
      : 'bg-rose-50 text-rose-800 border-rose-300';
  const dot = ok ? 'bg-emerald-500' : demoMode ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function ProviderSpec({
  icon,
  title,
  provider,
  model,
  configured,
  baseUrlConfigured,
  notes,
}: {
  icon: ReactNode;
  title: string;
  provider: string;
  model?: string;
  configured: boolean;
  baseUrlConfigured?: boolean;
  notes: string;
}) {
  return (
    <div className="p-3 bg-slate-50 border rounded space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <span className="font-bold text-slate-800 uppercase text-[11px] truncate">{title}</span>
        </div>
        {statusPill(configured ? 'CONFIGURED' : 'MISSING KEY', configured, !configured)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[10px] text-slate-600">
        <div>
          <span className="block uppercase text-slate-400 font-bold">Provider</span>
          <strong className="text-slate-850">{provider || 'not configured'}</strong>
        </div>
        <div>
          <span className="block uppercase text-slate-400 font-bold">Model</span>
          <strong className="text-slate-850">{model || 'not configured'}</strong>
        </div>
        <div>
          <span className="block uppercase text-slate-400 font-bold">Base URL</span>
          <strong className="text-slate-850">{baseUrlConfigured ? 'configured' : 'missing/default'}</strong>
        </div>
      </div>
      <p className="text-[10px] leading-relaxed text-slate-500">{notes}</p>
    </div>
  );
}

export default function SettingsView({ settings }: SettingsViewProps) {
  const liveMode = !settings.demoMode;
  const dbOk = Boolean(settings.dbConfigured && settings.dbReachable);
  const llmLabel = [settings.llmProvider, settings.llmModel].filter(Boolean).join(' / ') || 'LLM not configured';
  const imageLabel = [settings.imageProvider, settings.imageModel].filter(Boolean).join(' / ') || 'image provider not configured';
  const searchLabel = settings.searchProvider || 'search provider not configured';

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      <div className="bg-[#EEF4F8] p-5 border-2 border-slate-900 rounded flex justify-between items-center shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-mono tracking-tight uppercase">
            08 / OPERATIONAL SETTINGS & KEY STATUS
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-mono">
            Verify backend provider status from Docker/.env without exposing any database password or API key.
          </p>
        </div>
        <div className="bg-slate-900 text-white text-[10px] font-mono px-3 py-1.5 rounded tracking-wide uppercase border border-slate-700">
          SYSTEM MANUAL CONSOLE
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border-2 border-slate-900 rounded p-5 shadow-sm space-y-4 font-mono">
            <h3 className="font-bold text-[#0B2545] text-xs uppercase tracking-widest border-b pb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              INTEGRATION SERVICES STATUS SCAN
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 border rounded flex justify-between items-center gap-3">
                <div className="space-y-1 min-w-0">
                  <span className="font-bold text-slate-800 uppercase text-[11px] block">SSB Database Connection</span>
                  <p className="text-[10px] text-slate-500 leading-none">
                    {dbOk
                      ? 'Connected through SSB MySQL read-only adapter'
                      : settings.dbConfigured
                        ? 'Credentials configured, connection not reachable'
                        : 'Missing SSB MySQL credentials'}
                  </p>
                </div>
                {statusPill(dbOk ? 'STABLE' : 'CHECK', dbOk, settings.demoMode)}
              </div>

              <div className="p-3 bg-slate-50 border rounded flex justify-between items-center gap-3">
                <div className="space-y-1 min-w-0">
                  <span className="font-bold text-slate-800 uppercase text-[11px] block">LLM API Gateway</span>
                  <p className="text-[10px] text-slate-500 leading-none">{settings.llmProvider} / {settings.llmModel || 'model not set'}</p>
                </div>
                {statusPill(settings.llmApiConfigured ? 'AUTHENTICATED' : 'MISSING', settings.llmApiConfigured, settings.demoMode)}
              </div>

              <div className="p-3 bg-slate-50 border rounded flex justify-between items-center gap-3">
                <div className="space-y-1 min-w-0">
                  <span className="font-bold text-slate-800 uppercase text-[11px] block">Image API Synthesizer</span>
                  <p className="text-[10px] text-slate-500 leading-none">{settings.imageProvider} / {settings.imageModel || 'model not set'}</p>
                </div>
                {statusPill(settings.imageApiConfigured ? 'ONLINE' : 'DEMO', settings.imageApiConfigured, settings.demoMode)}
              </div>

              <div className="p-3 bg-slate-50 border rounded flex justify-between items-center gap-3">
                <div className="space-y-1 min-w-0">
                  <span className="font-bold text-slate-800 uppercase text-[11px] block">Search Grounding API</span>
                  <p className="text-[10px] text-slate-500 leading-none">{settings.searchProvider}</p>
                </div>
                {statusPill(settings.searchApiConfigured ? 'ACTIVE' : 'DEMO', settings.searchApiConfigured, settings.demoMode)}
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-slate-900 rounded p-5 shadow-sm space-y-4 font-mono">
            <h3 className="font-bold text-[#0B2545] text-xs uppercase tracking-widest border-b pb-2 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#134074]" />
              LIVE PROVIDER SPECIFICATIONS FROM BACKEND
            </h3>

            <div className="space-y-3.5 text-xs">
              <ProviderSpec
                icon={<Cpu className="w-4 h-4 text-blue-900 shrink-0" />}
                title="Primary LLM"
                provider={settings.llmProvider}
                model={settings.llmModel}
                configured={settings.llmApiConfigured}
                baseUrlConfigured={settings.llmBaseUrlConfigured}
                notes={`${llmLabel} is read from backend environment variables and used for structured JSON copy generation, intent extraction, critic reasoning, and agent coordination.`}
              />
              <ProviderSpec
                icon={<Sparkles className="w-4 h-4 text-fuchsia-800 shrink-0" />}
                title="Image Generator"
                provider={settings.imageProvider}
                model={settings.imageModel}
                configured={settings.imageApiConfigured}
                baseUrlConfigured={settings.imageBaseUrlConfigured}
                notes={`${imageLabel} is read from backend environment variables and used by the Image Agent for main image, lifestyle image, infographic, and A+ modules.`}
              />
              <ProviderSpec
                icon={<Search className="w-4 h-4 text-emerald-800 shrink-0" />}
                title="Search Grounding"
                provider={settings.searchProvider}
                model={settings.searchProvider ? `${settings.searchProvider} API` : undefined}
                configured={settings.searchApiConfigured}
                baseUrlConfigured={settings.searchBaseUrlConfigured}
                notes={`${searchLabel} is read from backend environment variables and powers enrichment citations. Only facts with source URLs are written into enrichment fields.`}
              />
            </div>
          </div>

          <div className="bg-white border-2 border-slate-900 rounded p-5 shadow-sm space-y-4 font-mono">
            <h3 className="font-bold text-[#0B2545] text-xs uppercase tracking-widest border-b pb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              DEMO SIMULATION AND SECURITY ENVELOPE
            </h3>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 p-4 border border-slate-200 rounded text-xs">
              <div className="space-y-1 max-w-xl">
                <span className="font-bold text-slate-900 uppercase block">Backend execution mode: {liveMode ? 'LIVE PROVIDERS' : 'DEMO PROVIDERS'}</span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  This value comes from the backend environment. To switch it, edit <code className="font-bold">DEMO_MODE</code> in .env or Docker Compose and restart the API service.
                </p>
              </div>
              <span className={`py-2.5 px-6 font-mono text-xs font-bold border-2 border-slate-950 rounded uppercase shrink-0 ${
                liveMode ? 'bg-emerald-500 text-slate-950' : 'bg-amber-400 text-slate-950'
              }`}>
                {liveMode ? 'LIVE MODE ACTIVE' : 'DEMO MODE ACTIVE'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-5 rounded border-2 border-slate-900 space-y-4 font-mono">
            <div className="border-b border-slate-850 pb-2 flex items-center gap-2 text-yellow-405 font-bold text-xs uppercase tracking-widest">
              <EyeOff className="w-4 h-4 text-yellow-450" />
              AUTHENTICATION DATA MASKING
            </div>

            <div className="text-xs space-y-3.5 leading-relaxed text-[#B2C7DE]">
              <p>
                <strong>Security Mandate Compliance:</strong> database passwords, API keys, and .env files are never exposed to the browser. This panel only shows safe configured/missing flags returned by the backend.
              </p>

              <div className="p-3 bg-slate-950 border border-slate-805 rounded text-[11px] font-mono select-none space-y-2">
                <div>
                  <span className="text-slate-500 uppercase block text-[9px]">LLM_API_KEY status</span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    {settings.llmApiConfigured ? 'CONFIGURED' : 'MISSING - DEMO PROVIDER USED'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 uppercase block text-[9px]">Database access mode</span>
                  <strong className="text-slate-350 truncate block">SSB MySQL read-only adapter ({settings.dbDialect || 'mysql'})</strong>
                </div>

                <div>
                  <span className="text-slate-500 uppercase block text-[9px]">Secrets exposed to browser</span>
                  <strong className="text-slate-350 truncate block">{settings.secretsExposed ? 'YES - CHECK CONFIG' : 'NO'}</strong>
                </div>
              </div>

              <p className="text-[10px] text-slate-505">
                Configure variables in .env or Docker environment. Do not paste secrets into the frontend.
              </p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-250 p-4 rounded font-mono text-xs text-yellow-950 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-amber-805 uppercase">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              Operational Reminder
            </div>
            <p className="text-[10px] leading-relaxed text-amber-900">
              Live mode requires backend environment credentials for the configured providers: {llmLabel}, {imageLabel}, {searchLabel}, and optional SSB MySQL. Missing keys produce clear backend messages instead of crashing the app.
            </p>
            {settings.messages && settings.messages.length > 0 && (
              <ul className="mt-2 space-y-1 text-[10px] leading-relaxed text-amber-900">
                {settings.messages.map((message, idx) => <li key={idx}>- {message}</li>)}
              </ul>
            )}
          </div>

          <div className="bg-white border-2 border-slate-900 rounded p-4 font-mono text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#0B2545] uppercase tracking-widest">
              <Database className="w-4 h-4" />
              Current Data Policy
            </div>
            <p className="text-[10px] leading-relaxed text-slate-600">
              SSB SKU data is read-only. Listings, traces, costs, reviews, and images are saved locally to SQLite and artifacts, never written back to SSB.
            </p>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
              <Settings className="w-4 h-4 text-slate-500" />
              Budget target: {settings.budgetTargetRmb || 1500} RMB with simulated provider cost ledger.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
