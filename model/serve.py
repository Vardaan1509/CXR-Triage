"""
FastAPI server that loads a ResNet50 chest X-ray model and returns
predictions for pneumothorax, pneumonia, nodule (and normal).

Run:  uvicorn serve:app --port 8000
"""

import io
from pathlib import Path

import torch
import torch.nn as nn
from torchvision import models, transforms
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image

# ── Config ────────────────────────────────────────────────────────────────────
MODEL_PATH = Path(__file__).parent / "best_model.pth"
NUM_CLASSES = 4
# Matches training label order exactly
CLASS_NAMES = ["no_finding", "nodule", "pneumonia", "pneumothorax"]
IMAGE_SIZE = 224
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ── Preprocessing (standard ImageNet normalisation) ──────────────────────────
preprocess = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

# ── Load model ────────────────────────────────────────────────────────────────
def load_model() -> nn.Module:
    model = models.resnet50(weights=None)

    # Replicate the custom FC head from training:
    #   Sequential(Dropout, Linear(2048→512), BatchNorm1d(512), ReLU, Dropout, Linear(512→4))
    model.fc = nn.Sequential(
        nn.Dropout(p=0.5),
        nn.Linear(2048, 512),
        nn.BatchNorm1d(512),
        nn.ReLU(),
        nn.Dropout(p=0.3),
        nn.Linear(512, NUM_CLASSES),
    )

    checkpoint = torch.load(MODEL_PATH, map_location=DEVICE)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(DEVICE)
    model.eval()
    print(f"Model loaded (epoch {checkpoint.get('epoch')}, val_acc {checkpoint.get('val_acc')})")
    return model

model = load_model()

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="CXR Triage Inference")

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        tensor = preprocess(image).unsqueeze(0).to(DEVICE)

        with torch.no_grad():
            logits = model(tensor)
            probs = torch.sigmoid(logits).squeeze().tolist()

        # If the model returns a single value (edge case), wrap it
        if isinstance(probs, float):
            probs = [probs]

        all_preds = {
            name: round(prob, 4) for name, prob in zip(CLASS_NAMES, probs)
        }

        # Return only the pathology predictions the app expects
        predictions = {
            "pneumothorax": all_preds.get("pneumothorax", 0.0),
            "pneumonia": all_preds.get("pneumonia", 0.0),
            "nodule": all_preds.get("nodule", 0.0),
        }

        return JSONResponse(content={"predictions": predictions})

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
