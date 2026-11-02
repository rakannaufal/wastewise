import io
import logging
import threading

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

    def load(self):
        try:
            torch.set_num_threads(2)
            self.net, self.metadata = load_model(settings.model_path)
        except Exception:
            self.net = None
            logger.warning("model_unavailable")

    def predict(self, content):
        if self.net is None or self.metadata is None:
            return None
        with self.lock, torch.inference_mode(), Image.open(io.BytesIO(content)) as image:
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
