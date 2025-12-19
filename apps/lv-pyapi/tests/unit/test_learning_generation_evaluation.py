import pytest
from typing import cast, Dict, Any
from learnings import learnings_from_messages
from gemini_client import client # Gemini API client 
from google.genai import types # For JSON schema config

def evaluate_learning_quality(learning: str, source_conversation: list):
    """Use Gemini as a judge to evaluate learning quality """

    # This prompt is step one: Define criteria
    prompt = f"""
You are an impartial evaluator judging the quality of learning statements.
    
Evaluate learning quality. Example:

Conversation: 
- "I love coding web apps." 
- "What excites you?"
- "UI design and tweaking interfaces"

Learning: 
"Enjoys UI-focused web projects. Spends time improving interfaces."

Scores:
accuracy=1.0, relevance=1.0, coherence=1.0, overall_score=1.0, feedback="Perfectly summarizes conversation"

Now evaluate:
Learning: "{learning}"
Conversation: {chr(10).join(f"- {msg}" for msg in source_conversation)}

Rate (0.0-1.0): Accuracy (reflects conversation?), Relevance (useful for job matching?), Coherence (clear/well-formed?).
Return JSON only: accuracy, relevance, coherence, overall_score, feedback."""
    schema = {
        "type": "object",
        "properties": {
            "accuracy":      {"type": "number", "minimum": 0, "maximum": 1},
            "relevance":     {"type": "number", "minimum": 0, "maximum": 1},
            "coherence":     {"type": "number", "minimum": 0, "maximum": 1},
            "overall_score": {"type": "number", "minimum": 0, "maximum": 1},
            "feedback": {"type": "string"}
        },
        "required": ["accuracy", "relevance", "coherence", "overall_score", "feedback"]
    }

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=schema,
    )

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=config
    )

    # response.parsed is a dict when using JSON schema, cast to satisfy type checker
    return cast(Dict[str, Any], response.parsed)

def test_learning_generation_and_evaluation():
    """End-to-end test: Generate learnings and evaluate quality using LLM judge """

    # Creating a fake conversation for testing
    conversation = [
        "I've been really enjoying building web apps and seeing users interact with them.",
        "What kind of projects make you lose track of time?",
        "Anything involving UI design. I can spend hours tweaking interfaces.",
        "What do people usually come to you for?",
        "Frontend advice and debugging CSS issues."
    ]

    generated_learnings = learnings_from_messages(conversation)

    assert len(generated_learnings) > 0, "Should generate at least one learning" #check this LINE LATER -> what should assertion be for test?

    # Evaluate each learning using LLM judge
    for learning in generated_learnings:
        evaluation = evaluate_learning_quality(learning, conversation)

        # Assert quality scores meet threshold 
        assert evaluation['accuracy']      >= 0.7, "Learning should be accurate"
        assert evaluation['relevance']     >= 0.7, "Learning should be relevant"
        assert evaluation['coherence']     >= 0.7, "Learning should be coherent"
        assert evaluation['overall_score'] >= 0.7, "Overall quality should be good"
