"""
SentiLens | FastAPI Backend
============================
Endpoints:
    GET  /           → redirect to /docs
    GET  /health     → model status + latency
    POST /analyse    → single review → aspects
    POST /analyse/batch → bulk reviews → aggregated report
    GET  /model/info → architecture + training metrics
"""

import time
from collections import defaultdict
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from schemas import (
    AnalyseRequest, AnalyseResponse,
    BatchRequest, BatchResponse, AspectSummary,
    ModelInfo, HealthResponse,
)
from inference import get_engine


# ── Lifespan — load model once at startup ─────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up — loading SentiLens model...")
    get_engine()   # triggers load + warmup
    print("Model ready. Accepting requests.")
    yield
    print("Shutting down.")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="SentiLens API",
    description="""
## Aspect-Based Sentiment Analysis

SentiLens analyses reviews at the **aspect level** — not just "positive" or "negative"
but *which specific aspects* are positive or negative.

**Example:**
Input: `"The food was amazing but the service was incredibly slow."`

Output:
- `food` → **positive** (0.89 confidence)
- `service` → **negative** (0.76 confidence)

Built with a custom 4-layer Transformer trained from scratch on SemEval-2014.
asp_f1 = 0.687, outperforming DistilBERT (66M params) with only 10M parameters.
    """,
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS — allow frontend on any origin during dev ────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten to your Vercel URL in production
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


@app.get("/health", response_model=HealthResponse, tags=["System"])
def health():
    """Check model status and measure a warmup inference latency."""
    engine = get_engine()
    _, latency = engine.predict("The food was great.")
    return HealthResponse(
        status="ok",
        model="sentilens-transformer-v1",
        latency_ms=latency,
    )


@app.post("/analyse", response_model=AnalyseResponse, tags=["Analysis"])
def analyse(req: AnalyseRequest):
    """
    Analyse a single review text.

    Returns aspect terms with polarity labels and char offsets
    (useful for frontend text highlighting).
    """
    if len(req.text.strip()) < 5:
        raise HTTPException(400, "Text too short — need at least 5 characters")

    engine  = get_engine()
    aspects, latency = engine.predict(req.text)

    # Build polarity summary
    summary = {"positive": 0, "negative": 0, "neutral": 0, "conflict": 0}
    for a in aspects:
        summary[a.polarity.value] += 1

    return AnalyseResponse(
        text=req.text,
        aspects=aspects,
        summary=summary,
        latency_ms=latency,
    )


@app.post("/analyse/batch", response_model=BatchResponse, tags=["Analysis"])
def analyse_batch(req: BatchRequest):
    """
    Analyse a list of reviews and return aggregated aspect statistics.

    Useful for: upload 100 restaurant reviews → see which aspects
    (food, service, price, ambiance) are most positive/negative overall.
    """
    if not req.reviews:
        raise HTTPException(400, "No reviews provided")
    if len(req.reviews) > 500:
        raise HTTPException(400, "Max 500 reviews per batch")

    engine  = get_engine()
    results, latency = engine.predict_batch(req.reviews)

    # Aggregate aspect statistics
    # term → {"count", "positive", "negative", "neutral", "conflict"}
    agg = defaultdict(lambda: {
        "count": 0, "positive": 0, "negative": 0,
        "neutral": 0, "conflict": 0
    })

    total_aspects = 0
    for aspects in results:
        for a in aspects:
            key = a.term.lower()
            agg[key]["count"]          += 1
            agg[key][a.polarity.value] += 1
            total_aspects              += 1

    # Build AspectSummary list — sorted by frequency
    summaries = []
    for term, counts in sorted(agg.items(), key=lambda x: -x[1]["count"]):
        pos = counts["positive"]
        neg = counts["negative"]
        total = counts["count"]
        # Sentiment score: +1 = all positive, -1 = all negative
        score = (pos - neg) / total if total > 0 else 0.0
        summaries.append(AspectSummary(
            term=term,
            count=total,
            positive=pos,
            negative=counts["negative"],
            neutral=counts["neutral"],
            sentiment_score=round(score, 3),
        ))

    # Top positive / negative aspects
    top_pos = [s.term for s in sorted(summaries, key=lambda x: -x.sentiment_score)[:5]]
    top_neg = [s.term for s in sorted(summaries, key=lambda x: x.sentiment_score)[:5]]

    return BatchResponse(
        total_reviews=len(req.reviews),
        total_aspects=total_aspects,
        aspect_summary=summaries[:20],  # top 20 by frequency
        top_positive=top_pos,
        top_negative=top_neg,
        latency_ms=latency,
    )


@app.get("/model/info", response_model=ModelInfo, tags=["Model"])
def model_info():
    """Return model architecture details and training metrics."""
    return ModelInfo(
        name="SentiLens Transformer",
        architecture="4-layer custom Transformer encoder + dual classification heads",
        params_total=10_971_911,
        d_model=256,
        n_heads=8,
        n_layers=4,
        d_ff=1024,
        dataset="SemEval-2014 Task 4 (restaurant + laptop domains)",
        asp_f1=0.6874,
        baseline_f1=0.5697,
        wandb_url="https://wandb.ai/shauryajain19052003-guru-gobind-singh-indraprastha-unive/sentilens",
        github_url="https://github.com/shauryajain/sentilens",
    )