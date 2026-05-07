"""
SentiLens | API Tests
======================
Run with: pytest test_api.py -v
Tests every endpoint with real + edge case inputs.
Uses httpx TestClient — no running server needed.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

# ── Mock the inference engine so tests run without ONNX model ─────────────────
from schemas import AspectResult, Polarity

MOCK_ASPECTS = [
    AspectResult(term="food",    polarity=Polarity.positive, start=4,  end=8,  confidence=0.89),
    AspectResult(term="service", polarity=Polarity.negative, start=23, end=30, confidence=0.76),
]

mock_engine = MagicMock()
mock_engine.predict.return_value       = (MOCK_ASPECTS, 45.2)
mock_engine.predict_batch.return_value = ([MOCK_ASPECTS, MOCK_ASPECTS], 92.1)


@pytest.fixture(autouse=True)
def patch_engine():
    with patch("main.get_engine", return_value=mock_engine), \
         patch("inference.get_engine", return_value=mock_engine):
        yield


@pytest.fixture
def client():
    from main import app
    with TestClient(app) as c:
        yield c


# ── Health ─────────────────────────────────────────────────────────────────────

class TestHealth:
    def test_health_ok(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ok"
        assert "latency_ms" in body
        assert "model" in body

    def test_root_redirects(self, client):
        r = client.get("/", follow_redirects=False)
        assert r.status_code in (301, 302, 307, 308)


# ── /analyse ──────────────────────────────────────────────────────────────────

class TestAnalyse:
    def test_basic_review(self, client):
        r = client.post("/analyse", json={
            "text": "The food was amazing but the service was incredibly slow."
        })
        assert r.status_code == 200
        body = r.json()

        assert "aspects" in body
        assert "summary" in body
        assert "latency_ms" in body
        assert body["text"] == "The food was amazing but the service was incredibly slow."

    def test_aspect_fields(self, client):
        r = client.post("/analyse", json={"text": "Great food but slow service."})
        assert r.status_code == 200
        aspects = r.json()["aspects"]

        assert len(aspects) > 0
        for asp in aspects:
            assert "term"       in asp
            assert "polarity"   in asp
            assert "start"      in asp
            assert "end"        in asp
            assert "confidence" in asp
            assert asp["polarity"] in ("positive","negative","neutral","conflict")
            assert 0.0 <= asp["confidence"] <= 1.0
            assert asp["start"] < asp["end"]

    def test_summary_counts(self, client):
        r = client.post("/analyse", json={"text": "Food great, service bad."})
        body   = r.json()
        summary = body["summary"]

        assert set(summary.keys()) == {"positive","negative","neutral","conflict"}
        total_from_summary = sum(summary.values())
        total_aspects      = len(body["aspects"])
        assert total_from_summary == total_aspects

    def test_short_text_rejected(self, client):
        r = client.post("/analyse", json={"text": "ok"})
        assert r.status_code in (400, 422)  # Pydantic catches min_length

    def test_empty_text_rejected(self, client):
        r = client.post("/analyse", json={"text": ""})
        assert r.status_code == 422   # Pydantic validation

    def test_long_text_accepted(self, client):
        long_text = "The food was great. " * 50   # 1000 chars
        r = client.post("/analyse", json={"text": long_text})
        assert r.status_code == 200

    def test_too_long_text_rejected(self, client):
        too_long = "a" * 2001
        r = client.post("/analyse", json={"text": too_long})
        assert r.status_code == 422


# ── /analyse/batch ─────────────────────────────────────────────────────────────

class TestBatch:
    REVIEWS = [
        "The food was amazing but the service was incredibly slow.",
        "Great ambiance but the drinks were overpriced.",
        "Best pasta I have ever had. Will definitely come back.",
    ]

    def test_basic_batch(self, client):
        r = client.post("/analyse/batch", json={"reviews": self.REVIEWS})
        assert r.status_code == 200
        body = r.json()

        assert body["total_reviews"] == 3
        assert "aspect_summary" in body
        assert "top_positive"   in body
        assert "top_negative"   in body
        assert "latency_ms"     in body

    def test_aspect_summary_fields(self, client):
        r = client.post("/analyse/batch", json={"reviews": self.REVIEWS})
        for asp in r.json()["aspect_summary"]:
            assert "term"            in asp
            assert "count"           in asp
            assert "positive"        in asp
            assert "negative"        in asp
            assert "neutral"         in asp
            assert "sentiment_score" in asp
            assert -1.0 <= asp["sentiment_score"] <= 1.0

    def test_empty_batch_rejected(self, client):
        r = client.post("/analyse/batch", json={"reviews": []})
        assert r.status_code in (400, 422)

    def test_single_review_batch(self, client):
        r = client.post("/analyse/batch", json={
            "reviews": ["The battery life is great."]
        })
        assert r.status_code == 200
        assert r.json()["total_reviews"] == 1


# ── /model/info ───────────────────────────────────────────────────────────────

class TestModelInfo:
    def test_model_info_fields(self, client):
        r = client.get("/model/info")
        assert r.status_code == 200
        body = r.json()

        required = [
            "name","architecture","params_total",
            "d_model","n_heads","n_layers","d_ff",
            "dataset","asp_f1","baseline_f1",
            "wandb_url","github_url"
        ]
        for field in required:
            assert field in body, f"Missing field: {field}"

    def test_metrics_sensible(self, client):
        body = client.get("/model/info").json()
        assert 0.5 < body["asp_f1"] < 1.0
        assert 0.4 < body["baseline_f1"] < body["asp_f1"]
        assert body["params_total"] > 1_000_000
        assert body["d_model"] in (128, 256, 512, 768)

    def test_custom_model_beats_baseline(self, client):
        body = client.get("/model/info").json()
        assert body["asp_f1"] > body["baseline_f1"], \
            "Custom model should beat the baseline"


# ── Clause splitter unit tests ─────────────────────────────────────────────────

class TestClauseSplitter:
    def test_splits_on_but(self):
        from clause_splitter import split_into_clauses
        clauses = split_into_clauses("Food was great but service was slow.")
        assert len(clauses) == 2
        assert "Food was great" in clauses[0].text
        assert "service was slow" in clauses[1].text

    def test_splits_on_however(self):
        from clause_splitter import split_into_clauses
        clauses = split_into_clauses("The room was clean. However, the noise was unbearable.")
        assert len(clauses) == 2

    def test_no_split_simple(self):
        from clause_splitter import split_into_clauses
        clauses = split_into_clauses("The food was absolutely delicious.")
        assert len(clauses) == 1
        assert clauses[0].offset == 0

    def test_offset_tracking(self):
        from clause_splitter import split_into_clauses
        text = "Food was great but service was slow."
        clauses = split_into_clauses(text)
        # Second clause should start after "but "
        assert clauses[1].offset > 0
        # Reconstructing from offsets should match original
        for c in clauses:
            assert text[c.offset:c.offset + len(c.text.rstrip())] in text

    def test_multiple_conjunctions(self):
        from clause_splitter import split_into_clauses
        clauses = split_into_clauses(
            "Food was great but service was slow and although the price was high the view was stunning."
        )
        assert len(clauses) >= 3