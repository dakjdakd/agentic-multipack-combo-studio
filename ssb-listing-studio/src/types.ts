export type WorkflowType = 'listing' | 'multipack' | 'combo';
export type JobStatus = 'completed' | 'pending' | 'running' | 'failed';

export interface Product {
  sku: string;
  title: string;
  brand: string;
  category: string;
  color: string;
  material: string;
  dimensions: {
    length: number | null;
    width: number | null;
    height: number | null;
    unit: string;
  };
  weight: {
    value: number | null;
    unit: string;
  };
  image: string;
  normalizedJson: string; // Prette-formatted custom specs JSON
  rawFields: Record<string, any>; // Mock of raw legacy DB fields
  missingFields: string[];
  unitCount: number;
  source?: 'ssb_mysql' | 'demo';
  warnings?: string[];
}

export interface AmazonListing {
  sku: string;
  title: string;
  bullets: string[];
  description: string;
  searchTerms: string;
  aPlusModules: {
    id: string;
    type?: 'header-text' | 'three-column' | 'single-image-sidebar' | string;
    moduleType?: string;
    title?: string;
    headline?: string;
    body: string;
    imageUrl?: string;
    imagePath?: string;
    altText?: string;
    imageSize?: string;
  }[];
  images: {
    main: string;
    lifestyle: string;
    infographic: string;
    aPlus: string;
  };
  compliancePassed: boolean;
  score: number;
  physicalAttributes?: Record<string, any>;
}

export interface TaskJob {
  jobId: string;
  sku: string;
  workflowType: WorkflowType;
  status: JobStatus;
  cost: number;
  costRmb?: number;
  time: string;
}

export interface ToolCall {
  name: string;
  input: string;
  durationMs: number;
}

export interface AgentStepTrace {
  agentName: 'Supervisor' | 'Product Loader' | 'Research' | 'Copy' | 'Image' | 'Critic' | 'Compliance' | 'Recomposition' | string;
  inputSummary: string;
  toolCalls: ToolCall[];
  outputArtifact: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  promptSnippet: string;
  warningsOrErrors?: string;
}

export interface TraceGroup {
  jobId: string;
  sku: string;
  workflowType: WorkflowType;
  timestamp: string;
  steps: AgentStepTrace[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  recomposeResult?: {
    intent: string;
    referencedSku: string;
    originalSku: string;
    unitCount: number;
    weight: string;
    dimensions: string;
    title: string;
    bullets: string[];
    images: {
      original: string;
      recomposed: string;
    };
  };
}

export interface ComplianceRuleReport {
  id: string;
  rule: string;
  status: 'passed' | 'failed' | 'warning';
  observedValue: string;
  expectedLimit: string;
}

export interface PhysicalConsistencyReport {
  expectedColor: string;
  observedColorInImage: string;
  expectedMaterial: string;
  observedMaterialInImage: string;
  expectedUnitCount: number;
  observedUnitCountInImage: number;
  imageCriticVerdict: string;
}

export interface ReviewItem {
  id: string;
  sku: string;
  workflowType: WorkflowType;
  requestDate: string;
  originalListing: {
    title: string;
    bullets: string[];
    description: string;
  } | null;
  generatedListing: AmazonListing;
  complianceReport: ComplianceRuleReport[];
  physicalConsistency: PhysicalConsistencyReport;
  status: 'pending' | 'approved' | 'rejected' | 'revision-requested';
  revisionNotes?: string;
}

export interface BudgetConfig {
  targetRmb: number;
  spentRmb: number;
  remainingRmb: number;
  forecastRmb: number;
}

export interface CostBreakdown {
  costBasis?: string;
  costNotice?: string;
  llmProvider?: string;
  llmModel?: string;
  imageProvider?: string;
  imageModel?: string;
  searchProvider?: string;
  llmInputTokens: number;
  llmOutputTokens: number;
  llmInputCostRmb?: number;
  llmOutputCostRmb?: number;
  imageGenerationsCount: number;
  imageGenerationCostRmb?: number;
  webSearchesCount: number;
  webSearchCostRmb?: number;
  retriesCount: number;
  retriesCostRmb?: number;
  cachedSavingsRmb: number;
  perAgentCosts?: {
    name: string;
    calls: number;
    tokens: string;
    latency: string;
    costRmb: number;
    efficiency: string;
  }[];
}

export interface EvaluationHarness {
  selectedSkus: string[];
  complianceScore: number;
  physicalConsistencyScore: number;
  listingQualityScore: number;
  overallScore: number;
}

export interface SettingsState {
  dbConfigured: boolean;
  dbReachable?: boolean;
  dbDialect?: string;
  llmApiConfigured: boolean;
  imageApiConfigured: boolean;
  searchApiConfigured: boolean;
  demoMode: boolean;
  llmProvider: string;
  llmModel?: string;
  llmBaseUrlConfigured?: boolean;
  imageProvider: string;
  imageModel?: string;
  imageBaseUrlConfigured?: boolean;
  searchProvider: string;
  searchBaseUrlConfigured?: boolean;
  visionModel?: string;
  budgetTargetRmb?: number;
  secretsExposed?: boolean;
  messages?: string[];
}

export interface ListingApiResponse {
  jobId: string;
  listing: AmazonListing;
  complianceReport: ComplianceRuleReport[];
  physicalConsistency: PhysicalConsistencyReport;
  costSummary: BudgetConfig & CostBreakdown;
  reviewId?: string;
  trace: AgentStepTrace[];
}

export interface ProductsApiResponse {
  items: Product[];
  nextCursor?: string | null;
  source: 'ssb_mysql' | 'demo';
}

export interface ReviewsApiResponse {
  items: ReviewItem[];
}

export interface ChatApiResponse {
  jobId?: string;
  sessionId: string;
  intent: string;
  referencedSkus: string[];
  assistantMessage: string;
  recomposeResult?: ChatMessage['recomposeResult'];
  listing?: AmazonListing;
  trace?: AgentStepTrace[];
}

export interface EnrichmentApiResponse {
  jobId: string;
  sku: string;
  cacheHit: boolean;
  enrichedFields: {
    field: string;
    value: any;
    sourceUrl: string;
    confidence: number;
    notes: string;
    evidence?: string[];
    citations?: {
      sourceId?: string;
      title?: string;
      url: string;
      snippet?: string;
      demo?: boolean;
    }[];
    conflict?: Record<string, any> | null;
    demo?: boolean;
  }[];
  conflicts: Record<string, any>[];
  missingFields: string[];
  trace: Record<string, any>[];
}

export interface JobsApiResponse {
  items: {
    jobId: string;
    sku: string;
    workflowType: WorkflowType;
    status: JobStatus;
    costRmb: number;
    artifactDir?: string;
    createdAt: string;
    completedAt?: string | null;
  }[];
}

export interface VariationGroup {
  parentSku?: string | null;
  items: {
    sku: string;
    color?: string;
    size?: string | null;
    volume?: string | null;
    relationType?: string | null;
  }[];
  pricingSuggestion: {
    suggestedPrice?: number | null;
    confidence: number;
    notes: string;
  };
}
