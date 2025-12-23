"""
Agent service using OpenAI Agents SDK with Gemini model backend.
"""
import os
from typing import Optional
from agents import Agent, Runner
from agentsdk_gemini_adapter import config as gemini_config
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize the agent with Gemini backend
# The gemini_config from agentsdk-gemini-adapter provides pre-configured Gemini model
agent = Agent(
    name="LivingVectorsAssistant",
    instructions="You are a helpful AI assistant for Living Vectors, an AI coffee room chat platform that helps users find their best job recommendations. Be conversational, friendly, and professional.",
    model=gemini_config.model if hasattr(gemini_config, 'model') else None,
)


def get_agent_response(user_input: str, run_config: Optional[dict] = None) -> str:
    """
    Get a response from the agent using OpenAI Agents SDK with Gemini backend.
    
    Args:
        user_input: The user's input message
        run_config: Optional run configuration (defaults to gemini_config)
    
    Returns:
        The agent's response text
    """
    try:
        # Use gemini_config as the run_config if not provided
        # Type ignore: gemini_config from adapter may be dict-like but works with Runner
        config = run_config if run_config is not None else gemini_config  # type: ignore
        
        # Run the agent synchronously
        result = Runner.run_sync(agent, user_input, run_config=config)  # type: ignore
        
        # Extract the final output from the result
        return result.final_output if hasattr(result, 'final_output') else str(result)
    
    except Exception as e:
        raise Exception(f"Error getting agent response: {str(e)}")


async def get_agent_response_async(user_input: str, run_config: Optional[dict] = None) -> str:
    """
    Get a response from the agent asynchronously using OpenAI Agents SDK with Gemini backend.
    
    Args:
        user_input: The user's input message
        run_config: Optional run configuration (defaults to gemini_config)
    
    Returns:
        The agent's response text
    """
    try:
        # Check if GEMINI_API_KEY is set
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise Exception("GEMINI_API_KEY environment variable is not set. Please set it in your .env file.")
        
        # Use gemini_config as the run_config if not provided
        # Type ignore: gemini_config from adapter may be dict-like but works with Runner
        config = run_config if run_config is not None else gemini_config  # type: ignore
        
        # Run the agent asynchronously
        result = await Runner.run(agent, user_input, run_config=config)  # type: ignore
        
        # Extract the final output from the result
        if hasattr(result, 'final_output'):
            return result.final_output
        else:
            return str(result)
    
    except Exception as e:
        raise Exception(f"Error getting agent response: {str(e)}")

