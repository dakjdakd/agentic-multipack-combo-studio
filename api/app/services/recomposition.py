from __future__ import annotations

import re
from typing import TypedDict

try:
    from langgraph.graph import END, StateGraph
except Exception:  # pragma: no cover
    END = None
    StateGraph = None

from api.app.db.mysql_repository import ProductRepository
from api.app.models import ChatRequest, ChatResponse, Dimensions, ListingRequest, Product, RecomposeResult, Weight
from api.app.providers.llm import LLMProvider
from api.app.services.listing_workflow import ListingWorkflow


class ChatGraphState(TypedDict, total=False):
    request: ChatRequest
    product: Product
    other_product: Product
    intent: str
    qty: int
    other_sku: str | None
    result: RecomposeResult
    response: ChatResponse
    warnings: list[str]


class RecompositionService:
    def __init__(self, repo: ProductRepository, workflow: ListingWorkflow):
        self.repo = repo
        self.workflow = workflow
        self.llm = LLMProvider(workflow.settings)
        self.graph = self._build_graph()

    def handle(self, req: ChatRequest) -> ChatResponse:
        state: ChatGraphState = {"request": req, "warnings": []}
        final_state = self.graph.invoke(state) if self.graph else self._run_without_langgraph(state)
        return final_state["response"]

    def _build_graph(self):
        if StateGraph is None:
            return None
        graph = StateGraph(ChatGraphState)
        graph.add_node("recomposition_agent", self._node_recomposition_agent)
        graph.add_node("product_resolver", self._node_product_resolver)
        graph.add_node("physical_recalculator", self._node_physical_recalculator)
        graph.add_node("copy_image_critic_compliance", self._node_generate_listing)
        graph.add_node("finalize", self._node_finalize)
        graph.set_entry_point("recomposition_agent")
        graph.add_edge("recomposition_agent", "product_resolver")
        graph.add_conditional_edges("product_resolver", self._should_continue_after_resolve, {"continue": "physical_recalculator", "finalize": "finalize"})
        graph.add_conditional_edges("physical_recalculator", self._should_generate, {"generate": "copy_image_critic_compliance", "finalize": "finalize"})
        graph.add_edge("copy_image_critic_compliance", "finalize")
        graph.add_edge("finalize", END)
        return graph.compile()

    def _run_without_langgraph(self, state: ChatGraphState) -> ChatGraphState:
        state = self._node_recomposition_agent(state)
        state = self._node_product_resolver(state)
        if self._should_continue_after_resolve(state) == "continue":
            state = self._node_physical_recalculator(state)
        if self._should_generate(state) == "generate":
            state = self._node_generate_listing(state)
        return self._node_finalize(state)

    def _node_recomposition_agent(self, state: ChatGraphState) -> ChatGraphState:
        req = state["request"]
        llm_result = self.llm.chat_json(
            "Extract recomposition intent as JSON: intent multipack|combo|clarification, quantity integer, otherSku string or null. Support Chinese and English.",
            req.message,
        )
        parsed = llm_result.json_value or {}
        intent, qty, other_sku = self._parse(req.message)
        candidate_intent = str(parsed.get("intent") or "").lower()
        if candidate_intent in {"multipack", "combo", "clarification"}:
            intent = "unknown" if candidate_intent == "clarification" else candidate_intent
        if isinstance(parsed.get("quantity"), int):
            qty = int(parsed["quantity"])
        if parsed.get("otherSku"):
            other_sku = str(parsed["otherSku"]).strip()
        if llm_result.warning:
            state["warnings"].append(llm_result.warning)
        state["intent"] = intent
        state["qty"] = qty
        state["other_sku"] = other_sku
        return state

    def _node_product_resolver(self, state: ChatGraphState) -> ChatGraphState:
        req = state["request"]
        product = self.repo.get_product(req.currentSku)
        if not product:
            state["response"] = ChatResponse(sessionId=req.sessionId, intent="clarification", assistantMessage=f"I could not find SKU {req.currentSku}. Please choose a valid SKU.")
            return state
        state["product"] = product
        if state["intent"] == "combo":
            if not state.get("other_sku"):
                state["response"] = ChatResponse(sessionId=req.sessionId, intent="clarification", assistantMessage="Which second SKU should be included in the combo?")
                return state
            other = self.repo.get_product(str(state["other_sku"]))
            if not other:
                state["response"] = ChatResponse(sessionId=req.sessionId, intent="clarification", assistantMessage=f"I could not find combo SKU {state['other_sku']}.")
                return state
            state["other_product"] = other
        return state

    def _node_physical_recalculator(self, state: ChatGraphState) -> ChatGraphState:
        req = state["request"]
        intent = state["intent"]
        qty = state["qty"]
        product = state["product"]
        if intent == "multipack":
            if qty < 2 or qty > 12:
                state["response"] = ChatResponse(sessionId=req.sessionId, intent="clarification", assistantMessage="Please choose a multipack quantity from 2 to 12.")
                return state
            state["result"] = self._multipack(product, qty)
        elif intent == "combo":
            state["result"] = self._combo(product, state["other_product"])
        else:
            state["response"] = ChatResponse(sessionId=req.sessionId, intent="clarification", assistantMessage="I can create a multipack or combo. Try: Make this a 3-pack, or Combine this with SKU STAND-ALUM-09.")
        return state

    def _node_generate_listing(self, state: ChatGraphState) -> ChatGraphState:
        result = state["result"]
        product = state["product"]
        if state["intent"] == "multipack":
            response = self.workflow.generate(self._with_recalculated(product, result), ListingRequest(sendToReview=True), workflow_type="multipack", unit_count=state["qty"])
            state["response"] = ChatResponse(jobId=response.jobId, sessionId=state["request"].sessionId, intent="multipack", referencedSkus=[product.sku], assistantMessage=f"Created Pack of {state['qty']}; copy, image metadata, weight, and dimensions were recomputed.", recomposeResult=result, listing=response.listing, trace=response.trace)
        elif state["intent"] == "combo":
            other = state["other_product"]
            combo_label = f"{other.brand} {self._leaf(other)} ({other.sku})"
            response = self.workflow.generate(self._with_recalculated(product, result), ListingRequest(sendToReview=True), workflow_type="combo", unit_count=result.unitCount, combo_label=combo_label)
            state["response"] = ChatResponse(jobId=response.jobId, sessionId=state["request"].sessionId, intent="combo", referencedSkus=[product.sku, other.sku], assistantMessage=f"Created combo for {product.sku} and {other.sku}; copy, images, and physical attributes were recomputed.", recomposeResult=result, listing=response.listing, trace=response.trace)
        return state

    @staticmethod
    def _should_continue_after_resolve(state: ChatGraphState) -> str:
        return "finalize" if state.get("response") else "continue"

    @staticmethod
    def _should_generate(state: ChatGraphState) -> str:
        return "generate" if state.get("result") and not state.get("response") else "finalize"

    @staticmethod
    def _node_finalize(state: ChatGraphState) -> ChatGraphState:
        if "response" not in state:
            req = state["request"]
            state["response"] = ChatResponse(sessionId=req.sessionId, intent="clarification", assistantMessage="I need a clear multipack quantity or a second SKU for combo generation.")
        return state

    @staticmethod
    def _parse(message: str) -> tuple[str, int, str | None]:
        text = message.lower()
        qty_match = re.search(r"(\d+)\s*[- ]?(pack|件装|个装|入|pcs|piece|pieces)", text)
        qty = int(qty_match.group(1)) if qty_match else 3
        sku_match = re.search(r"sku\s+([a-z0-9_-]+)|with\s+(?:sku\s+)?([a-z0-9_-]+)|和\s*(?:sku\s+)?([a-z0-9_-]+)|跟\s*(?:sku\s+)?([a-z0-9_-]+)", message, flags=re.I)
        other = next((g for g in (sku_match.groups() if sku_match else []) if g), None)
        if any(word in text for word in ["combine", "combo", "bundle", "组合", "一起", "和", "搭配"]) and other:
            return "combo", qty, other
        if any(word in text for word in ["pack", "件装", "个装", "multipack", "multi-pack"]):
            return "multipack", qty, None
        if other:
            return "combo", qty, other
        return "unknown", qty, None

    def _multipack(self, product: Product, qty: int) -> RecomposeResult:
        base_w = product.weight.value or 0
        total_w = base_w * qty + max(0.1, base_w * qty * 0.08)
        d = product.dimensions
        length = (d.length or 1) + 0.2
        width = (d.width or 1) + 0.2
        height = (d.height or 1) * qty + 0.2
        title = f"{product.brand} {self._leaf(product)} Pack of {qty} - {product.color} {product.material}"
        bullets = [
            f"PACK OF {qty}: Includes exactly {qty} matching units for multi-room, travel, or replacement use.",
            f"RECALCULATED WEIGHT: Estimated package weight is {total_w:.2f} lb including protective packaging.",
            f"PHYSICAL MATCH: Bundle preserves the catalog color {product.color} and material {product.material}.",
            "UPDATED IMAGE BRIEF: Generated image must show exactly the requested number of units.",
            "A+ READY OUTPUT: Copy, search terms, image metadata, and compliance checks are regenerated together.",
        ]
        return RecomposeResult(intent="multipack", referencedSku=product.sku, originalSku=product.sku, unitCount=qty, weight=f"{total_w:.2f} lb", dimensions=f"{length:.1f} x {width:.1f} x {height:.1f} in", title=title, bullets=bullets, images={"original": product.image, "recomposed": ""})

    def _combo(self, a: Product, b: Product) -> RecomposeResult:
        aw = a.weight.value or 0
        bw = b.weight.value or 0
        total_w = aw + bw + max(0.15, (aw + bw) * 0.1)
        ad, bd = a.dimensions, b.dimensions
        length = max(ad.length or 1, bd.length or 1) + 0.4
        width = max(ad.width or 1, bd.width or 1) + 0.4
        height = (ad.height or 1) + (bd.height or 1) + 0.4
        title = f"{a.brand} {self._leaf(a)} and {b.brand} {self._leaf(b)} Combo Bundle"
        bullets = [
            f"COMBO BUNDLE: Includes {a.sku} and {b.sku} in one coordinated listing.",
            f"COMBINED WEIGHT: Estimated package weight is {total_w:.2f} lb with protective packaging.",
            f"DUAL VALUE STORY: Merges {self._leaf(a)} and {self._leaf(b)} benefits without duplicate claims.",
            "UPDATED IMAGE BRIEF: Generated image must show both products together in one frame.",
            "REVIEW READY: Physical attributes, copy, A+ modules, and compliance checks are regenerated.",
        ]
        return RecomposeResult(intent="combo", referencedSku=b.sku, originalSku=a.sku, unitCount=max(1, a.unitCount) + max(1, b.unitCount), weight=f"{total_w:.2f} lb", dimensions=f"{length:.1f} x {width:.1f} x {height:.1f} in", title=title, bullets=bullets, images={"original": a.image, "recomposed": b.image})

    @staticmethod
    def _leaf(product: Product) -> str:
        return product.category.split(">")[-1].strip() if product.category else "Product"

    @staticmethod
    def _with_recalculated(product: Product, result: RecomposeResult) -> Product:
        updated = product.model_copy(deep=True)
        updated.unitCount = result.unitCount
        return updated

    @staticmethod
    def _parse(message: str) -> tuple[str, int, str | None]:
        text = message.lower()
        qty_match = re.search(r"(\d+)\s*[- ]?(pack|packs|件装|个装|件套|个套|pcs|piece|pieces)", text)
        qty = int(qty_match.group(1)) if qty_match else 3
        sku_match = re.search(
            r"sku\s+([a-z0-9_-]+)|with\s+(?:sku\s+)?([a-z0-9_-]+)|和\s*(?:sku\s+)?([a-z0-9_-]+)|搭配\s*(?:sku\s+)?([a-z0-9_-]+)",
            message,
            flags=re.I,
        )
        other = next((g for g in (sku_match.groups() if sku_match else []) if g), None)
        if any(word in text for word in ["combine", "combo", "bundle", "组合", "一起", "和", "搭配"]) and other:
            return "combo", qty, other
        if any(word in text for word in ["pack", "件装", "个装", "件套", "个套", "multipack", "multi-pack"]):
            return "multipack", qty, None
        if other:
            return "combo", qty, other
        return "unknown", qty, None

    @staticmethod
    def _with_recalculated(product: Product, result: RecomposeResult) -> Product:
        updated = product.model_copy(deep=True)
        updated.unitCount = result.unitCount
        weight_match = re.search(r"-?\d+(?:\.\d+)?", result.weight)
        dim_match = re.search(r"(-?\d+(?:\.\d+)?)\s*x\s*(-?\d+(?:\.\d+)?)\s*x\s*(-?\d+(?:\.\d+)?)", result.dimensions, flags=re.I)
        if weight_match:
            updated.weight = Weight(value=float(weight_match.group(0)), unit="lb")
        if dim_match:
            updated.dimensions = Dimensions(
                length=float(dim_match.group(1)),
                width=float(dim_match.group(2)),
                height=float(dim_match.group(3)),
                unit="in",
            )
        updated.rawFields = {
            **updated.rawFields,
            "recomposition_intent": result.intent,
            "recomputed_weight": result.weight,
            "recomputed_dimensions": result.dimensions,
            "source_skus": [result.originalSku, result.referencedSku] if result.intent == "combo" else [result.originalSku],
        }
        return updated
