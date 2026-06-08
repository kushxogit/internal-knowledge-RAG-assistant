from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Optional
from .retriever import Retriever
from .generator import Generator

SYSTEM_PROMPT_TEMPLATE = """
You are an internal knowledge assistant. Your goal is to answer the user's question accurately based ONLY on the provided context.

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
        
    async def chat(self, user_query: str, history: Optional[List[Dict[str, str]]] = None) -> str:
        """
        Process a user query by retrieving context and generating an answer.
        """
        # 1. Retrieve Context
        relevant_chunks = await self.retriever.search(user_query, top_k=5)
        
        # Format the context text
        context_parts = []
        for i, chunk in enumerate(relevant_chunks, 1):
            context_parts.append(f"--- Document Snippet {i} ---\n{chunk.text}\n")
        
        context_str = "\n".join(context_parts) if context_parts else "No relevant context found."
        
        # 2. Build Prompt
        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(context=context_str)
        
        messages = [{"role": "system", "content": system_prompt}]
        
        if history:
            messages.extend(history)
            
        messages.append({"role": "user", "content": user_query})
        
        # 3. Generate Response
        response = await self.generator.generate(messages)
        
        return response
