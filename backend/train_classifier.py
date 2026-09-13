from __future__ import annotations

import argparse
import sys
from pathlib import Path

import torch

from models import SKIN_CLASSES, SkinCNNClassifier
from train_utils import create_dataloaders, train_classifier


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the skin classifier.")
    parser.add_argument("--data", required=True, help="Path to the Kaggle dataset root.")
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--workers", type=int, default=2)
    args = parser.parse_args()

    data_path = Path(args.data)
    if not data_path.exists():
        raise SystemExit(f"Dataset path does not exist: {data_path}")

    train_loader, val_loader, counts = create_dataloaders(
        data_path,
        classes=SKIN_CLASSES,
        batch_size=args.batch_size,
        num_workers=args.workers,
    )

    print("Class counts:", counts)
    print("Training device:", "cuda" if torch.cuda.is_available() else "cpu")

    model = SkinCNNClassifier(
        num_classes=len(SKIN_CLASSES),
        pretrained=True,
    )

    history = train_classifier(
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        epochs=args.epochs,
        checkpoint_path="artifacts/skin_classifier.pt",
    )

    print("Best classifier checkpoint written to artifacts/skin_classifier.pt")
    print("Final validation accuracy:", round(history["val_accuracy"][-1] * 100, 2), "%")


if __name__ == "__main__":
    main()
