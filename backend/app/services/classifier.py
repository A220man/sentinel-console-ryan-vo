"""AI/ML Issue Classification Service.

Provides deterministic keyword-based classification with optional LLM enhancement.
All methods work offline; LLM is advisory and opt-in.
"""

import hashlib
import json
import re
from dataclasses import dataclass
from typing import Optional

import httpx

from app.core.config import get_settings
from app.models import IssuePriority, IssueType


@dataclass
class ClassificationResult:
    """Result of issue classification."""
    issue_type: IssueType
    priority: IssuePriority
    confidence: float
    reasoning: str
    similarity_hash: str

# Keyword patterns for deterministic classification with weights
# Higher weight = stronger indicator
BUG_KEYWORDS = [
    (r"\bcrash\b", 3.0),
    (r"\bexception\b", 2.5),
    (r"\btraceback\b", 2.5),
    (r"\bpanic\b", 2.5),
    (r"\berror\b", 2.0),
    (r"\bfail\b", 2.0),
    (r"\bbroken\b", 2.0),
    (r"\bdefect\b", 2.0),
    (r"\bregress\b", 2.0),
    (r"\bhang\b", 1.5),
    (r"\bfreeze\b", 1.5),
    (r"\bincorrect\b", 1.5),
    (r"\bwrong\b", 1.5),
    (r"\bunexpected\b", 1.5),
    (r"\bglitch\b", 1.5),
    (r"\bbug\b", 1.0),
    (r"\bissue\b", 0.5),
    (r"\bproblem\b", 0.5),
    (r"\bfix\b", 0.5),
]

FEATURE_KEYWORDS = [
    (r"\bimplement\b", 2.0),
    (r"\bcreate\b", 2.0),
    (r"\bintroduce\b", 2.0),
    (r"\bfeature\b", 1.5),
    (r"\badd\b", 1.5),
    (r"\bnew\b", 1.5),
    (r"\bsupport\b", 1.5),
    (r"\benable\b", 1.5),
    (r"\ballow\b", 1.5),
    (r"\bprovide\b", 1.5),
    (r"\brequest\b", 1.0),
    (r"\bpropose\b", 1.0),
    (r"\bsuggest\b", 1.0),
    (r"\bideas?\b", 1.0),
    (r"\benhancement\b", 1.0),
]

ENHANCEMENT_KEYWORDS = [
    (r"\boptimize\b", 2.5),
    (r"\brefactor\b", 2.5),
    (r"\bmodernize\b", 2.0),
    (r"\bupgrade\b", 2.0),
    (r"\benhance\b", 1.5),
    (r"\bimprove\b", 1.5),
    (r"\bperformance\b", 1.5),
    (r"\bspeed\b", 1.5),
    (r"\bfaster\b", 1.5),
    (r"\bbetter\b", 1.5),
    (r"\bclean\b", 1.0),
    (r"\bpolish\b", 1.0),
    (r"\btweak\b", 1.0),
    (r"\badjust\b", 1.0),
    (r"\bupdate\b", 1.0),
]

QUESTION_KEYWORDS = [
    (r"\bhow\s+to\b", 2.5),
    (r"\bcan\s+i\b", 2.0),
    (r"\bis\s+it\b", 2.0),
    (r"\bhow\b", 1.5),
    (r"\bwhat\b", 1.5),
    (r"\bwhy\b", 1.5),
    (r"\bwhen\b", 1.0),
    (r"\bwhere\b", 1.0),
    (r"\bwhich\b", 1.0),
    (r"\bdoes\b", 1.0),
    (r"\bhelp\b", 1.0),
    (r"\bquestion\b", 1.0),
    (r"\bquery\b", 1.0),
    (r"\bwonder\b", 1.0),
    (r"\bconfus\b", 1.0),
    (r"\bclarify\b", 1.0),
]

PRIORITY_KEYWORDS = {
    IssuePriority.CRITICAL: [
        (r"\bproduction\s+down\b", 3.0),
        (r"\bdata\s+loss\b", 3.0),
        (r"\bsecurity\b", 3.0),
        (r"\bvulnerab\b", 3.0),
        (r"\bcritical\b", 2.5),
        (r"\burgent\b", 2.5),
        (r"\bemergency\b", 2.5),
        (r"\bsevere\b", 2.0),
        (r"\bblocker\b", 2.0),
    ],
    IssuePriority.HIGH: [
        (r"\bbreaking\b", 2.5),
        (r"\brelease\s+block\b", 2.5),
        (r"\bhigh\b", 2.0),
        (r"\bimportant\b", 2.0),
        (r"\bmajor\b", 2.0),
        (r"\bpriority\b", 1.5),
        (r"\basap\b", 1.5),
        (r"\bsoon\b", 1.0),
        (r"\bdeadline\b", 1.0),
    ],
    IssuePriority.MEDIUM: [
        (r"\bmedium\b", 1.5),
        (r"\bnormal\b", 1.0),
        (r"\bstandard\b", 1.0),
        (r"\btypical\b", 1.0),
    ],
    IssuePriority.LOW: [
        (r"\bcosmetic\b", 2.0),
        (r"\btrivial\b", 1.5),
        (r"\bminor\b", 1.5),
        (r"\blow\b", 1.0),
        (r"\bnice\s+to\s+have\b", 1.0),
        (r"\bwhen\s+time\b", 1.0),
        (r"\bbacklog\b", 1.0),
        (r"\bsomeday\b", 1.0),
    ],
}


def _count_matches(text: str, patterns: list[tuple[str, float]]) -> float:
    """Sum weighted keyword pattern matches in text (case-insensitive)."""
    total = 0.0
    for pattern, weight in patterns:
        matches = len(re.findall(pattern, text, re.IGNORECASE))
        total += matches * weight
    return total


def _classify_by_keywords(title: str, body: str) -> tuple[IssueType, IssuePriority, float, str]:
    """Classify issue using keyword matching (deterministic fallback)."""
    combined = f"{title} {body}".lower()

    # Count weighted matches for each type
    bug_score = _count_matches(combined, BUG_KEYWORDS)
    feature_score = _count_matches(combined, FEATURE_KEYWORDS)
    enhancement_score = _count_matches(combined, ENHANCEMENT_KEYWORDS)
    question_score = _count_matches(combined, QUESTION_KEYWORDS)

    # Determine issue type
    scores = {
        IssueType.BUG: bug_score,
        IssueType.FEATURE: feature_score,
        IssueType.ENHANCEMENT: enhancement_score,
        IssueType.QUESTION: question_score,
    }
    issue_type = max(scores, key=scores.get)
    type_confidence = min(scores[issue_type] / max(1.0, sum(scores.values())), 1.0)

    # Determine priority
    priority_scores = {}
    for priority, patterns in PRIORITY_KEYWORDS.items():
        priority_scores[priority] = _count_matches(combined, patterns)
    
    # Default to MEDIUM if no priority keywords match
    max_score = max(priority_scores.values())
    if max_score > 0:
        priority = max(priority_scores, key=priority_scores.get)
        priority_confidence = min(priority_scores[priority] / max(1.0, sum(priority_scores.values())), 1.0)
    else:
        priority = IssuePriority.MEDIUM
        priority_confidence = 0.5

    # Overall confidence (weighted)
    confidence = (type_confidence * 0.7) + (priority_confidence * 0.3)

    # Reasoning
    reasoning = f"Keyword-based: {issue_type.value} (score: {scores[issue_type]:.1f}), {priority.value} priority (score: {priority_scores[priority]:.1f})"

    return issue_type, priority, confidence, reasoning


def _generate_similarity_hash(title: str, body: str) -> str:
    """Generate semantic similarity hash for duplicate detection.

    Uses normalized text features: title words, key terms from body.
    """
    # Normalize: lowercase, remove punctuation, keep alphanumeric and spaces
    normalized = re.sub(r"[^\w\s]", "", f"{title} {body}".lower())
    words = normalized.split()

    # Extract significant words (length > 3, not common stop words)
    stop_words = {
        "the", "and", "for", "are", "but", "not", "you", "all", "can", "had",
        "her", "was", "one", "our", "out", "day", "get", "has", "him", "his",
        "how", "its", "may", "new", "now", "old", "see", "two", "who", "boy",
        "did", "she", "use", "way", "will", "with", "from", "they", "this",
        "that", "have", "been", "were", "said", "each", "which", "their",
        "would", "there", "what", "about", "when", "make", "like", "time",
        "just", "know", "take", "into", "your", "good", "some", "could",
        "them", "then", "than", "look", "only", "come", "over", "think",
        "also", "back", "after", "first", "well", "even", "want", "because",
        "any", "these", "give", "most", "very", "through", "where", "much",
        "before", "should", "too", "more", "such", "why", "each", "between",
    }

    significant = [w for w in words if len(w) > 3 and w not in stop_words]
    # Take top 20 significant words
    features = sorted(set(significant))[:20]
    feature_str = "|".join(features)

    return hashlib.sha256(feature_str.encode()).hexdigest()[:16]


async def _classify_with_llm(title: str, body: str) -> Optional[ClassificationResult]:
    """Attempt LLM-based classification (advisory, opt-in)."""
    settings = get_settings()
    if not settings.llm_api_key or not settings.llm_base_url:
        return None

    prompt = f"""Classify this GitHub issue. Respond with JSON only:
{{
  "issue_type": "bug|feature|enhancement|question",
  "priority": "low|medium|high|critical",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}}

Title: {title}
Body: {body[:2000]}"""

    try:
        async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
            response = await client.post(
                f"{settings.llm_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.llm_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.llm_model,
                    "messages": [
                        {"role": "system", "content": "You are an issue classification assistant. Respond only with valid JSON."},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.1,
                    "max_tokens": 200,
                },
            )
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"].strip()

            # Parse JSON response
            result = json.loads(content)
            return ClassificationResult(
                issue_type=IssueType(result["issue_type"]),
                priority=IssuePriority(result["priority"]),
                confidence=float(result["confidence"]),
                reasoning=f"LLM: {result['reasoning']}",
                similarity_hash=_generate_similarity_hash(title, body),
            )
    except Exception:
        # LLM failed, fall back to keyword classification
        return None


async def classify_issue(title: str, body: str = "") -> ClassificationResult:
    """Classify an issue with AI/ML.

    Tries LLM first (if configured), falls back to keyword-based classification.
    Always generates a similarity hash for duplicate detection.

    Args:
        title: Issue title
        body: Issue body/description (optional)

    Returns:
        ClassificationResult with type, priority, confidence, reasoning, and similarity hash
    """
    # Try LLM classification first
    llm_result = await _classify_with_llm(title, body)
    if llm_result:
        return llm_result

    # Fallback to deterministic keyword classification
    issue_type, priority, confidence, reasoning = _classify_by_keywords(title, body)
    similarity_hash = _generate_similarity_hash(title, body)

    return ClassificationResult(
        issue_type=issue_type,
        priority=priority,
        confidence=confidence,
        reasoning=reasoning,
        similarity_hash=similarity_hash,
    )


def find_similar_issues(
    target_hash: str,
    existing_hashes: list[tuple[int, str]],  # (issue_id, similarity_hash)
    threshold: int = 12,  # Matching hex chars out of 16
) -> list[int]:
    """Find potentially similar issues by comparing similarity hashes.

    Args:
        target_hash: Similarity hash of the new issue
        existing_hashes: List of (issue_id, similarity_hash) for existing issues
        threshold: Minimum matching prefix characters to consider similar

    Returns:
        List of issue IDs that are potentially similar
    """
    similar = []
    for issue_id, existing_hash in existing_hashes:
        # Count matching prefix characters
        matches = sum(1 for a, b in zip(target_hash, existing_hash) if a == b)
        if matches >= threshold:
            similar.append(issue_id)
    return similar
