import { useEffect, useMemo, useState } from 'react';
import {
  INITIAL_BUDGET,
  INITIAL_COSTS_BREAKDOWN,
  INITIAL_EVALUATION,
  INITIAL_JOBS,
  INITIAL_LISTINGS,
  INITIAL_PRODUCTS,
  INITIAL_REVIEWS,
  INITIAL_SETTINGS,
} from './data';
import {
  AmazonListing,
  ChatMessage,
  EvaluationHarness,
  Product,
  ReviewItem,
  SettingsState,
  TaskJob,
  TraceGroup,
} from './types';
import { api, listingMapFromResponse, withAbsoluteImages } from './api/client';

import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import ProductsView from './components/ProductsView';
import ListingStudioView from './components/ListingStudioView';
import AgentTraceView from './components/AgentTraceView';
import ChatRecomposerView from './components/ChatRecomposerView';
import ReviewView from './components/ReviewView';
import CostsEvalView from './components/CostsEvalView';
import SettingsView from './components/SettingsView';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [listings, setListings] = useState<Record<string, AmazonListing>>({});
  const [jobs, setJobs] = useState<TaskJob[]>([]);
  const [traces, setTraces] = useState<Record<string, TraceGroup>>({});
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [budget, setBudget] = useState(INITIAL_BUDGET);
  const [costsBreakdown, setCostsBreakdown] = useState(INITIAL_COSTS_BREAKDOWN);
  const [evalHarness, setEvalHarness] = useState<EvaluationHarness>(INITIAL_EVALUATION);
  const [settings, setSettings] = useState<SettingsState>(INITIAL_SETTINGS);
  const [selectedSku, setSelectedSku] = useState<string>('');
  const [isEvalLoading, setIsEvalLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'System initialized. Choose a SKU, then ask for a multipack or combo. Backend APIs drive this workflow; demo fallback is clearly marked when live providers are missing.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  useEffect(() => {
    void bootstrap();
  }, []);

  const activeProduct = useMemo(() => products.find((p) => p.sku === selectedSku), [products, selectedSku]);

  async function bootstrap() {
    try {
      const [settingsRes, productsRes, costsRes, reviewsRes, jobsRes] = await Promise.all([
        api.settings(),
        api.products(),
        api.costs(),
        api.reviews(),
        api.jobs(),
      ]);
      setSettings(settingsRes);
      setProducts(productsRes.items);
      setSelectedSku(productsRes.items[0]?.sku || '');
      applyCostSummary(costsRes);
      setReviews(reviewsRes.items.map(normalizeReviewImages));
      setJobs(jobsRes.items.map((j) => ({
        jobId: j.jobId,
        sku: j.sku,
        workflowType: j.workflowType,
        status: j.status,
        cost: (j.costRmb || 0) / 7.2,
        costRmb: j.costRmb || 0,
        time: (j.createdAt || new Date().toISOString()).replace('T', ' ').substring(0, 19),
      })));
      setSelectedJobId(jobsRes.items[0]?.jobId || '');
      setListings({});
      setGlobalError('');
    } catch (err) {
      setGlobalError(`Backend unavailable, using local UI fallback: ${(err as Error).message}`);
      setProducts(INITIAL_PRODUCTS);
      setListings(INITIAL_LISTINGS);
      setJobs(INITIAL_JOBS);
      setReviews(INITIAL_REVIEWS);
      setSelectedSku(INITIAL_PRODUCTS[0]?.sku || '');
      setSettings({ ...INITIAL_SETTINGS, demoMode: true, messages: ['Frontend fallback is active because backend is unavailable.'] });
    }
  }

  function applyCostSummary(summary: typeof INITIAL_BUDGET & typeof INITIAL_COSTS_BREAKDOWN) {
    setBudget({
      targetRmb: summary.targetRmb,
      spentRmb: summary.spentRmb,
      remainingRmb: summary.remainingRmb,
      forecastRmb: summary.forecastRmb,
    });
    setCostsBreakdown({
      llmInputTokens: summary.llmInputTokens,
      llmOutputTokens: summary.llmOutputTokens,
      imageGenerationsCount: summary.imageGenerationsCount,
      webSearchesCount: summary.webSearchesCount,
      retriesCount: summary.retriesCount,
      cachedSavingsRmb: summary.cachedSavingsRmb,
      perAgentCosts: summary.perAgentCosts,
    });
  }

  function addJob(jobId: string, sku: string, workflowType: TaskJob['workflowType'], costRmb = 0, status: TaskJob['status'] = 'completed') {
    setJobs((prev) => [
      {
        jobId,
        sku,
        workflowType,
        status,
        cost: costRmb / 7.2,
        costRmb,
        time: new Date().toISOString().replace('T', ' ').substring(0, 19),
      },
      ...prev.filter((j) => j.jobId !== jobId),
    ]);
  }

  async function refreshReviewsAndCosts() {
    const [reviewsRes, costsRes] = await Promise.all([api.reviews(), api.costs()]);
    setReviews(reviewsRes.items.map(normalizeReviewImages));
    applyCostSummary(costsRes);
  }

  async function handleEnrichProduct(sku: string) {
    try {
      const response = await api.enrich(sku);
      setProducts((prev) =>
        prev.map((p) =>
          p.sku === sku
            ? {
                ...p,
                normalizedJson: JSON.stringify({ ...JSON.parse(p.normalizedJson || '{}'), enrichment: response.enrichedFields }, null, 2),
                missingFields: response.missingFields || p.missingFields,
              }
            : p,
        ),
      );
      const costs = await api.costs();
      applyCostSummary(costs);
      setGlobalError('');
    } catch (err) {
      setGlobalError(`Enrichment failed: ${(err as Error).message}`);
    }
  }

  async function handleGenerateListing(sku: string, mode: 'full' | 'copy_only' | 'images_only' = 'full') {
    setSelectedSku(sku);
    setActiveTab('listing-studio');
    try {
      addJob(`running-${Date.now()}`, sku, 'listing', 0, 'running');
      const response = await api.listing(sku, mode);
      setListings((prev) => listingMapFromResponse(prev, response));
      setTraces((prev) => ({
        ...prev,
        [response.jobId]: {
          jobId: response.jobId,
          sku,
          workflowType: 'listing',
          timestamp: new Date().toISOString(),
          steps: response.trace,
        },
      }));
      setSelectedJobId(response.jobId);
      addJob(response.jobId, sku, 'listing', response.costSummary.spentRmb);
      applyCostSummary(response.costSummary);
      await refreshReviewsAndCosts();
      setGlobalError('');
    } catch (err) {
      setGlobalError(`Listing generation failed: ${(err as Error).message}`);
      setJobs((prev) => prev.map((j) => (j.sku === sku && j.status === 'running' ? { ...j, status: 'failed' } : j)));
    }
  }

  function handleSaveListing(sku: string, updatedListing: AmazonListing) {
    setListings((prev) => ({ ...prev, [sku]: updatedListing }));
  }

  async function handleSendToReview(_sku: string) {
    await refreshReviewsAndCosts();
    setActiveTab('review');
  }

  async function handleApproveReview(id: string) {
    try {
      await api.approveReview(id);
      await refreshReviewsAndCosts();
    } catch (err) {
      setGlobalError(`Approve failed: ${(err as Error).message}`);
    }
  }

  async function handleRejectReview(id: string) {
    try {
      await api.rejectReview(id);
      await refreshReviewsAndCosts();
    } catch (err) {
      setGlobalError(`Reject failed: ${(err as Error).message}`);
    }
  }

  async function handleRequestRevision(id: string, notes: string) {
    try {
      await api.requestRevision(id, notes);
      await refreshReviewsAndCosts();
    } catch (err) {
      setGlobalError(`Revision request failed: ${(err as Error).message}`);
    }
  }

  async function handleTriggerBenchmark() {
    if (isEvalLoading) return;
    setIsEvalLoading(true);
    try {
      const result = await api.evalRun(products.slice(0, 3).map((p) => p.sku));
      setEvalHarness({
        selectedSkus: result.selectedSkus,
        complianceScore: result.complianceScore,
        physicalConsistencyScore: result.physicalConsistencyScore,
        listingQualityScore: result.listingQualityScore,
        overallScore: result.overallScore,
      });
      const costs = await api.costs();
      applyCostSummary(costs);
      setGlobalError('');
    } catch (err) {
      setGlobalError(`Evaluation failed: ${(err as Error).message}`);
    } finally {
      setIsEvalLoading(false);
    }
  }

  async function handleChatPrompt(currentSku: string, message: string) {
    const userMsg: ChatMessage = {
      id: `m-usr-${Date.now()}`,
      sender: 'user',
      text: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatHistory((prev) => [...prev, userMsg]);
    try {
      const response = await api.chat('s1', currentSku, message);
      const assistantMsg: ChatMessage = {
        id: `m-ast-${Date.now()}`,
        sender: 'assistant',
        text: response.assistantMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recomposeResult: response.recomposeResult
          ? {
              ...response.recomposeResult,
              images: {
                original: api.artifactUrl(response.recomposeResult.images.original),
                recomposed: response.listing ? api.artifactUrl(response.listing.images.main) : api.artifactUrl(response.recomposeResult.images.recomposed),
              },
            }
          : undefined,
      };
      setChatHistory((prev) => [...prev, assistantMsg]);
      if (response.listing && response.jobId) {
        const listing = withAbsoluteImages(response.listing);
        setListings((prev) => ({ ...prev, [listing.sku]: listing }));
        setTraces((prev) => ({
          ...prev,
          [response.jobId!]: {
            jobId: response.jobId!,
            sku: currentSku,
            workflowType: response.intent === 'combo' ? 'combo' : 'multipack',
            timestamp: new Date().toISOString(),
            steps: response.trace || [],
          },
        }));
        setSelectedJobId(response.jobId);
        addJob(response.jobId, currentSku, response.intent === 'combo' ? 'combo' : 'multipack', budget.spentRmb);
        await refreshReviewsAndCosts();
      }
      setGlobalError('');
    } catch (err) {
      setGlobalError(`Chat recomposition failed: ${(err as Error).message}`);
    }
  }

  const displayedSettings = {
    ...settings,
    demoMode: settings.demoMode,
  };

  return (
    <div className="flex h-screen bg-[#F0EBE1] text-slate-900 overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} demoMode={displayedSettings.demoMode} onToggleDemoMode={() => setSettings((prev) => ({ ...prev, demoMode: !prev.demoMode }))} />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="bg-slate-900 text-[10px] font-mono text-slate-400 py-1 px-8 flex justify-between border-b border-slate-950">
          <span>SSB INTERNAL OPERATIONS SYSTEM // CONTROL PLATFORM</span>
          <span>{settings.demoMode ? 'DEMO PROVIDERS ACTIVE' : 'LIVE PROVIDER CONFIG REQUESTED'}</span>
        </div>
        {globalError && (
          <div className="bg-yellow-50 border-b border-yellow-300 text-yellow-950 text-xs font-mono px-8 py-2">
            {globalError}
          </div>
        )}
        <main className="p-8 max-w-7xl w-full mx-auto flex-1">
          {activeTab === 'dashboard' && (
            <DashboardView products={products} jobs={jobs} onGenerateSku={(sku) => void handleGenerateListing(sku)} onOpenChat={(sku) => { setSelectedSku(sku); setActiveTab('chat-recomposer'); }} onRunEval={() => { setActiveTab('costs-eval'); void handleTriggerBenchmark(); }} onViewJobInTrace={(jobId) => { setSelectedJobId(jobId); setActiveTab('agent-trace'); }} totalSpent={budget.spentRmb} pendingReviewsCount={reviews.filter((r) => r.status === 'pending').length} complianceRate={evalHarness.complianceScore} />
          )}
          {activeTab === 'products' && <ProductsView products={products} onEnrichProduct={(sku) => void handleEnrichProduct(sku)} onGenerateListing={(sku) => void handleGenerateListing(sku)} />}
          {activeTab === 'listing-studio' && <ListingStudioView products={products} listings={listings} selectedSku={selectedSku || products[0]?.sku || ''} setSelectedSku={setSelectedSku} onSaveListing={handleSaveListing} onSendToReview={(sku) => void handleSendToReview(sku)} onPushToLogs={() => undefined} deductBudget={() => undefined} onExecutePipeline={(sku, mode) => void handleGenerateListing(sku, mode)} />}
          {activeTab === 'agent-trace' && <AgentTraceView products={products} jobs={jobs} traces={traces} selectedSku={selectedSku || products[0]?.sku || ''} setSelectedSku={setSelectedSku} selectedJobId={selectedJobId} setSelectedJobId={setSelectedJobId} />}
          {activeTab === 'chat-recomposer' && <ChatRecomposerView products={products} chatHistory={chatHistory} onAddChatMessage={(msg) => setChatHistory((prev) => [...prev, msg])} deductBudget={() => undefined} onSendPrompt={(sku, message) => void handleChatPrompt(sku, message)} activeSkuFromApp={selectedSku || activeProduct?.sku} />}
          {activeTab === 'review' && <ReviewView reviews={reviews} onApproveReview={(id) => void handleApproveReview(id)} onRejectReview={(id) => void handleRejectReview(id)} onRequestRevision={(id, notes) => void handleRequestRevision(id, notes)} />}
          {activeTab === 'costs-eval' && <CostsEvalView budget={budget} costsBreakdown={costsBreakdown} evalHarness={evalHarness} onTriggerBenchmark={handleTriggerBenchmark} isLoading={isEvalLoading} />}
          {activeTab === 'settings' && <SettingsView settings={displayedSettings} onUpdateSettings={setSettings} />}
        </main>
      </div>
    </div>
  );
}

function normalizeReviewImages(item: ReviewItem): ReviewItem {
  return {
    ...item,
    generatedListing: withAbsoluteImages(item.generatedListing),
  };
}
