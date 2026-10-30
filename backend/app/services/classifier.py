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


# Keyword patterns for deterministic classification
BUG_KEYWORDS = [
    r"\bbug\b", r"\berror\b", r"\bcrash\b", r"\bfail\b", r"\bbroken\b",
    r"\bissue\b", r"\bproblem\b", r"\bdefect\b", r"\bfix\b", r"\bregress\b",
    r"\bexception\b", r"\btraceback\b", r"\bpanic\b", r"\bhang\b", r"\bfreeze\b",
    r"\bincorrect\b", r"\bwrong\b", r"\bunexpected\b", r"\bglitch\b",
]

FEATURE_KEYWORDS = [
    r"\bfeature\b", r"\badd\b", r"\bnew\b", r"\bimplement\b", r"\bcreate\b",
    r"\bsupport\b", r"\benable\b", r"\ballow\b", r"\bprovide\b", r"\bintroduce\b",
    r"\brequest\b", r"\bpropose\b", r"\bsuggest\b", r"\bideas?\b", r"\benhancement\b",
]

ENHANCEMENT_KEYWORDS = [
    r"\benhance\b", r"\bimprove\b", r"\boptimize\b", r"\brefactor\b", r"\bupgrade\b",
    r"\bmodernize\b", r"\bperformance\b", r"\bspeed\b", r"\bfaster\b", r"\bbetter\b",
    r"\bclean\b", r"\bpolish\b", r"\btweak\b", r"\badjust\b", r"\bupdate\b",
]

QUESTION_KEYWORDS = [
    r"\bhow\b", r"\bwhat\b", r"\bwhy\b", r"\bwhen\b", r"\bwhere\b", r"\bwhich\b",
    r"\bcan\s+i\b", r"\bhow\s+to\b", r"\bis\s+it\b", r"\bdoes\b", r"\bhelp\b",
    r"\bquestion\b", r"\bquery\b", r"\bwonder\b", r"\bconfus\b", r"\bclarify\b",
]

PRIORITY_KEYWORDS = {
    IssuePriority.CRITICAL: [
        r"\bcritical\b", r"\burgent\b", r"\bemergency\b", r"\bsevere\b", r"\bblocker\b",
        r"\bproduction\s+down\b", r"\bdata\s+loss\b", r"\bsecurity\b", r"\bvulnerab\b",
    ],
    IssuePriority.HIGH: [
        r"\bhigh\b", r"\bimportant\b", r"\bmajor\b", r"\bbreaking\b", r"\bpriority\b",
        r"\basap\b", r"\bsoon\b", r"\bdeadline\b", r"\brelease\s+block\b",
    ],
    IssuePriority.MEDIUM: [
        r"\bmedium\b", r"\bnormal\b", r"\bstandard\b", r"\btypical\b",
    ],
    IssuePriority.LOW: [
        r"\blow\b", r"\bminor\b", r"\btrivial\b", r"\bcosmetic\b", r"\bnice\s+to\s+have\b",
        r"\bwhen\s+time\b", r"\bbacklog\b", r"\bsomeday\b",
    ],
}


def _count_matches(text: str, patterns: list[str]) -> int:
    """Count keyword pattern matches in text (case-insensitive)."""
    count = 0
    for pattern in patterns:
        count += len(re.findall(pattern, text, re.IGNORECASE))
    return count


def _classify_by_keywords(title: str, body: str) -> tuple[IssueType, IssuePriority, float, str]:
    """Classify issue using keyword matching (deterministic fallback)."""
    combined = f"{title} {body}".lower()

    # Count matches for each type
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
    type_confidence = min(scores[issue_type] / max(1, sum(scores.values())), 1.0)

    # Determine priority
    priority_scores = {}
    for priority, patterns in PRIORITY_KEYWORDS.items():
        priority_scores[priority] = _count_matches(combined, patterns)
    priority = max(priority_scores, key=priority_scores.get)
    priority_confidence = min(priority_scores[priority] / max(1, sum(priority_scores.values())), 1.0)

    # Overall confidence (weighted)
    confidence = (type_confidence * 0.7) + (priority_confidence * 0.3)

    # Reasoning
    reasoning = f"Keyword-based: {issue_type.value} (score: {scores[issue_type]}), {priority.value} priority (score: {priority_scores[priority]})"

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
