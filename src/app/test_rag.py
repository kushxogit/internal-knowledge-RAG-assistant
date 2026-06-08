import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.db.database import local_session, async_engine
from app.rag.assistant import Assistant

async def main():
    print("Testing the Assistant with the dummy HR Policy document in the DB...\n")
    
    async with local_session() as db:
        assistant = Assistant(db)
        
        # Test 1: Explicit answer present in the DB
        q1 = "How many days of PTO do I get?"
        print(f"User: {q1}")
        ans1 = await assistant.chat(q1)
        print(f"Assistant: {ans1}\n")
        
        # Test 2: Explicit answer present in the DB
        q2 = "What is the code of conduct?"
        print(f"User: {q2}")
        ans2 = await assistant.chat(q2)
        print(f"Assistant: {ans2}\n")
        
        # Test 3: Answer not in the DB
        q3 = "What is the policy for working from home?"
        print(f"User: {q3}")
        ans3 = await assistant.chat(q3)
        print(f"Assistant: {ans3}\n")
        
    await async_engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
