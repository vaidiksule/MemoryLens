import cv2
import numpy as np
import base64
from insightface.app import FaceAnalysis
from typing import List, Tuple, Optional

# Initialize FaceAnalysis
# Use 'buffalo_l' for best accuracy or 'buffalo_s' for speed
app = FaceAnalysis(name="buffalo_sc", providers=["CPUExecutionProvider"])
app.prepare(ctx_id=0, det_size=(640, 640))


def decode_base64_image(base64_string: str) -> np.ndarray:
    """Decodes a base64 encoded image string into a numpy array (OpenCV format)."""
    if "base64," in base64_string:
        base64_string = base64_string.split("base64,")[1]

    img_data = base64.b64decode(base64_string)
    nparr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img


def get_face_embeddings(image: np.ndarray) -> List[dict]:
    """
    Extracts face embeddings and bounding boxes from an image.
    Returns a list of dicts: {"embedding": [], "bbox": [top, right, bottom, left]}
    """
    faces = app.get(image)
    results = []
    for face in faces:
        # InsightFace bbox is [x1, y1, x2, y2]
        bbox = face.bbox.astype(int).tolist()
        # Convert to [top, right, bottom, left] for compatibility with spec
        # x1, y1, x2, y2 -> y1, x2, y2, x1
        standard_bbox = [bbox[1], bbox[2], bbox[3], bbox[0]]

        results.append({"embedding": face.embedding.tolist(), "bbox": standard_bbox})
    return results


def cosine_similarity(emb1: np.ndarray, emb2: np.ndarray) -> float:
    """Computes cosine similarity between two embeddings."""
    dot_product = np.dot(emb1, emb2)
    norm1 = np.linalg.norm(emb1)
    norm2 = np.linalg.norm(emb2)
    return dot_product / (norm1 * norm2)


class EmbeddingCache:
    """In-memory cache for face embeddings to avoid frequent DB queries."""

    def __init__(self):
        self.cache = []  # List of (person_id, name, embedding_np)
        self.last_unknown_embedding = None  # (embedding_np, timestamp)
        self.last_unknown_timestamp = 0
        self.last_seen_known_id = None
        self.last_seen_known_timestamp = 0

    def update(self, people_list):
        self.cache = [
            (str(p.id), p.name, np.array(p.face_embedding)) for p in people_list
        ]

    def set_last_unknown(self, embedding: np.ndarray):
        """Updates the most recently seen unknown face."""
        self.last_unknown_embedding = embedding
        import time

        self.last_unknown_timestamp = time.time()

    def set_last_seen_known(self, person_id: str):
        """Updates the most recently seen known person."""
        self.last_seen_known_id = person_id
        import time

        self.last_seen_known_timestamp = time.time()

    def get_last_unknown(self, ttl: int = 5) -> Optional[np.ndarray]:
        """Returns the last unknown embedding if seen within TTL seconds."""
        import time

        if (
            self.last_unknown_embedding is not None
            and (time.time() - self.last_unknown_timestamp) < ttl
        ):
            return self.last_unknown_embedding
        return None

    def get_last_seen_known(self, ttl: int = 5) -> Optional[str]:
        """Returns the last known person_id if seen within TTL seconds."""
        import time

        if (
            self.last_seen_known_id is not None
            and (time.time() - self.last_seen_known_timestamp) < ttl
        ):
            return self.last_seen_known_id
        return None

    def match(
        self, target_embedding: List[float], threshold: float = 0.55
    ) -> Optional[Tuple[str, str, float]]:
        """
        Matches a target embedding against the cache.
        Returns (person_id, name, similarity) if match found.
        """
        target_emb_np = np.array(target_embedding)

        if not self.cache:
            # If cache is empty, this is technically an unknown face (or first face)
            # We don't return here immediately, we let it fall through to 'return None'
            pass

        best_match = None
        max_sim = -1

        for person_id, name, cached_emb in self.cache:
            sim = cosine_similarity(target_emb_np, cached_emb)
            # print(f"DEBUG: Comparing with {name} ({person_id}): sim={sim:.3f}")
            if sim > max_sim:
                max_sim = sim
                best_match = (person_id, name)

        if max_sim >= threshold:
            # We found a match, update simple tracking
            self.set_last_seen_known(best_match[0])
            print(f"DEBUG: MATCH FOUND: {best_match[1]} with sim={max_sim:.3f}")
            return (*best_match, max_sim)

        if max_sim > 0.3:
            print(
                f"DEBUG: No match found. Best sim was {max_sim:.3f} for {best_match[1] if best_match else 'None'}"
            )

        # No match found -> It's unknown
        self.set_last_unknown(target_emb_np)
        return None


# Singleton instance
face_cache = EmbeddingCache()
