import hashlib
import io
import logging
import threading
from time import perf_counter

import torch
from PIL import Image

from app.config import settings
from ml.common import CLASSES, load_model, transform

logger = logging.getLogger(__name__)


class Predictor:
    def __init__(self):
        self.net = None
        self.metadata = None
        self.lock = threading.Lock()
        self.checkpoint_sha256 = None

    def load(self):
        try:
            torch.set_num_threads(2)
            self.net, self.metadata = load_model(settings.model_path)
            self.checkpoint_sha256 = hashlib.sha256(settings.model_path.read_bytes()).hexdigest()
        except Exception:
            self.net = None
            logger.warning("model_unavailable")

    def predict(self, content):
        if self.net is None or self.metadata is None:
            return None
        started = perf_counter()
        if not self.lock.acquire(timeout=2):
            raise RuntimeError("Inference capacity reached")
        try:
            acquired = perf_counter()
            return self._predict(content)
        finally:
            self.lock.release()
            logger.info(
                "inference_timing queue_ms=%.1f model_ms=%.1f",
                (acquired - started) * 1000,
                (perf_counter() - acquired) * 1000,
            )

    def _predict(self, content):
        assert self.net is not None and self.metadata is not None
        with torch.inference_mode(), Image.open(io.BytesIO(content)) as image:
            probabilities = (
                self.net(transform()(image.convert("RGB")).unsqueeze(0)).softmax(1)[0].tolist()
            )
        index = max(range(len(CLASSES)), key=probabilities.__getitem__)
        return {
            "category": CLASSES[index],
            "confidence": round(probabilities[index] * 100, 2),
            "probabilities": {
                c: round(p * 100, 4) for c, p in zip(CLASSES, probabilities, strict=True)
            },
            "model_version": self.metadata["version"],
        }


predictor = Predictor()
