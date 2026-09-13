from dataclasses import dataclass
from typing import Dict, List, Optional

import torch
from torch import nn
from torchvision.models import ResNet18_Weights, resnet18

SKIN_CLASSES = ["normal", "oily", "dry", "combination"]

CONCERN_NAMES = [
    "acne_severity",
    "blackheads",
    "whiteheads",
    "open_pores",
    "excessive_oil",
    "skin_irritation",
    "skin_sensitivity",
    "redness",
    "fine_lines",
    "eye_puffiness",
    "dark_circles",
    "forehead_wrinkles",
    "skin_elasticity",
    "dehydration",
    "dark_spots",
    "post_acne_marks",
    "uneven_skin",
    "freckles",
]

@dataclass
class ModelConfig:
    num_classes: int = 4
    num_concerns: int = len(CONCERN_NAMES)
    image_size: int = 224
    latent_dim: int = 128
    gan_channels: int = 3
    gan_base_channels: int = 64


class SkinMultiTaskModel(nn.Module):
    """Shared CNN backbone with skin-type and 18 concern-severity heads.

    Concern outputs are continuous scores in [0, 5]. This matches the
    annotation scale while allowing SmoothL1 loss and stable inference.
    """

    def __init__(self, pretrained: bool = True, num_classes: int = 4,
                 num_concerns: int = len(CONCERN_NAMES)):
        super().__init__()
        weights = ResNet18_Weights.DEFAULT if pretrained else None
        backbone = resnet18(weights=weights)
        feature_dim = backbone.fc.in_features
        backbone.fc = nn.Identity()
        self.backbone = backbone
        self.feature_norm = nn.BatchNorm1d(feature_dim)
        self.shared = nn.Sequential(
            nn.Linear(feature_dim, 256),
            nn.GELU(),
            nn.Dropout(0.25),
        )
        self.skin_head = nn.Linear(256, num_classes)
        self.concern_head = nn.Sequential(
            nn.Linear(256, 128),
            nn.GELU(),
            nn.Dropout(0.20),
            nn.Linear(128, num_concerns),
        )

    def forward(self, x):
        features = self.backbone(x)
        features = self.feature_norm(features)
        shared = self.shared(features)
        skin_logits = self.skin_head(shared)
        concern_scores = torch.sigmoid(self.concern_head(shared)) * 5.0
        return {"skin_logits": skin_logits, "concern_scores": concern_scores}

    def load_skin_classifier_checkpoint(self, checkpoint_path: str) -> None:
        """Warm-start the shared ResNet from the previous skin classifier."""
        payload = torch.load(checkpoint_path, map_location="cpu")
        state = payload.get("model_state_dict", payload)
        own = self.state_dict()
        transferred = {}
        for key, value in state.items():
            if key.startswith("backbone.") and key in own and own[key].shape == value.shape:
                transferred[key] = value
        self.load_state_dict(transferred, strict=False)


class SkinCNNClassifier(nn.Module):
    def __init__(self, pretrained: bool = True, num_classes: int = 4):
        super().__init__()
        weights = ResNet18_Weights.DEFAULT if pretrained else None
        backbone = resnet18(weights=weights)
        feature_dim = backbone.fc.in_features
        backbone.fc = nn.Identity()
        self.backbone = backbone
        self.classifier = nn.Sequential(
            nn.BatchNorm1d(feature_dim),
            nn.Dropout(0.30),
            nn.Linear(feature_dim, 256),
            nn.GELU(),
            nn.Dropout(0.20),
            nn.Linear(256, num_classes),
        )

    def forward(self, x):
        return self.classifier(self.backbone(x))


class ConditionalGenerator(nn.Module):
    def __init__(self, latent_dim=128, num_classes=4, base_channels=64):
        super().__init__()
        self.label_embedding = nn.Embedding(num_classes, latent_dim)
        self.project = nn.Linear(latent_dim * 2, base_channels * 8 * 7 * 7)
        self.net = nn.Sequential(
            nn.BatchNorm2d(base_channels * 8),
            nn.ReLU(True),
            nn.ConvTranspose2d(base_channels * 8, base_channels * 4, 4, 2, 1),
            nn.BatchNorm2d(base_channels * 4),
            nn.ReLU(True),
            nn.ConvTranspose2d(base_channels * 4, base_channels * 2, 4, 2, 1),
            nn.BatchNorm2d(base_channels * 2),
            nn.ReLU(True),
            nn.ConvTranspose2d(base_channels * 2, base_channels, 4, 2, 1),
            nn.BatchNorm2d(base_channels),
            nn.ReLU(True),
            nn.ConvTranspose2d(base_channels, base_channels // 2, 4, 2, 1),
            nn.BatchNorm2d(base_channels // 2),
            nn.ReLU(True),
            nn.ConvTranspose2d(base_channels // 2, 3, 4, 2, 1),
            nn.Tanh(),
        )

    def forward(self, z, labels):
        condition = self.label_embedding(labels)
        x = torch.cat([z, condition], dim=1)
        x = self.project(x).view(x.size(0), -1, 7, 7)
        return self.net(x)


class ConditionalDiscriminator(nn.Module):
    def __init__(self, num_classes=4, base_channels=64):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, base_channels, 4, 2, 1),
            nn.LeakyReLU(0.2, True),
            nn.Conv2d(base_channels, base_channels * 2, 4, 2, 1),
            nn.BatchNorm2d(base_channels * 2),
            nn.LeakyReLU(0.2, True),
            nn.Conv2d(base_channels * 2, base_channels * 4, 4, 2, 1),
            nn.BatchNorm2d(base_channels * 4),
            nn.LeakyReLU(0.2, True),
            nn.Conv2d(base_channels * 4, base_channels * 8, 4, 2, 1),
            nn.BatchNorm2d(base_channels * 8),
            nn.LeakyReLU(0.2, True),
            nn.Conv2d(base_channels * 8, base_channels * 8, 4, 2, 1),
            nn.LeakyReLU(0.2, True),
        )
        self.label_embedding = nn.Embedding(num_classes, base_channels * 8)
        self.realism = nn.Linear(base_channels * 8 * 7 * 7, 1)
        self.projection = nn.Linear(base_channels * 8, 1)

    def forward(self, x, labels):
        features = self.features(x)
        flat = features.flatten(1)
        logits = self.realism(flat)
        pooled = features.mean(dim=(2, 3))
        logits = logits + self.projection(pooled * self.label_embedding(labels))
        return logits


class SkinGAN:
    def __init__(self, config: Optional[ModelConfig] = None):
        cfg = config or ModelConfig()
        self.generator = ConditionalGenerator(
            cfg.latent_dim, cfg.num_classes, cfg.gan_base_channels
        )
        self.discriminator = ConditionalDiscriminator(
            cfg.num_classes, cfg.gan_base_channels
        )


def build_models(pretrained=True):
    cfg = ModelConfig()
    return (
        SkinMultiTaskModel(
            pretrained=pretrained,
            num_classes=cfg.num_classes,
            num_concerns=cfg.num_concerns,
        ),
        ConditionalGenerator(cfg.latent_dim, cfg.num_classes, cfg.gan_base_channels),
        ConditionalDiscriminator(cfg.num_classes, cfg.gan_base_channels),
    )
