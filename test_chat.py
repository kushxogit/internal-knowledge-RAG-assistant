import asyncio
from src.app.core.db.database import local_session
from src.app.rag.assistant import Assistant

async def test_chat():
    async with local_session() as db:
        assistant = Assistant(db)
        # Using the exact UUID from the user's log
        uuid = "019eaddb-fd8e-70cb-a316-d2934cf3ecbd"
        query = "how much loan is left for poonawalla after june 2026"
        print("Starting chat test...")
        try:
            resp = await assistant.chat(user_query=query, document_uuid=uuid)
            print("Success:", resp)
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_chat())
