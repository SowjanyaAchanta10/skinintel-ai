from collections import Counter
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import json
import math
import random

import numpy as np
import pandas as pd
import torch
from PIL import Image
from torch import nn
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler
from torchvision import transforms

from models import CONCERN_NAMES, SKIN_CLASSES


IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def build_train_transform():
    return transforms.Compose([
        transforms.Resize(248),
        transforms.RandomResizedCrop(224, scale=(0.78, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(p=0.08),
        transforms.RandomRotation(8),
        transforms.ColorJitter(brightness=0.10, contrast=0.10, saturation=0.08),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])


def build_eval_transform():
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])


def _safe_number(value, default=0.0):
    try:
        if pd.isna(value):
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _normalize_annotation_columns(columns):
    mapping = {}
    for col in columns:
        key = str(col).strip().lower()
        mapping[key] = col
    return mapping


def load_annotation_table(xlsx_path: str) -> Dict[str, np.ndarray]:
    """Load 0-5 annotation rows keyed by exact image basename.

    The validation sheet uses 'pigmentation' while training uses 'dark spots';
    both are mapped to the same model concern: dark_spots.
    """
    df = pd.read_excel(xlsx_path)
    colmap = _normalize_annotation_columns(df.columns)

    aliases = {
        "acne_severity": ["acne_severity (0-5)", "acne severity (0-5)"],
        "blackheads": ["blackheads"],
        "whiteheads": ["whiteheads"],
        "open_pores": ["open pores (0-5)"],
        "excessive_oil": ["excessive oil (0-5)"],
        "skin_irritation": ["skin irritation (0-5)"],
        "skin_sensitivity": ["skin sensitivity (0-5)"],
        "redness": ["redness severity (0-5)"],
        "fine_lines": ["fine line around eyes(0-5)", "fine line around eyes (0-5)"],
        "eye_puffiness": ["eye puffiness(0-5)", "eye puffiness (0-5)"],
        "dark_circles": ["dark circles around eyes(0-5)", "dark circles around eyes (0-5)"],
        "forehead_wrinkles": ["wrinkes on forehead(0-5)", "wrinkles on forehead(0-5)"],
        "skin_elasticity": ["skin elasticity(0-5)(5-not elastic at all)"],
        "dehydration": ["dehydration (0-5)(5 very dehydrated)"],
        "dark_spots": ["dark spots(0-5)", "pigmentation(0-5)"],
        "post_acne_marks": ["post acne marks(0-5)"],
        "uneven_skin": ["uneven skin(0-5)"],
        "freckles": ["freckles(0-5)"],
    }

    resolved = {}
    for name, candidates in aliases.items():
        resolved[name] = next((colmap[c] for c in candidates if c in colmap), None)

    image_col = next((col for key, col in colmap.items() if key == "image_id"), None)
    if image_col is None:
        raise ValueError("Annotation sheet must contain an Image_ID column")

    table = {}
    for _, row in df.iterrows():
        image_id = Path(str(row[image_col]).strip()).name
        values = []
        for concern in CONCERN_NAMES:
            col = resolved.get(concern)
            value = _safe_number(row[col]) if col is not None else 0.0
            values.append(float(np.clip(value, 0.0, 5.0)))
        table[image_id] = np.asarray(values, dtype=np.float32)
    return table


class MultiTaskSkinDataset(Dataset):
    """All images in a split; concern targets are masked when not annotated."""

    def __init__(self, split_root: str, transform=None, annotation_xlsx: Optional[str] = None):
        self.root = Path(split_root)
        self.transform = transform
        self.annotations = load_annotation_table(annotation_xlsx) if annotation_xlsx else {}

        self.samples: List[Tuple[Path, int]] = []
        for class_name in SKIN_CLASSES:
            folder = self.root / class_name
            if not folder.exists():
                continue
            for p in folder.rglob("*"):
                if p.is_file() and p.suffix.lower() in IMAGE_EXTS:
                    self.samples.append((p, SKIN_CLASSES.index(class_name)))

        if not self.samples:
            raise FileNotFoundError(f"No images found under {self.root}")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, index):
        path, skin_label = self.samples[index]
        image = Image.open(path).convert("RGB")
        if self.transform:
            image = self.transform(image)

        concern = np.zeros(len(CONCERN_NAMES), dtype=np.float32)
        mask = 0.0
        ann = self.annotations.get(path.name)
        if ann is not None:
            concern = ann
            mask = 1.0

        return {
            "image": image,
            "skin_label": torch.tensor(skin_label, dtype=torch.long),
            "concern_target": torch.tensor(concern, dtype=torch.float32),
            "concern_mask": torch.tensor(mask, dtype=torch.float32),
            "path": str(path),
        }


def create_multitask_loaders(
    dataset_root: str,
    annotation_train: Optional[str],
    annotation_valid: Optional[str],
    batch_size: int = 32,
    workers: int = 2,
):
    root = Path(dataset_root)
    train = MultiTaskSkinDataset(
        root / "train", build_train_transform(), annotation_train
    )
    valid = MultiTaskSkinDataset(
        root / "valid", build_eval_transform(), annotation_valid
    )

    counts = Counter(label for _, label in train.samples)
    sample_weights = [1.0 / max(counts[label], 1) for _, label in train.samples]
    sampler = WeightedRandomSampler(
        torch.tensor(sample_weights, dtype=torch.double),
        num_samples=len(sample_weights),
        replacement=True,
    )

    train_loader = DataLoader(
        train, batch_size=batch_size, sampler=sampler,
        num_workers=workers, pin_memory=torch.cuda.is_available(),
    )
    valid_loader = DataLoader(
        valid, batch_size=batch_size, shuffle=False,
        num_workers=workers, pin_memory=torch.cuda.is_available(),
    )
    return train_loader, valid_loader, counts


def compute_multitask_metrics(skin_logits, skin_labels, concern_pred, concern_target, concern_mask):
    with torch.no_grad():
        pred = skin_logits.argmax(1)
        correct = (pred == skin_labels).sum().item()
        total = skin_labels.numel()

        mask = concern_mask.bool()
        if mask.any():
            p = concern_pred[mask]
            t = concern_target[mask]
            mae = torch.abs(p - t).mean().item()
            rounded = p.round().clamp(0, 5)
            exact = (rounded == t).float().mean().item()
        else:
            mae, exact = 0.0, 0.0

    return {
        "skin_accuracy": correct / max(total, 1),
        "concern_mae": mae,
        "concern_exact_score_accuracy": exact,
    }


def train_multitask(
    model,
    train_loader,
    valid_loader,
    device,
    epochs=15,
    lr=2e-4,
    skin_loss_weight=1.0,
    concern_loss_weight=0.8,
    output_dir="artifacts",
):
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)

    model.to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    skin_criterion = nn.CrossEntropyLoss(label_smoothing=0.05)
    concern_criterion = nn.SmoothL1Loss(reduction="none")

    best_val = math.inf
    history = []

    for epoch in range(1, epochs + 1):
        model.train()
        train_total = train_skin = train_concern = 0.0
        concern_batches = 0

        for batch in train_loader:
            images = batch["image"].to(device, non_blocking=True)
            skin_labels = batch["skin_label"].to(device, non_blocking=True)
            concern_target = batch["concern_target"].to(device, non_blocking=True)
            concern_mask = batch["concern_mask"].to(device, non_blocking=True)

            optimizer.zero_grad(set_to_none=True)
            out = model(images)

            skin_loss = skin_criterion(out["skin_logits"], skin_labels)
            element_loss = concern_criterion(out["concern_scores"], concern_target)
            if concern_mask.sum() > 0:
                c_loss = (element_loss.mean(dim=1) * concern_mask).sum() / concern_mask.sum()
                concern_batches += int(concern_mask.sum().item())
            else:
                c_loss = torch.zeros((), device=device)

            loss = skin_loss_weight * skin_loss + concern_loss_weight * c_loss
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

            train_total += loss.item()
            train_skin += skin_loss.item()
            train_concern += c_loss.item()

        scheduler.step()

        model.eval()
        val_total = val_skin = val_concern = 0.0
        n_batches = 0
        all_skin_correct = all_skin_total = 0
        all_mae_sum = all_mae_count = 0.0

        with torch.no_grad():
            for batch in valid_loader:
                images = batch["image"].to(device, non_blocking=True)
                skin_labels = batch["skin_label"].to(device, non_blocking=True)
                concern_target = batch["concern_target"].to(device, non_blocking=True)
                concern_mask = batch["concern_mask"].to(device, non_blocking=True)
                out = model(images)

                s_loss = skin_criterion(out["skin_logits"], skin_labels)
                elem = concern_criterion(out["concern_scores"], concern_target)
                if concern_mask.sum() > 0:
                    c_loss = (elem.mean(dim=1) * concern_mask).sum() / concern_mask.sum()
                    mask = concern_mask.bool()
                    mae = torch.abs(out["concern_scores"][mask] - concern_target[mask]).sum().item()
                    all_mae_sum += mae
                    all_mae_count += mask.sum().item()
                else:
                    c_loss = torch.zeros((), device=device)

                val_total += (skin_loss_weight * s_loss + concern_loss_weight * c_loss).item()
                val_skin += s_loss.item()
                val_concern += c_loss.item()
                n_batches += 1

                pred = out["skin_logits"].argmax(1)
                all_skin_correct += (pred == skin_labels).sum().item()
                all_skin_total += skin_labels.numel()

        val_loss = val_total / max(n_batches, 1)
        row = {
            "epoch": epoch,
            "train_loss": train_total / max(len(train_loader), 1),
            "train_skin_loss": train_skin / max(len(train_loader), 1),
            "train_concern_loss": train_concern / max(len(train_loader), 1),
            "val_loss": val_loss,
            "val_skin_loss": val_skin / max(n_batches, 1),
            "val_concern_loss": val_concern / max(n_batches, 1),
            "val_skin_accuracy": all_skin_correct / max(all_skin_total, 1),
            "val_concern_mae": all_mae_sum / max(all_mae_count, 1.0),
            "annotated_train_samples_seen": concern_batches,
        }
        history.append(row)
        print(row)

        if val_loss < best_val:
            best_val = val_loss
            torch.save({
                "model_state_dict": model.state_dict(),
                "skin_classes": SKIN_CLASSES,
                "concern_names": CONCERN_NAMES,
                "best_val_loss": best_val,
                "history": history,
            }, output / "skin_multitask.pt")

        with open(output / "multitask_history.json", "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2)

    return history
