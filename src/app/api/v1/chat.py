from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Optional, Any

from ..dependencies import async_get_db
from ...rag.assistant import Assistant

router = APIRouter()

class ChatRequest(BaseModel):
    query: str
    history: Optional[List[Dict[str, str]]] = None
    document_uuid: Optional[str] = None

class Citation(BaseModel):
    uuid: str
    name: str

class ChatResponse(BaseModel):
    response: str
    citations: Optional[List[Citation]] = None
    debug_info: Optional[Dict[str, Any]] = None

@router.post("/", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, db: AsyncSession = Depends(async_get_db)):
    """
    RAG Assistant endpoint. Takes a user query and returns a response based on the knowledge base.
    """
    try:
        assistant = Assistant(db)
        response_text, citations, debug_info = await assistant.chat(
            user_query=request.query,
            history=request.history,
            document_uuid=request.document_uuid,
        )
        return ChatResponse(response=response_text, citations=citations, debug_info=debug_info)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        import logging
        logging.getLogger(__name__).exception("Error in chat endpoint")
        raise HTTPException(status_code=503, detail=f"Assistant Error: {str(e)}")
