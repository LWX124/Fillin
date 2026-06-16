from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from openai import OpenAI
from typing import List
import uuid

from app.core.config import settings

EMBEDDING_MODEL = settings.EMBEDDING_MODEL
EMBEDDING_DIM = 1536


def get_qdrant_client() -> QdrantClient:
    return QdrantClient(url=settings.QDRANT_URL)


def get_openai_client() -> OpenAI:
    kwargs = {"api_key": settings.OPENAI_API_KEY}
    if settings.EMBEDDING_BASE_URL:
        kwargs["base_url"] = settings.EMBEDDING_BASE_URL
    return OpenAI(**kwargs)


def create_collection(collection_name: str):
    client = get_qdrant_client()
    collections = [c.name for c in client.get_collections().collections]
    if collection_name not in collections:
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE),
        )


def get_embeddings(texts: List[str]) -> List[List[float]]:
    client = get_openai_client()
    response = client.embeddings.create(input=texts, model=EMBEDDING_MODEL)
    return [item.embedding for item in response.data]


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    if len(text) <= chunk_size:
        return [text]
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap
    return chunks


def vectorize_content(collection_name: str, content_id: str, title: str, text: str) -> List[str]:
    chunks = chunk_text(f"{title}\n\n{text}")
    embeddings = get_embeddings(chunks)

    points = []
    vector_ids = []
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        point_id = str(uuid.uuid4())
        vector_ids.append(point_id)
        points.append(
            PointStruct(
                id=point_id,
                vector=embedding,
                payload={
                    "content_id": content_id,
                    "chunk_index": i,
                    "text": chunk,
                },
            )
        )

    client = get_qdrant_client()
    client.upsert(collection_name=collection_name, points=points)
    return vector_ids


def search_similar(collection_name: str, query: str, limit: int = 5) -> List[dict]:
    query_embedding = get_embeddings([query])[0]
    client = get_qdrant_client()
    results = client.search(
        collection_name=collection_name,
        query_vector=query_embedding,
        limit=limit,
    )
    return [
        {
            "text": hit.payload["text"],
            "content_id": hit.payload["content_id"],
            "score": hit.score,
        }
        for hit in results
    ]


def delete_vectors(collection_name: str, vector_ids: List[str]):
    if not vector_ids:
        return
    client = get_qdrant_client()
    client.delete(collection_name=collection_name, points_selector=vector_ids)


def delete_collection(collection_name: str):
    client = get_qdrant_client()
    client.delete_collection(collection_name=collection_name)
