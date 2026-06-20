import {
  AmazonListing,
  BudgetConfig,
  ChatApiResponse,
  CostBreakdown,
  EvaluationHarness,
  EnrichmentApiResponse,
  ListingApiResponse,
  JobsApiResponse,
  ProductsApiResponse,
  ReviewItem,
  ReviewsApiResponse,
  SettingsState,
  TraceGroup,
  VariationGroup,
} from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      message = body.detail || body.error || message;
    } catch {
      // keep default
    }
    throw new Error(message);
  }
  return res.json();
}

export const api = {
  baseUrl: API_BASE,
  health: () => request<{ ok: boolean; mode: string; version: string; time: string }>('/api/health'),
  settings: () => request<SettingsState>('/api/settings/status'),
  products: () => request<ProductsApiResponse>('/api/products?limit=80'),
  jobs: () => request<JobsApiResponse>('/api/jobs'),
  product: (sku: string) => request(`/api/products/${encodeURIComponent(sku)}`),
  enrich: (sku: string) => request<EnrichmentApiResponse>(`/api/enrich/${encodeURIComponent(sku)}`, { method: 'POST' }),
  listing: (sku: string, mode: 'full' | 'copy_only' | 'images_only' = 'full') =>
    request<ListingApiResponse>(`/api/listings/${encodeURIComponent(sku)}`, {
      method: 'POST',
      body: JSON.stringify({ mode, forceRefresh: false, sendToReview: true }),
    }),
  trace: (jobId: string) => request<TraceGroup>(`/api/traces/${encodeURIComponent(jobId)}`),
  reviews: () => request<ReviewsApiResponse>('/api/reviews'),
  approveReview: (id: string) => request(`/api/reviews/${encodeURIComponent(id)}/approve`, { method: 'POST' }),
  rejectReview: (id: string) => request(`/api/reviews/${encodeURIComponent(id)}/reject`, { method: 'POST' }),
  requestRevision: (id: string, notes: string) =>
    request(`/api/reviews/${encodeURIComponent(id)}/request-revision`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),
  costs: () => request<BudgetConfig & CostBreakdown>('/api/costs/summary'),
  evalRun: (skus: string[]) =>
    request<EvaluationHarness & { evalId: string; items: unknown[] }>('/api/evals/run', {
      method: 'POST',
      body: JSON.stringify({ skus, includeGeneration: false }),
    }),
  chat: (sessionId: string, currentSku: string, message: string) =>
    request<ChatApiResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ sessionId, currentSku, message }),
    }),
  variation: (sku: string) => request<VariationGroup>(`/api/variations/${encodeURIComponent(sku)}`),
  artifactUrl: (path: string) => {
    if (!path) return '';
    if (/^https?:\/\//.test(path)) return path;
    return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  },
};

export function listingMapFromResponse(prev: Record<string, AmazonListing>, response: ListingApiResponse) {
  return { ...prev, [response.listing.sku]: withAbsoluteImages(response.listing) };
}

export function withAbsoluteImages(listing: AmazonListing): AmazonListing {
  return {
    ...listing,
    images: {
      main: api.artifactUrl(listing.images.main),
      lifestyle: api.artifactUrl(listing.images.lifestyle),
      infographic: api.artifactUrl(listing.images.infographic),
      aPlus: api.artifactUrl(listing.images.aPlus),
    },
    aPlusModules: listing.aPlusModules.map((m) => ({
      ...m,
      imageUrl: api.artifactUrl(m.imageUrl || m.imagePath || ''),
      title: m.title || m.headline,
      type: m.type || m.moduleType || 'header-text',
    })),
  };
}
