import { 
  LayoutDashboard, 
  Database, 
  Sparkles, 
  Activity, 
  MessageSquareCode, 
  ClipboardCheck, 
  Coins, 
  Settings, 
  Cpu, 
  ShieldCheck 
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  demoMode: boolean;
  onToggleDemoMode: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, demoMode, onToggleDemoMode }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', index: '01', label: 'DASHBOARD', icon: LayoutDashboard },
    { id: 'products', index: '02', label: 'PRODUCTS DB', icon: Database },
    { id: 'listing-studio', index: '03', label: 'LISTING STUDIO', icon: Sparkles },
    { id: 'agent-trace', index: '04', label: 'AGENT TRACE', icon: Activity },
    { id: 'chat-recomposer', index: '05', label: 'CHAT RECOMPOSER', icon: MessageSquareCode },
    { id: 'review', index: '06', label: 'REVIEW / DIFF', icon: ClipboardCheck },
    { id: 'costs-eval', index: '07', label: 'COSTS & EVAL', icon: Coins },
    { id: 'settings', index: '08', label: 'SETTINGS', icon: Settings },
  ];

  return (
    <div className="w-72 bg-[#0B2545] border-r-2 border-slate-900 flex flex-col justify-between text-[#EEF4F8] h-full shadow-xl">
      {/* Brand Header */}
      <div>
        <div className="p-6 border-b-2 border-slate-900 bg-[#134074]">
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="text-yellow-400 w-5 h-5 animate-pulse" />
            <h1 className="text-sm font-semibold tracking-wider font-mono text-[#EEF4F8]">
              SSB LISTING STUDIO
            </h1>
          </div>
          <p className="text-[10px] text-[#A3BFD9] font-mono tracking-widest uppercase">
            INTERNAL AI CONTROL CONSOLE
          </p>
        </div>

        {/* System Credentials Snippet */}
        <div className="px-6 py-3 bg-[#081F37] border-b border-slate-800 text-[10px] font-mono text-[#7B9EBF] flex justify-between items-center">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
            <span>NODE_LIVE-07</span>
          </div>
          <span className="bg-[#134074] text-[9px] px-1.5 py-0.5 text-white uppercase rounded">
            ROUTED_3000
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between p-3 rounded transition-all duration-150 border uppercase font-mono text-xs tracking-wider cursor-pointer ${
                  isActive
                    ? 'bg-[#EEF4F8] text-[#0B2545] border-yellow-400 font-bold shadow-md transform translate-x-1'
                    : 'bg-transparent text-[#B2C7DE] border-transparent hover:bg-[#134074]/30 hover:text-white hover:border-[#134074]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#0B2545]' : 'text-[#8DA9C4]'}`} />
                  <span>{item.label}</span>
                </div>
                <span className={`text-[9px] font-mono px-2 transition-colors ${
                  isActive ? 'text-[#0B2545]/70 bg-yellow-400/30 rounded' : 'text-[#5F7D95]'
                }`}>
                  {item.index}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Controls: Live Status & Demo Mode Switch */}
      <div className="p-4 border-t-2 border-slate-900 bg-[#081F37] font-mono space-y-3">
        {/* Toggle Mode */}
        <div className="bg-[#134074]/30 p-2.5 rounded border border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#8DA9C4] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              DEMO SIMULATION
            </span>
            <button
              onClick={onToggleDemoMode}
              className={`px-2 py-0.5 text-[9px] rounded font-bold cursor-pointer transition-colors uppercase ${
                demoMode 
                  ? 'bg-emerald-500 text-slate-950' 
                  : 'bg-rose-500/80 text-white'
              }`}
            >
              {demoMode ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="text-[9px] text-[#5F7D95] leading-relaxed">
            {demoMode 
              ? "Running sandbox triggers, avoiding direct LLM & search rate-limit charges."
              : "Live provider queries enabled. Configure your API keys in Settings tab."
            }
          </div>
        </div>

        {/* Console info */}
        <div className="text-[10px] text-[#5F7D95] text-center pt-1 border-t border-slate-800/40">
          SSB Manual v4.11 | Build-Ready
        </div>
      </div>
    </div>
  );
}
