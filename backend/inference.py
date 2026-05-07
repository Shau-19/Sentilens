
import os, time
from pathlib import Path
from typing import List, Tuple

import torch
import numpy as np
from transformers import AutoTokenizer

from schemas import AspectResult, Polarity
from clause_splitter import split_into_clauses, adjust_aspect_offsets

BIO2ID = {"O": 0, "B-ASP": 1, "I-ASP": 2}
ID2POL = {0: "positive", 1: "negative", 2: "neutral", 3: "conflict"}

MODEL_DIR = Path(os.environ.get("MODEL_DIR",
              str(Path(__file__).parent.parent / "model")))
TS_PATH  = MODEL_DIR / "sentilens.pt"
TOK_PATH = MODEL_DIR / "tokenizer"
MAX_LEN  = 128


class SentiLensInference:

    def __init__(self):
        self.model     = None
        self.tokeniser = None
        self._load()

    def _load(self):
        tok_path = str(TOK_PATH.resolve())
        print(f"Loading tokeniser from {tok_path}...")
        self.tokeniser = AutoTokenizer.from_pretrained(
            tok_path, use_fast=True, local_files_only=True,
        )

        ts_path = str(TS_PATH.resolve())
        print(f"Loading TorchScript model from {ts_path}...")
        self.model = torch.jit.load(ts_path, map_location="cpu")
        self.model.eval()

        # Warmup
        dummy = self.tokeniser(
            "warm up", return_tensors="pt",
            max_length=MAX_LEN, padding="max_length", truncation=True
        )
        with torch.no_grad():
            self.model(dummy["input_ids"], dummy["attention_mask"])
        print("✓ Model loaded and warmed up")

    def _run_single(self, text: str) -> Tuple[torch.Tensor, torch.Tensor, list, torch.Tensor]:
        """Run model on a single text string. Returns raw logits."""
        enc = self.tokeniser(
            text, return_tensors="pt", max_length=MAX_LEN,
            padding="max_length", truncation=True,
            return_offsets_mapping=True,
        )
        offsets = enc.pop("offset_mapping")[0].tolist()
        with torch.no_grad():
            bio_logits, pol_logits = self.model(
                enc["input_ids"], enc["attention_mask"]
            )
        return bio_logits[0], pol_logits[0], offsets, enc["attention_mask"][0]

    def _decode_aspects(
        self,
        text:    str,
        bio_log: torch.Tensor,
        pol_log: torch.Tensor,
        offsets: list,
        attn:    torch.Tensor,
    ) -> List[AspectResult]:
        """Decode BIO + polarity logits → AspectResult list."""
        bio_pred = bio_log.argmax(dim=-1)
        seq_len  = int(attn.sum().item())
        aspects  = []
        i = 0

        while i < seq_len:
            if bio_pred[i].item() == BIO2ID["B-ASP"]:
                cs, _ = offsets[i]

                # Collect span
                j = i + 1
                while j < seq_len and bio_pred[j].item() == BIO2ID["I-ASP"]:
                    j += 1
                _, ce = offsets[j - 1]

                if cs == 0 and ce == 0:
                    i = j; continue

                term = text[cs:ce].strip()
                if not term:
                    i = j; continue

                # Span-pool polarity logits across all aspect tokens
                span_pol   = pol_log[i:j]
                pooled     = span_pol.mean(dim=0)
                pol_id     = int(pooled.argmax().item())
                confidence = float(torch.softmax(pooled, dim=0)[pol_id].item())

                aspects.append(AspectResult(
                    term=term,
                    polarity=Polarity(ID2POL[pol_id]),
                    start=cs, end=ce,
                    confidence=round(confidence, 3),
                ))
                i = j
            else:
                i += 1

        return aspects

    def predict(self, text: str) -> Tuple[List[AspectResult], float]:
        """
        Main inference call with clause splitting.

        Pipeline:
            1. Split text into clauses on contrastive conjunctions
            2. Run model on each clause independently
            3. Adjust aspect offsets back to original text positions
            4. Merge and deduplicate aspects
        """
        t0 = time.perf_counter()

        clauses = split_into_clauses(text)
        all_aspects = []

        for clause in clauses:
            bio_log, pol_log, offsets, attn = self._run_single(clause.text)
            aspects = self._decode_aspects(
                clause.text, bio_log, pol_log, offsets, attn
            )
            # Shift offsets back to original text positions
            aspects = adjust_aspect_offsets(aspects, clause.offset)
            all_aspects.extend(aspects)

        # Sort by position in original text
        all_aspects.sort(key=lambda a: a.start)

        latency = round((time.perf_counter() - t0) * 1000, 2)
        return all_aspects, latency

    def predict_batch(
        self, texts: List[str]
    ) -> Tuple[List[List[AspectResult]], float]:
        t0      = time.perf_counter()
        results = [self.predict(t)[0] for t in texts]
        return results, round((time.perf_counter() - t0) * 1000, 2)


_engine: SentiLensInference = None

def get_engine() -> SentiLensInference:
    global _engine
    if _engine is None:
        _engine = SentiLensInference()
    return _engine