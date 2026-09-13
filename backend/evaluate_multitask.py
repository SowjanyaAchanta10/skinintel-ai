import argparse
from pathlib import Path
import json
import torch
from sklearn.metrics import classification_report, confusion_matrix, mean_absolute_error

from models import CONCERN_NAMES, SKIN_CLASSES, SkinMultiTaskModel
from train_utils import create_multitask_loaders


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True)
    parser.add_argument("--checkpoint", default="artifacts/skin_multitask.pt")
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--workers", type=int, default=2)
    args = parser.parse_args()

    root = Path(args.data)
    _, loader, _ = create_multitask_loaders(
        str(root),
        str(root / "skinalaysis_labeling_train1.xlsx"),
        str(root / "skinanalysis_valid1.xlsx"),
        batch_size=args.batch_size, workers=args.workers
    )

    payload = torch.load(args.checkpoint, map_location="cpu")
    model = SkinMultiTaskModel(pretrained=False)
    model.load_state_dict(payload["model_state_dict"])
    model.eval()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)

    y_true, y_pred = [], []
    c_true, c_pred = [], []

    with torch.no_grad():
        for batch in loader:
            x = batch["image"].to(device)
            out = model(x)
            y_true.extend(batch["skin_label"].tolist())
            y_pred.extend(out["skin_logits"].argmax(1).cpu().tolist())

            mask = batch["concern_mask"].bool()
            if mask.any():
                c_true.extend(batch["concern_target"][mask].tolist())
                c_pred.extend(out["concern_scores"].cpu()[mask].tolist())

    print(classification_report(
        y_true, y_pred, labels=list(range(len(SKIN_CLASSES))),
        target_names=SKIN_CLASSES, digits=4, zero_division=0
    ))
    print("Confusion matrix:")
    print(confusion_matrix(y_true, y_pred, labels=list(range(len(SKIN_CLASSES)))))

    if c_true:
        print("Concern MAE:", mean_absolute_error(c_true, c_pred))

if __name__ == "__main__":
    main()
