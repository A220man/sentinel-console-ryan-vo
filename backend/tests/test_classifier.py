# Classifier Service Tests

import pytest
from app.services.classifier import (
    _classify_by_keywords,
    _generate_similarity_hash,
    find_similar_issues,
    ClassificationResult,
    IssueType,
    IssuePriority,
)


class TestKeywordClassification:
    """Tests for deterministic keyword-based classification."""

    def test_classify_bug(self):
        title = "Application crashes on startup with traceback"
        body = "When I run the app, it crashes immediately with a stack trace"
        issue_type, priority, confidence, reasoning = _classify_by_keywords(title, body)
        assert issue_type == IssueType.BUG
        assert confidence > 0.0
        assert "bug" in reasoning.lower()

    def test_classify_feature(self):
        title = "Add support for dark mode"
        body = "Implement a new feature to allow users to toggle dark mode"
        issue_type, priority, confidence, reasoning = _classify_by_keywords(title, body)
        assert issue_type == IssueType.FEATURE
        assert confidence > 0.0
        assert "feature" in reasoning.lower()

    def test_classify_enhancement(self):
        title = "Optimize database queries for better performance"
        body = "The current queries are slow. Need to refactor and improve speed."
        issue_type, priority, confidence, reasoning = _classify_by_keywords(title, body)
        assert issue_type == IssueType.ENHANCEMENT
        assert confidence > 0.0
        assert "enhancement" in reasoning.lower()

    def test_classify_question(self):
        title = "How to configure the API client?"
        body = "Can someone help me understand how to set up the client?"
        issue_type, priority, confidence, reasoning = _classify_by_keywords(title, body)
        assert issue_type == IssueType.QUESTION
        assert confidence > 0.0
        assert "question" in reasoning.lower()

    def test_priority_critical(self):
        title = "Production down due to security vulnerability"
        body = "Critical security issue causing data loss in production"
        issue_type, priority, confidence, reasoning = _classify_by_keywords(title, body)
        assert priority == IssuePriority.CRITICAL

    def test_priority_high(self):
        title = "Breaking change in release blocker"
        body = "Major issue that blocks the release"
        issue_type, priority, confidence, reasoning = _classify_by_keywords(title, body)
        assert priority == IssuePriority.HIGH

    def test_priority_low(self):
        title = "Cosmetic UI tweak for button color"
        body = "Nice to have minor visual adjustment"
        issue_type, priority, confidence, reasoning = _classify_by_keywords(title, body)
        assert priority == IssuePriority.LOW

    def test_default_priority_medium(self):
        title = "Regular feature request"
        body = "Standard improvement request"
        issue_type, priority, confidence, reasoning = _classify_by_keywords(title, body)
        assert priority == IssuePriority.MEDIUM


class TestSimilarityHash:
    """Tests for semantic similarity hash generation."""

    def test_hash_consistency(self):
        title = "Bug in authentication module"
        body = "Users cannot login due to auth failure"
        hash1 = _generate_similarity_hash(title, body)
        hash2 = _generate_similarity_hash(title, body)
        assert hash1 == hash2
        assert len(hash1) == 16

    def test_hash_different_content(self):
        title1 = "Bug in authentication module"
        body1 = "Users cannot login due to auth failure"
        title2 = "Feature request for dark mode"
        body2 = "Add dark mode toggle to settings"
        hash1 = _generate_similarity_hash(title1, body1)
        hash2 = _generate_similarity_hash(title2, body2)
        assert hash1 != hash2

    def test_hash_similar_content(self):
        title1 = "Bug in authentication module"
        body1 = "Users cannot login due to auth failure"
        title2 = "Authentication bug: users cannot login"
        body2 = "Login failure due to auth module bug"
        hash1 = _generate_similarity_hash(title1, body1)
        hash2 = _generate_similarity_hash(title2, body2)
        # Similar content should have matching prefix characters
        matches = sum(1 for a, b in zip(hash1, hash2) if a == b)
        assert matches >= 8  # At least half matching for similar content


class TestFindSimilarIssues:
    """Tests for finding similar issues by hash comparison."""

    def test_find_similar(self):
        target_hash = "abcdef1234567890"
        existing_hashes = [
            (1, "abcdef1234567890"),  # Exact match
            (2, "abcdef1234567891"),  # 15/16 match
            (3, "abcdef123456789f"),  # 15/16 match
            (4, "bcdef1234567890a"),  # Shifted, fewer matches
            (5, "0000000000000000"),  # No match
        ]
        similar = find_similar_issues(target_hash, existing_hashes, threshold=12)
        assert 1 in similar
        assert 2 in similar
        assert 3 in similar
        assert 4 not in similar
        assert 5 not in similar

    def test_empty_existing(self):
        similar = find_similar_issues("abcdef1234567890", [])
        assert similar == []

    def test_threshold_works(self):
        target_hash = "abcdef1234567890"
        existing_hashes = [
            (1, "abcdef1234567890"),  # 16 match
            (2, "abcdef123456789f"),  # 15 match
            (3, "abcdef12345678ff"),  # 14 match
            (4, "abcdef123456ffff"),  # 12 match
            (5, "abcdef12345fffff"),  # 11 match
        ]
        similar_12 = find_similar_issues(target_hash, existing_hashes, threshold=12)
        similar_14 = find_similar_issues(target_hash, existing_hashes, threshold=14)
        similar_16 = find_similar_issues(target_hash, existing_hashes, threshold=16)

        assert set(similar_12) == {1, 2, 3, 4}
        assert set(similar_14) == {1, 2, 3}
        assert set(similar_16) == {1}


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

