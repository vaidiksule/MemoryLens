import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()


async def clear_database():
    print("Connecting to database...")
    mongo_uri = os.getenv("MONGODB_URI")
    if not mongo_uri:
        print("Error: MONGODB_URI not found in .env")
        return

    client = AsyncIOMotorClient(mongo_uri)
    db = client.get_database("MemoryLens")

    print("Clearing collections...")

    # Delete all documents from 'people' collection
    result_people = await db.people.delete_many({})
    print(f"Deleted {result_people.deleted_count} documents from 'people' collection.")

    # Delete all documents from 'memories' collection
    result_memories = await db.memories.delete_many({})
    print(
        f"Deleted {result_memories.deleted_count} documents from 'memories' collection."
    )

    print("Database cleared successfully.")
    client.close()


if __name__ == "__main__":
    asyncio.run(clear_database())
