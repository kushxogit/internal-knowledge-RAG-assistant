from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Optional, Tuple, Any
import time
from .retriever import Retriever
from .generator import Generator

SYSTEM_PROMPT_TEMPLATE = """
You are a helpful AI assistant. Your goal is to answer the user's question accurately based ONLY on the provided context.

Rules:
1. Use the Context sections below to synthesize your answer.
2. If the context does not contain the answer, say "I don't know based on the provided documents."
3. Do not make up information or use outside knowledge.
4. Keep your answer concise and helpful.

Context:
{context}
"""

class Assistant:
    """
    RAG Assistant that ties together retrieval and generation.
    """
    def __init__(self, db: AsyncSession):
        self.retriever = Retriever(db)
        self.generator = Generator()
        
    async def chat(
        self,
        user_query: str,
        history: Optional[List[Dict[str, str]]] = None,
        document_uuid: Optional[str] = None,
    ) -> Tuple[str, List[Dict[str, str]], Dict[str, Any]]:
        """
        Process a user query by retrieving context and generating an answer.
        """
        # 1. Retrieve Context
        results = await self.retriever.search(user_query, top_k=5, document_uuid=document_uuid)
        
        # Format the context text and collect citations
        context_parts = []
        citations_map = {}
        debug_chunks = []
        
        for i, (chunk, document, rrf_score, search_source, raw_distance) in enumerate(results, 1):
            context_parts.append(f"--- Document Snippet {i} ---\n{chunk.text}\n")
            
            debug_chunks.append({
                "rrf_score": round(rrf_score, 4),
                "raw_distance": round(raw_distance, 4) if raw_distance is not None else None,
                "source": search_source,
                "document_name": document.file_name,
                "text_preview": chunk.text[:150] + "..." if len(chunk.text) > 150 else chunk.text
            })
            
            doc_uuid_str = str(document.uuid)
            if doc_uuid_str not in citations_map:
                citations_map[doc_uuid_str] = {
                    "uuid": doc_uuid_str,
                    "name": document.file_name
                }
                
        citations = list(citations_map.values())
        context_str = "\n".join(context_parts) if context_parts else "No relevant context found."
        
        # 2. Build Prompt
        system_prompt = SYSTEM_PROMPT_TEMPLATE.replace("{context}", context_str)
        
        messages = [{"role": "system", "content": system_prompt}]
        
        if history:
            messages.extend(history)
            
        messages.append({"role": "user", "content": user_query})
        
        # 3. Generate Response
        start_time = time.time()
        response = await self.generator.generate(messages)
        end_time = time.time()
        
        debug_info = {
            "algorithm": "Hybrid (Vector + BM25)",
            "retrieved_chunks": debug_chunks,
            "threshold_used": 1.0,
            "system_prompt": system_prompt,
            "generation_time_ms": round((end_time - start_time) * 1000, 2)
        }
        
        return response, citations, debug_info
