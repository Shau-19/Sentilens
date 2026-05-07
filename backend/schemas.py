"""
SentiLens | Pydantic Schemas
=============================
All request/response models. Strict typing throughout.
"""

from pydantic import BaseModel, Field
from typing import List, Literal
from enum import Enum


class Polarity(str, Enum):
    positive = "positive"
    negative = "negative"
    neutral  = "neutral"
    conflict = "conflict"


class AspectResult(BaseModel):
    """One detected aspect term with its sentiment."""
    term:      str
    polarity:  Polarity
    start:     int       # char offset in original text
    end:       int       # char offset in original text
    confidence: float    # polarity confidence score 0–1


class AnalyseRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=5,
        max_length=2000,
        description="Review text to analyse",
        json_schema_extra={"example": "The food was amazing but the service was incredibly slow."}
    )


class AnalyseResponse(BaseModel):
    text:          str
    aspects:       List[AspectResult]
    summary:       dict   # {"positive": 2, "negative": 1, "neutral": 0}
    latency_ms:    float


class BatchRequest(BaseModel):
    reviews: List[str] = Field(
        ...,
        min_length=1,
        max_length=500,
        description="List of review texts"
    )


class AspectSummary(BaseModel):
    """Aggregated stats for one aspect term across many reviews."""
    term:       str
    count:      int
    positive:   int
    negative:   int
    neutral:    int
    sentiment_score: float   # -1 to +1


class BatchResponse(BaseModel):
    total_reviews:    int
    total_aspects:    int
    aspect_summary:   List[AspectSummary]
    top_positive:     List[str]   # most positive aspect terms
    top_negative:     List[str]   # most negative aspect terms
    latency_ms:       float


class ModelInfo(BaseModel):
    name:          str
    architecture:  str
    params_total:  int
    d_model:       int
    n_heads:       int
    n_layers:      int
    d_ff:          int
    dataset:       str
    asp_f1:        float
    baseline_f1:   float
    wandb_url:     str
    github_url:    str


class HealthResponse(BaseModel):
    status:      Literal["ok", "degraded"]
    model:       str
    latency_ms:  float