import argparse
from pathlib import Path
import torch

from models import SkinMultiTaskModel
from train_utils import create_multitask_loaders, train_multitask


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True, help="Path to skin_type_classification_dataset")
    parser.add_argument("--train-annotations", default=None)
    parser.add_argument("--valid-annotations", default=None)
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--workers", type=int, default=2)
    parser.add_argument("--lr", type=float, default=2e-4)
    args = parser.parse_args()

    root = Path(args.data)
    train_ann = Path(args.train_annotations) if args.train_annotations else root / "skinalaysis_labeling_train1.xlsx"
    valid_ann = Path(args.valid_annotations) if args.valid_annotations else root / "skinanalysis_valid1.xlsx"

    train_loader, valid_loader, counts = create_multitask_loaders(
        str(root), str(train_ann), str(valid_ann),
        batch_size=args.batch_size, workers=args.workers
    )

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = SkinMultiTaskModel(pretrained=True)

    previous = Path("artifacts/skin_classifier.pt")
    if previous.exists():
        print("Warm-starting ResNet backbone from artifacts/skin_classifier.pt")
        model.load_skin_classifier_checkpoint(str(previous))

    print("Device:", device)
    print("Training skin counts:", dict(counts))
    print("Annotated concern rows: train=150, valid=50 (from supplied spreadsheets)")

    train_multitask(
        model, train_loader, valid_loader, device,
        epochs=args.epochs, lr=args.lr, output_dir="artifacts"
    )


if __name__ == "__main__":
    main()
