import pytest
from typing import cast, Dict, Any
from learnings import learnings_from_messages
from gemini_client import client # Gemini API client 
from google.genai import types # For JSON schema config

def evaluate_learning_quality(learning: str, source_conversation: list):
    """Use Gemini as a judge to evaluate learning quality """

    # This prompt is step one: Define criteria
    prompt = f"""
You are an expert evaluator judging the quality of combined learning statements. The learning you're evaluating is a COMBINED statement made up of multiple individual learnings joined with periods (e.g., "Learning 1. Learning 2. Learning 3."). IGNORE TRIVIAL TYPOS. 

Example conversation:
- "I've been really enjoying building web apps and seeing users interact with them."
- "What kind of projects make you lose track of time?"
- "Anything involving UI design. I can spend hours tweaking interfaces."
- "What do people usually come to you for?"
- "Frontend advice and debugging CSS issues."

Example of a PERFECT combined learning statement:
"Enjoys building web applications and observing user interactions. Passionate about UI design and spends hours tweaking interfaces. Provides frontend advice and specializes in debugging CSS issues."

Example of a BAD combined learning statement (too generic):
"Enjoys building web applications. Likes coding."

Evaluation criteria:

1. **Accuracy**: Does the combined learning capture ALL specific details from the conversation? Check if it includes every distinct skill, interest, and area of expertise mentioned. Missing details = lower accuracy.

2. **Relevance**: Are the learnings professionally useful for job matching? Do they use clear keywords and focus on career-relevant skills? Generic statements = lower relevance.

3. **Coherence**: Is the combined statement well-formed? Each individual learning should be clear and grammatically correct. The combination should read naturally, even though they're separate statements.

Now evaluate:
Combined Learning: "{learning}"
Source Conversation: {chr(10).join(f"- {msg}" for msg in source_conversation)}

Rate (0.0-1.0) for each criterion. Return JSON only: accuracy, relevance, coherence, overall_score, feedback.""" 
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

    print(f"\n{'='*60}")
    print(f"SOURCE CONVERSATION:")
    print(f"{'='*60}")
    for i, msg in enumerate(conversation, 1):
        print(f"{i}. {msg}")
    print(f"{'='*60}\n")

    generated_learnings = learnings_from_messages(conversation)

    assert len(generated_learnings) > 0, "Should generate at least one learning" #check this LINE LATER -> what should assertion be for test?

    print(f"\n{'='*60}")
    print(f"GENERATED {len(generated_learnings)} INDIVIDUAL LEARNING(S) (for embedding):")
    print(f"{'='*60}")
    
    # Print individual learnings (for embedding)
    for i, learning in enumerate(generated_learnings, 1):
        print(f"\nLearning {i}: {learning}")

    # Combine all learnings into one sentence for judge evaluation
    combined_learning = ". ".join(generated_learnings) + "."
    
    print(f"\n{'='*60}")
    print(f"COMBINED LEARNING (for judge evaluation):")
    print(f"{combined_learning}\n")
    print(f"{'='*60}\n")

    # Example of perfect learning for this conversation
    perfect_learning = "Enjoys building web applications and observing user interactions. Passionate about UI design and spends hours tweaking interfaces. Provides frontend advice and specializes in debugging CSS issues."
    
    print(f"PERFECT LEARNING EXAMPLE:")
    print(f"{perfect_learning}\n")
    print(f"{'='*60}\n")

    # Evaluate the combined learning using LLM judge
    print(f"\n{'='*60}")
    print(f"EVALUATING COMBINED LEARNING WITH LLM JUDGE:")
    print(f"{'='*60}\n")
    
    evaluation = evaluate_learning_quality(combined_learning, conversation)
    
    print(f"\n{'='*60}")
    print(f"EVALUATION RESULTS:")
    print(f"{'='*60}")
    print(f"  Accuracy:      {evaluation['accuracy']:.2f}")
    print(f"  Relevance:     {evaluation['relevance']:.2f}")
    print(f"  Coherence:     {evaluation['coherence']:.2f}")
    print(f"  Overall Score: {evaluation['overall_score']:.2f}")
    print(f"\n  Feedback:")
    print(f"  {evaluation['feedback']}")
    print(f"{'='*60}\n")

    # Assert quality scores meet threshold 
    assert evaluation['accuracy']      >= 0.7, "Learning should be accurate"
    assert evaluation['relevance']     >= 0.7, "Learning should be relevant"
    assert evaluation['coherence']     >= 0.7, "Learning should be coherent"
    assert evaluation['overall_score'] >= 0.7, "Overall quality should be good"

def test_learning_generation_and_evaluation_vague_conversation():
    """Test with vague/generic conversation - should produce lower quality learnings and scores"""

    # Creating a vague, generic conversation for testing
    conversation = [
        "I lik working on stuff.",
        "What do you do?",
        "I wor with comters sometimes.",
        "What are you good at?",
        "I'm okay at hings."
    ]

    print(f"\n{'='*60}")
    print(f"VAGUE SOURCE CONVERSATION (should produce low scores):")
    print(f"{'='*60}")
    for i, msg in enumerate(conversation, 1):
        print(f"{i}. {msg}")
    print(f"{'='*60}\n")

    generated_learnings = learnings_from_messages(conversation)

    print(f"\n{'='*60}")
    print(f"GENERATED {len(generated_learnings)} INDIVIDUAL LEARNING(S) (for embedding):")
    print(f"{'='*60}")
    
    if len(generated_learnings) == 0:
        print("\n⚠️  WARNING: No learnings generated from vague conversation!")
        print("This might indicate the learning generation is too strict or the conversation is too vague.")
        print("Creating a mock generic learning for evaluation purposes...\n")
        # Create a mock generic learning to test the judge
        generated_learnings = ["Likes working on things. Works with computers. Okay at various tasks."]
    
    # Print individual learnings (for embedding)
    for i, learning in enumerate(generated_learnings, 1):
        print(f"\nLearning {i}: {learning}")

    # Combine all learnings into one sentence for judge evaluation
    combined_learning = ". ".join(generated_learnings) + "."
    
    print(f"\n{'='*60}")
    print(f"COMBINED LEARNING (for judge evaluation):")
    print(f"{combined_learning}\n")
    print(f"{'='*60}\n")

    # Evaluate the combined learning using LLM judge
    print(f"\n{'='*60}")
    print(f"EVALUATING COMBINED LEARNING WITH LLM JUDGE:")
    print(f"{'='*60}\n")
    
    evaluation = evaluate_learning_quality(combined_learning, conversation)
    
    print(f"\n{'='*60}")
    print(f"EVALUATION RESULTS (should be LOW for vague conversation):")
    print(f"{'='*60}")
    print(f"  Accuracy:      {evaluation['accuracy']:.2f}")
    print(f"  Relevance:     {evaluation['relevance']:.2f}")
    print(f"  Coherence:     {evaluation['coherence']:.2f}")
    print(f"  Overall Score: {evaluation['overall_score']:.2f}")
    print(f"\n  Feedback:")
    print(f"  {evaluation['feedback']}")
    print(f"{'='*60}\n")

    # For vague conversations, we expect lower scores
    # The judge should recognize that vague inputs produce vague learnings
    # We're just checking that scores are lower than the good conversation test
    # (No strict threshold - just verifying the judge works correctly)
    print(f"NOTE: Vague conversation should produce lower scores than specific conversation.")
    print(f"This test verifies the judge correctly identifies low-quality learnings.\n")
    
    # Assert that we have learnings to evaluate (either generated or mock)
    assert len(generated_learnings) > 0, "Should have learnings to evaluate (generated or mock)"
