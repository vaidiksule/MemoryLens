import os
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, GetCoreSchemaHandler, ConfigDict
from pydantic_core import core_schema
from typing import List, Optional, Any
from datetime import datetime
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
client = AsyncIOMotorClient(MONGODB_URI)
db = client.get_database("MemoryLens")


class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(
        cls, _source_type: Any, _handler: GetCoreSchemaHandler
    ) -> core_schema.CoreSchema:
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.union_schema(
                [
                    core_schema.is_instance_schema(ObjectId),
                    core_schema.chain_schema(
                        [
                            core_schema.str_schema(),
                            core_schema.no_info_plain_validator_function(cls.validate),
                        ]
                    ),
                ]
            ),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x)
            ),
        )

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)


class Person(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    name: str
    face_embedding: List[float]
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Memory(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    person_id: PyObjectId
    transcript: str
    summary: str
    key_topics: List[str]
    emotional_tone: str
    follow_up_suggestion: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# Database helpers
async def get_all_people():
    people_cursor = db.people.find()
    return [Person(**p) async for p in people_cursor]


async def add_person(name: str, embedding: List[float]):
    person = {
        "name": name,
        "face_embedding": embedding,
        "created_at": datetime.utcnow(),
    }
    result = await db.people.insert_one(person)
    return str(result.inserted_id)


async def add_memory(
    person_id: str,
    transcript: str,
    summary: str,
    topics: List[str],
    tone: str,
    follow_up: str = None,
):
    memory = {
        "person_id": ObjectId(person_id),
        "transcript": transcript,
        "summary": summary,
        "key_topics": topics,
        "emotional_tone": tone,
        "follow_up_suggestion": follow_up,
        "timestamp": datetime.utcnow(),
    }
    result = await db.memories.insert_one(memory)
    return str(result.inserted_id)


async def get_latest_memory(person_id: str):
    memory = await db.memories.find_one(
        {"person_id": ObjectId(person_id)}, sort=[("timestamp", -1)]
    )
    if memory:
        return Memory(**memory)
    return None
