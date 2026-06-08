from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Optional

from ..dependencies import async_get_db
from ...rag.assistant import Assistant

router = APIRouter()

class ChatRequest(BaseModel):
    query: str
    history: Optional[List[Dict[str, str]]] = None

class ChatResponse(BaseModel):
    response: str

@router.post("/", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, db: AsyncSession = Depends(async_get_db)):
    """
    RAG Assistant endpoint. Takes a user query and returns a response based on internal knowledge.
    """
    try:
        assistant = Assistant(db)
        response_text = await assistant.chat(user_query=request.query, history=request.history)
        return ChatResponse(response=response_text)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        # Avoid leaking full stack trace or raw OpenRouter exceptions, but provide useful feedback
        raise HTTPException(status_code=503, detail="The Assistant is currently unavailable. Please try again later.")
