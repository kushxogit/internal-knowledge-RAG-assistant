import json
import logging
import httpx
from typing import List, Dict, Any, Optional
from ..core.config import settings

logger = logging.getLogger(__name__)

# The fallback stack of free OpenRouter models
FREE_MODELS = [
    "openrouter/free",
    "google/gemma-2-9b-it:free"
]

class Generator:
    """
    Handles LLM text generation using OpenRouter.
    Implements a fallback mechanism across free models.
    """
    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:8000", # Required by OpenRouter for free models
            "X-Title": "FastAPI RAG Boilerplate"
        }
        
    async def generate(self, messages: List[Dict[str, str]], fallback_models: List[str] = None) -> str:
        """
        Calls OpenRouter with the given messages. Falls back through models if an error occurs.
        """
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY is not set in configuration.")
            
        models_to_try = fallback_models or FREE_MODELS
        
        async with httpx.AsyncClient() as client:
            for model in models_to_try:
                try:
                    payload = {
                        "model": model,
                        "messages": messages,
                        "temperature": 0.1, # Keep it deterministic for RAG
                        "max_tokens": 1024  # CRITICAL for free tier to avoid 402 cost-check errors
                    }
                    
                    response = await client.post(
                        self.base_url,
                        headers=self.headers,
                        json=payload,
                        timeout=30.0
                    )
                    
                    response.raise_for_status()
                    
                    data = response.json()
                    if "choices" in data and len(data["choices"]) > 0:
                        return data["choices"][0]["message"]["content"]
                    else:
                        logger.warning(f"Unexpected OpenRouter response from model {model}: {data}")
                        continue # Try next model
                        
                except httpx.HTTPStatusError as e:
                    logger.warning(f"HTTP error with OpenRouter model {model}: {e.response.text}")
                    # If 401/403 auth error, fail fast. 404 or others, try next.
                    if e.response.status_code in [401, 403, 402]:
                        raise e
                    continue # Try next model
                except Exception as e:
                    logger.warning(f"Error calling OpenRouter model {model}: {str(e)}")
                    continue # Try next model
                    
        raise Exception(f"All fallback models failed. Attempted models: {models_to_try}")
