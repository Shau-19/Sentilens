
import re
from typing import List, Tuple
from dataclasses import dataclass


@dataclass
class Clause:
    text:   str    # clause text
    offset: int    # start position in original sentence


# Contrastive conjunctions that signal sentiment shift
CONTRASTIVE = [
    r'\bbut\b',
    r'\bhowever\b',
    r'\balthough\b',
    r'\bthough\b',
    r'\byet\b',
    r'\bwhereas\b',
    r'\bnevertheless\b',
    r'\bnonetheless\b',
    r'\beven though\b',
    r'\bdespite\b',
    r'\bwhile\b',        # only when used contrastively
]

# Combined pattern — matches any contrastive conjunction
SPLIT_PATTERN = re.compile(
    '|'.join(CONTRASTIVE),
    re.IGNORECASE
)

# Minimum clause length to bother processing (chars)
MIN_CLAUSE_LEN = 8


def split_into_clauses(text: str) -> List[Clause]:
    """
    Split text into clauses on contrastive conjunctions.

    Returns list of Clause objects with original char offsets.
    If no contrastive conjunction found, returns single clause
    (the full text) — no-op, model behaviour unchanged.

    Examples:
        "Food was great but service was slow."
        → [Clause("Food was great", 0),
           Clause("service was slow.", 20)]

        "The food was absolutely amazing." (no conjunction)
        → [Clause("The food was absolutely amazing.", 0)]
    """
    clauses = []
    last_end = 0

    for match in SPLIT_PATTERN.finditer(text):
        # Text before the conjunction
        clause_text = text[last_end:match.start()].strip()
        if len(clause_text) >= MIN_CLAUSE_LEN:
            # Find actual start of this clause in original text
            actual_start = text.index(clause_text, last_end) if clause_text in text[last_end:] else last_end
            clauses.append(Clause(text=clause_text, offset=actual_start))
        last_end = match.end()

    # Remaining text after last conjunction
    remainder = text[last_end:].strip()
    if len(remainder) >= MIN_CLAUSE_LEN:
        actual_start = text.index(remainder, last_end) if remainder in text[last_end:] else last_end
        clauses.append(Clause(text=remainder, offset=actual_start))

    # If no split happened (or all clauses too short), return full text
    if not clauses:
        return [Clause(text=text.strip(), offset=0)]

    return clauses


def adjust_aspect_offsets(aspects, clause_offset: int):
    """
    Add clause offset to aspect char positions.
    Aspects are detected within a clause — their offsets are
    relative to the clause start. We shift them back to original.
    """
    for asp in aspects:
        asp.start += clause_offset
        asp.end   += clause_offset
    return aspects