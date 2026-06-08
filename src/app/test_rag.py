import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.db.database import local_session, async_engine
from app.rag.assistant import Assistant

async def main():
    print("Testing the Assistant with the dummy Knowledge Base document in the DB...\n")
    
    async with local_session() as db:
        assistant = Assistant(db)
        
        # Test 1: Explicit answer present in the DB
        q1 = "What is Project Athena?"
        print(f"User: {q1}")
        ans1 = await assistant.chat(q1)
        print(f"Assistant: {ans1}\n")
        
        # Test 2: Explicit answer present in the DB
        q2 = "When is the launch date?"
        print(f"User: {q2}")
        ans2 = await assistant.chat(q2)
        print(f"Assistant: {ans2}\n")
        
        # Test 3: Answer not in the DB
        q3 = "How much does Project Athena cost?"
        print(f"User: {q3}")
        ans3 = await assistant.chat(q3)
        print(f"Assistant: {ans3}\n")
        
    await async_engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
