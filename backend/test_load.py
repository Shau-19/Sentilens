# test_load.py  — put this in E:\sentilens\backend\ and run it
from transformers import PreTrainedTokenizerFast
import os

tok_path = r"E:\sentilens\model\tokenizer"

# Use PreTrainedTokenizerFast directly — bypasses HF hub validation entirely
tok = PreTrainedTokenizerFast.from_pretrained(tok_path)
print("✓ Tokeniser loaded:", tok.__class__.__name__)