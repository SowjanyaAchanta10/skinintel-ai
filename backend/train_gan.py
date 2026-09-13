from __future__ import annotations

import argparse
from pathlib import Path

import torch
from torch import nn
from torch.utils.data import DataLoader
from torchvision import transforms

from models import ConditionalDiscriminator, ConditionalGenerator, SKIN_CLASSES
from train_utils import SkinFolderDataset, train_gan


def build_gan_dataset(root: str | Path, image_size: int = 224) -> SkinFolderDataset:
    transform = transforms.Compose(
        [
            transforms.Resize((image_size, image_size)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.5, 0.5, 0.5],
                std=[0.5, 0.5, 0.5],
            ),
        ]
    )
    return SkinFolderDataset(
        root=root,
        classes=SKIN_CLASSES,
        transform=transform,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the conditional skin GAN.")
    parser.add_argument("--data", required=True)
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--workers", type=int, default=2)
    args = parser.parse_args()

    dataset_root = Path(args.data)
    gan_root = dataset_root / "train" if (dataset_root / "train").exists() else dataset_root
    dataset = build_gan_dataset(gan_root)
    loader = DataLoader(
        dataset,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=args.workers,
        pin_memory=torch.cuda.is_available(),
        persistent_workers=args.workers > 0,
        drop_last=True,
    )

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    generator = ConditionalGenerator(num_classes=len(SKIN_CLASSES))
    discriminator = ConditionalDiscriminator(num_classes=len(SKIN_CLASSES))

    history = train_gan(
        generator=generator,
        discriminator=discriminator,
        loader=loader,
        num_classes=len(SKIN_CLASSES),
        epochs=args.epochs,
        device=device,
    )

    print("Generator checkpoint written to artifacts/skin_generator.pt")
    print("Discriminator checkpoint written to artifacts/skin_discriminator.pt")
    print("Final generator loss:", round(history["generator_loss"][-1], 4))


if __name__ == "__main__":
    main()
