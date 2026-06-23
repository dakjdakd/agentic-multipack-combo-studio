from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, Field


WorkflowType = Literal["listing", "multipack", "combo"]
JobStatus = Literal["pending", "running", "completed", "failed"]
RuleStatus = Literal["passed", "warning", "failed"]


class Dimensions(BaseModel):
    length: float | None = None
    width: float | None = None
    height: float | None = None
    unit: str = "in"


class Weight(BaseModel):
    value: float | None = None
    unit: str = "lb"


class Product(BaseModel):
    sku: str
    title: str = ""
    brand: str = ""
    category: str = ""
    color: str = ""
    material: str = ""
    dimensions: Dimensions = Field(default_factory=Dimensions)
    weight: Weight = Field(default_factory=Weight)
    image: str = ""
    normalizedJson: str = "{}"
    rawFields: dict[str, Any] = Field(default_factory=dict)
    missingFields: list[str] = Field(default_factory=list)
    unitCount: int = 1
    source: Literal["ssb_mysql", "demo"] = "demo"
    warnings: list[str] = Field(default_factory=list)


class EnrichedField(BaseModel):
    field: str
    value: Any
    sourceUrl: str
    confidence: float = 0.7
    notes: str = ""
    evidence: list[str] = Field(default_factory=list)
    citations: list[dict[str, Any]] = Field(default_factory=list)
    conflict: dict[str, Any] | None = None
    demo: bool = False


class EnrichmentResponse(BaseModel):
    jobId: str
    sku: str
    cacheHit: bool = False
    enrichedFields: list[EnrichedField] = Field(default_factory=list)
    conflicts: list[dict[str, Any]] = Field(default_factory=list)
    missingFields: list[str] = Field(default_factory=list)
    trace: list[dict[str, Any]] = Field(default_factory=list)


class APlusModule(BaseModel):
    id: str
    moduleType: str
    type: str | None = None
    headline: str
    title: str | None = None
    body: str
    imagePath: str = ""
    imageUrl: str | None = None
    altText: str
    imageSize: str = ""


class ListingImages(BaseModel):
    main: str = ""
    lifestyle: str = ""
    infographic: str = ""
    aPlus: str = ""


class AmazonListing(BaseModel):
    sku: str
    title: str
    bullets: list[str]
    description: str
    searchTerms: str
    aPlusModules: list[APlusModule]
    images: ListingImages
    compliancePassed: bool = False
    score: float = 0
    physicalAttributes: dict[str, Any] = Field(default_factory=dict)


class ToolCall(BaseModel):
    name: str
    input: str
    durationMs: int = 0


class AgentStepTrace(BaseModel):
    agentName: str
    inputSummary: str
    toolCalls: list[ToolCall] = Field(default_factory=list)
    outputArtifact: str
    latencyMs: int = 0
    inputTokens: int = 0
    outputTokens: int = 0
    estimatedCostUsd: float = 0
    promptSnippet: str = ""
    warningsOrErrors: str | None = None


class TraceGroup(BaseModel):
    jobId: str
    sku: str
    workflowType: WorkflowType
    timestamp: str
    steps: list[AgentStepTrace]


class ComplianceRuleReport(BaseModel):
    id: str
    rule: str
    status: RuleStatus
    observedValue: str
    expectedLimit: str


class PhysicalConsistencyReport(BaseModel):
    expectedColor: str = ""
    observedColorInImage: str = ""
    expectedMaterial: str = ""
    observedMaterialInImage: str = ""
    expectedUnitCount: int = 1
    observedUnitCountInImage: int = 1
    imageCriticVerdict: str = ""


class CostSummary(BaseModel):
    targetRmb: float
    spentRmb: float
    remainingRmb: float
    forecastRmb: float
    costBasis: str = "estimated"
    costNotice: str = "Estimated ledger values only; not an actual provider invoice for this browser run."
    llmProvider: str = ""
    llmModel: str = ""
    imageProvider: str = ""
    imageModel: str = ""
    searchProvider: str = ""
    llmInputTokens: int = 0
    llmOutputTokens: int = 0
    llmInputCostRmb: float = 0
    llmOutputCostRmb: float = 0
    imageGenerationsCount: int = 0
    imageGenerationCostRmb: float = 0
    webSearchesCount: int = 0
    webSearchCostRmb: float = 0
    retriesCount: int = 0
    retriesCostRmb: float = 0
    cachedSavingsRmb: float = 0
    perAgentCosts: list[dict[str, Any]] = Field(default_factory=list)


class ListingResponse(BaseModel):
    jobId: str
    listing: AmazonListing
    complianceReport: list[ComplianceRuleReport]
    physicalConsistency: PhysicalConsistencyReport
    costSummary: CostSummary
    reviewId: str | None = None
    trace: list[AgentStepTrace] = Field(default_factory=list)


class ListingRequest(BaseModel):
    mode: Literal["full", "copy_only", "images_only"] = "full"
    forceRefresh: bool = False
    sendToReview: bool = True


class ChatRequest(BaseModel):
    sessionId: str = "default"
    currentSku: str
    message: str


class RecomposeResult(BaseModel):
    intent: str
    referencedSku: str
    originalSku: str
    unitCount: int
    weight: str
    dimensions: str
    title: str
    bullets: list[str]
    images: dict[str, str]


class ChatResponse(BaseModel):
    jobId: str | None = None
    sessionId: str
    intent: str
    referencedSkus: list[str] = Field(default_factory=list)
    assistantMessage: str
    recomposeResult: RecomposeResult | None = None
    listing: AmazonListing | None = None
    trace: list[AgentStepTrace] = Field(default_factory=list)


class ReviewItem(BaseModel):
    id: str
    sku: str
    workflowType: WorkflowType
    requestDate: str
    originalListing: dict[str, Any] | None = None
    generatedListing: AmazonListing
    complianceReport: list[ComplianceRuleReport]
    physicalConsistency: PhysicalConsistencyReport
    status: Literal["pending", "approved", "rejected", "revision-requested"] = "pending"
    revisionNotes: str | None = None


class EvalRequest(BaseModel):
    skus: list[str] = Field(default_factory=list)
    includeGeneration: bool = False


class EvalResult(BaseModel):
    evalId: str
    selectedSkus: list[str]
    complianceScore: float
    physicalConsistencyScore: float
    listingQualityScore: float
    overallScore: float
    items: list[dict[str, Any]] = Field(default_factory=list)
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
