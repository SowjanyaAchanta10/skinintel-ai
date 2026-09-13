import base64
import io
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Dict

import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

from models import (
    CONCERN_NAMES,
    SKIN_CLASSES,
    ConditionalGenerator,
    SkinMultiTaskModel,
)

# ============================================================
# CONFIGURATION
# ============================================================

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

ARTIFACTS = Path(__file__).resolve().parent / "artifacts"

MAX_UPLOAD_BYTES = 8 * 1024 * 1024

MODEL = None
GENERATOR = None


# ============================================================
# COSMETIC PRODUCT CATALOG
# ============================================================

PRODUCT_CATALOG = [
    {
        "name": "Niacinamide Barrier Serum",
        "category": "serum",
        "ingredients": [
            "niacinamide",
            "zinc PCA",
        ],
        "benefits": [
            "oil balance",
            "appearance of pores",
            "barrier support",
        ],
        "classes": [
            "oily",
            "combination",
        ],
    },
    {
        "name": "Salicylic Acid Clarifying Gel",
        "category": "treatment",
        "ingredients": [
            "salicylic acid",
            "panthenol",
        ],
        "benefits": [
            "blemish-prone skin",
            "blackheads",
            "clogged pores",
        ],
        "classes": [
            "oily",
            "combination",
        ],
    },
    {
        "name": "Ceramide Recovery Moisturizer",
        "category": "moisturizer",
        "ingredients": [
            "ceramides",
            "glycerin",
            "squalane",
        ],
        "benefits": [
            "barrier support",
            "dryness",
            "sensitivity",
        ],
        "classes": [
            "dry",
            "normal",
            "combination",
        ],
    },
    {
        "name": "Hyaluronic Hydration Essence",
        "category": "hydration",
        "ingredients": [
            "hyaluronic acid",
            "beta-glucan",
        ],
        "benefits": [
            "dehydration",
            "plumping",
            "comfort",
        ],
        "classes": [
            "dry",
            "normal",
            "combination",
        ],
    },
    {
        "name": "Broad Spectrum Daily Sunscreen",
        "category": "sunscreen",
        "ingredients": [
            "broad-spectrum UV filters",
        ],
        "benefits": [
            "daily UV protection",
            "helps reduce worsening of visible pigmentation",
        ],
        "classes": [
            "normal",
            "oily",
            "dry",
            "combination",
        ],
    },
]


# ============================================================
# CONCERN LABELS
# ============================================================

CONCERN_LABELS = {
    "acne_severity": "Acne",
    "blackheads": "Blackheads",
    "whiteheads": "Whiteheads",
    "open_pores": "Open pores",
    "excessive_oil": "Excess oil",
    "skin_irritation": "Irritation",
    "skin_sensitivity": "Sensitivity",
    "redness": "Redness",
    "fine_lines": "Fine lines",
    "eye_puffiness": "Eye puffiness",
    "dark_circles": "Dark circles",
    "forehead_wrinkles": "Forehead wrinkles",
    "skin_elasticity": "Elasticity concern",
    "dehydration": "Dehydration",
    "dark_spots": "Dark spots",
    "post_acne_marks": "Post-acne marks",
    "uneven_skin": "Uneven skin",
    "freckles": "Freckles",
}


# ============================================================
# MODEL LOADING
# ============================================================

def load_checkpoint():
    global MODEL, GENERATOR

    # -----------------------------
    # Multi-task CNN
    # -----------------------------

    multitask = ARTIFACTS / "skin_multitask.pt"

    if multitask.exists():
        payload = torch.load(
            multitask,
            map_location=DEVICE
        )

        MODEL = SkinMultiTaskModel(
            pretrained=False
        ).to(DEVICE)

        MODEL.load_state_dict(
            payload["model_state_dict"]
        )

        MODEL.eval()

        print("✓ Multi-task model loaded")


    # -----------------------------
    # Conditional GAN
    # -----------------------------

    gan = ARTIFACTS / "skin_generator.pt"

    if gan.exists():
        payload = torch.load(
            gan,
            map_location=DEVICE
        )

        GENERATOR = ConditionalGenerator().to(DEVICE)

        state = payload.get(
            "generator_state_dict",
            payload
        )

        GENERATOR.load_state_dict(state)

        GENERATOR.eval()

        print("✓ GAN generator loaded")


# ============================================================
# FASTAPI LIFESPAN
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    load_checkpoint()
    yield


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="SkinIntel AI API",
    version="2.0.0",
    lifespan=lifespan,
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3005",
        "http://127.0.0.1:3005",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# IMAGE PREPROCESSING
# ============================================================

def preprocess_image(image: Image.Image):

    from torchvision import transforms

    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(
            [0.485, 0.456, 0.406],
            [0.229, 0.224, 0.225],
        ),
    ])

    return transform(image).unsqueeze(0).to(DEVICE)


# ============================================================
# GAN IMAGE → BASE64
# ============================================================

def image_to_base64(tensor):

    arr = tensor.detach().cpu().squeeze(0)

    arr = (
        (arr.clamp(-1, 1) + 1)
        * 127.5
    ).byte()

    arr = arr.permute(
        1,
        2,
        0
    ).numpy()

    image = Image.fromarray(arr)

    buffer = io.BytesIO()

    image.save(
        buffer,
        format="JPEG",
        quality=88,
    )

    encoded = base64.b64encode(
        buffer.getvalue()
    ).decode()

    return (
        "data:image/jpeg;base64,"
        + encoded
    )


# ============================================================
# RECOMMENDATION ENGINE
# ============================================================

def build_recommendations(
    skin_type: str,
    concerns: Dict[str, float]
):

    ranked = []

    for product in PRODUCT_CATALOG:

        # ====================================================
        # TOTAL SCORE = 100
        #
        # Skin compatibility = 45%
        # Concern relevance   = 45%
        # Ingredient quality  = 10%
        # ====================================================

        score = 0.0


        # ----------------------------------------------------
        # 1. SKIN TYPE COMPATIBILITY — 45 POINTS
        # ----------------------------------------------------

        skin_match = (
            1.0
            if skin_type in product["classes"]
            else 0.0
        )

        score += skin_match * 45.0


        # ----------------------------------------------------
        # 2. CONCERN RELEVANCE — 45 POINTS
        # ----------------------------------------------------

        benefits = " ".join(
            product.get(
                "benefits",
                []
            )
        ).lower()

        ingredients = " ".join(
            product.get(
                "ingredients",
                []
            )
        ).lower()

        product_text = (
            f"{benefits} {ingredients}"
        )


        concern_score = 0.0
        concern_weight = 0.0


        # Clinically relevant keyword associations
        aliases = {

            "dehydration": [
                "hydration",
                "moisture",
                "hyaluronic",
                "glycerin",
                "beta-glucan",
            ],

            "skin_sensitivity": [
                "sensitive",
                "soothing",
                "calming",
                "barrier",
                "ceramide",
            ],

            "skin_irritation": [
                "soothing",
                "calming",
                "barrier",
                "panthenol",
            ],

            "redness": [
                "redness",
                "soothing",
                "calming",
            ],

            "dark_spots": [
                "dark spot",
                "pigmentation",
                "brightening",
            ],

            "post_acne_marks": [
                "acne",
                "marks",
                "brightening",
            ],

            "uneven_skin": [
                "uneven",
                "brightening",
                "texture",
            ],

            "acne_severity": [
                "acne",
                "blemish",
                "oil",
                "salicylic",
            ],

            "excessive_oil": [
                "oil",
                "sebum",
                "mattifying",
                "niacinamide",
            ],

            "blackheads": [
                "blackhead",
                "oil",
                "pore",
                "salicylic",
            ],

            "whiteheads": [
                "whitehead",
                "acne",
                "pore",
            ],

            "open_pores": [
                "pore",
                "refining",
                "niacinamide",
            ],

            "fine_lines": [
                "fine line",
                "anti-aging",
                "retinol",
            ],

            "forehead_wrinkles": [
                "wrinkle",
                "anti-aging",
                "retinol",
            ],

            "skin_elasticity": [
                "elasticity",
                "firming",
                "collagen",
            ],

            "dark_circles": [
                "dark circle",
                "eye",
                "brightening",
            ],

            "eye_puffiness": [
                "puffiness",
                "eye",
                "de-puff",
            ],

            "freckles": [
                "freckle",
                "pigmentation",
                "brightening",
            ],
        }


        for name, value in concerns.items():

            # Ignore very low concern values
            if value < 2.0:
                continue

            label = CONCERN_LABELS.get(
                name,
                name
            ).lower()

            keywords = {
                name.replace(
                    "_",
                    " "
                ).lower(),

                label,
            }

            keywords.update(
                aliases.get(
                    name,
                    []
                )
            )

            matched = any(
                keyword in product_text
                for keyword in keywords
            )

            if matched:

                concern_score += float(value)

                concern_weight += 5.0


        # Normalize concern relevance
        if concern_weight > 0:

            concern_relevance = min(
                concern_score / concern_weight,
                1.0
            )

        else:

            concern_relevance = 0.0


        score += (
            concern_relevance
            * 45.0
        )


        # ----------------------------------------------------
        # 3. INGREDIENT QUALITY — 10 POINTS
        # ----------------------------------------------------

        quality_keywords = [
            "ceramide",
            "ceramides",
            "glycerin",
            "squalane",
            "hyaluronic acid",
            "niacinamide",
            "beta-glucan",
        ]

        quality_matches = sum(
            1
            for keyword in quality_keywords
            if keyword in product_text
        )

        quality_bonus = min(
            quality_matches / 3.0,
            1.0
        ) * 10.0

        score += quality_bonus


        # Store result
        ranked.append(
            (
                score,
                product
            )
        )


    # ========================================================
    # SORT PRODUCTS BY SCORE
    # ========================================================

    ranked.sort(
        key=lambda x: x[0],
        reverse=True
    )


    # ========================================================
    # RETURN TOP 4
    #
    # IMPORTANT:
    # Frontend multiplies match_score by 100.
    # Therefore backend returns 0.00 → 1.00.
    # ========================================================

    recommendations = []

    for score, product in ranked[:4]:

        normalized_score = min(
            score / 100.0,
            1.0
        )

        recommendations.append({
            **product,

            "match_score": round(
                float(normalized_score),
                2
            ),

            "note": (
                "Cosmetic suitability is informational; "
                "patch-test new products and follow "
                "product directions."
            ),
        })

    return recommendations


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
async def health():

    return {
        "status": "ok",
        "device": str(DEVICE),
        "multitask_model_loaded": MODEL is not None,
        "gan_loaded": GENERATOR is not None,
    }


# ============================================================
# MAIN AI ANALYSIS ENDPOINT
# ============================================================

@app.post("/api/analyze")
async def analyze(
    file: UploadFile = File(...)
):

    # --------------------------------------------------------
    # Validate file type
    # --------------------------------------------------------

    if file.content_type not in {
        "image/jpeg",
        "image/png",
        "image/webp",
    }:

        raise HTTPException(
            status_code=415,
            detail=(
                "Upload a JPEG, PNG, "
                "or WebP image."
            ),
        )


    # --------------------------------------------------------
    # Read uploaded image
    # --------------------------------------------------------

    raw = await file.read()


    # --------------------------------------------------------
    # File size validation
    # --------------------------------------------------------

    if len(raw) > MAX_UPLOAD_BYTES:

        raise HTTPException(
            status_code=413,
            detail=(
                "Image must be smaller "
                "than 8 MB."
            ),
        )


    # --------------------------------------------------------
    # Decode image
    # --------------------------------------------------------

    try:

        image = Image.open(
            io.BytesIO(raw)
        ).convert("RGB")

    except Exception as exc:

        raise HTTPException(
            status_code=400,
            detail="Invalid image file.",
        ) from exc


    # --------------------------------------------------------
    # Check model
    # --------------------------------------------------------

    if MODEL is None:

        raise HTTPException(
            status_code=503,
            detail=(
                "The multitask model is not "
                "trained yet. Run "
                "train_multitask.py first."
            ),
        )


    # --------------------------------------------------------
    # Preprocess
    # --------------------------------------------------------

    x = preprocess_image(image)


    # --------------------------------------------------------
    # AI INFERENCE
    # --------------------------------------------------------

    with torch.inference_mode():

        output = MODEL(x)


        # Skin type probabilities
        probabilities = torch.softmax(
            output["skin_logits"],
            dim=1
        )[0]


        # Highest probability class
        skin_index = int(
            probabilities.argmax().item()
        )


        skin_type = SKIN_CLASSES[
            skin_index
        ]


        confidence = float(
            probabilities[
                skin_index
            ].item()
        )


        # Concern scores
        concern_scores = (
            output["concern_scores"][0]
            .clamp(0, 5)
            .cpu()
            .numpy()
        )


    # --------------------------------------------------------
    # BUILD CONCERN DICTIONARY
    # --------------------------------------------------------

    concerns = {

        name: round(
            float(score),
            2
        )

        for name, score in zip(
            CONCERN_NAMES,
            concern_scores
        )
    }


    # --------------------------------------------------------
    # TOP CONCERNS
    # --------------------------------------------------------

    top_concerns = sorted(

        [
            {
                "key": key,
                "label": CONCERN_LABELS[key],
                "score": value,
            }

            for key, value
            in concerns.items()
        ],

        key=lambda item: item["score"],

        reverse=True,

    )[:6]


    # --------------------------------------------------------
    # GAN SYNTHETIC REFERENCE
    # --------------------------------------------------------

    simulation = None

    if GENERATOR is not None:

        z = torch.randn(
            1,
            128,
            device=DEVICE
        )

        label = torch.tensor(
            [skin_index],
            device=DEVICE
        )


        with torch.inference_mode():

            generated_image = GENERATOR(
                z,
                label
            )


            simulation = image_to_base64(
                generated_image
            )


    # --------------------------------------------------------
    # RECOMMENDATIONS
    # --------------------------------------------------------

    recommendations = build_recommendations(
        skin_type,
        concerns
    )


    # --------------------------------------------------------
    # FINAL RESPONSE
    # --------------------------------------------------------

    return {

        "skin_type": skin_type,

        "confidence": round(
            confidence,
            4
        ),

        "metrics": {

            cls: round(
                float(
                    probabilities[i].item()
                ),
                4
            )

            for i, cls
            in enumerate(SKIN_CLASSES)
        },

        "concerns": concerns,

        "top_concerns": top_concerns,

        "simulation_image": simulation,

        "recommendations": recommendations,

        "disclaimer": (
            "Educational skin-analysis support only. "
            "This system is not a medical diagnosis "
            "and should not replace a dermatologist."
        ),
    }