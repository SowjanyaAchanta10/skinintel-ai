# SkinIntel AI — Persistent Coding Notes

## Architecture

- Frontend: Next.js App Router + TypeScript + Tailwind CSS + Lucide React.
- Backend: FastAPI + PyTorch + torchvision + Pillow.
- CNN: ResNet18 backbone with a calibrated classification head.
- GAN: class-conditioned generator and projection discriminator.
- Recommendation layer: deterministic ingredient/product catalog in `backend/main.py`.
- API:
  - `GET /health`
  - `GET /api/recommendations?skin_type=oily`
  - `POST /api/analyze` with a multipart image field named `file`.

## Dataset convention

The training loader recursively searches the dataset root for image files and recognizes these class folder names from the uploaded dataset:

`normal`, `oily`, `dry`, `combination`

The uploaded archive has an explicit train/valid/test split:

```text
skin_type_classification_dataset/
├── train/
│   ├── combination/   248 images
│   ├── dry/           833 images
│   ├── normal/        976 images
│   └── oily/          815 images
├── valid/
│   ├── combination/    63 images
│   ├── dry/            257 images
│   ├── normal/         263 images
│   └── oily/           229 images
├── test/
│   ├── combination/    30 images
│   ├── dry/            113 images
│   ├── normal/         160 images
│   └── oily/           106 images
├── skinalaysis_labeling_train1.xlsx
└── skinanalysis_valid1.xlsx
```

Total image counts are 2,872 train + 812 validation + 409 test = 4,093 images.

**Important:** this dataset does not contain an `acne/` class folder, so the production classifier is configured for four classes rather than five.

Nested directories are also supported when one of their path components matches a class name.

## Backend setup

From the `backend` directory:

```bash
python -m venv .venv
```

Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

Linux/macOS:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Train the classifier using the extracted dataset root:

```bash
python train_classifier.py --data "C:\path\to\skin_type_classification_dataset" --epochs 15 --batch-size 32
```

The loader automatically uses the dataset's existing `train/` and `valid/` folders. Keep `test/` untouched for final evaluation.

Train the conditional GAN:

```bash
python train_gan.py --data "C:\path\to\skin_type_classification_dataset" --epochs 30 --batch-size 32
```

Start the API:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The generated checkpoints are expected at:

```text
backend/artifacts/skin_classifier.pt
backend/artifacts/skin_generator.pt
backend/artifacts/skin_discriminator.pt
```

## Frontend setup

Create a normal Next.js App Router project and install:

```bash
npm install lucide-react
```

Tailwind should be configured according to the current Next.js/Tailwind setup used by the project.

Copy `frontend/app/dashboard/page.tsx` into the project's:

```text
app/dashboard/page.tsx
```

Set the frontend API URL:

```text
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Run:

```bash
npm run dev
```

Open:

```text
http://localhost:3000/dashboard
```

## Training notes

1. Confirm the Kaggle class names before training. If the dataset uses different folder names, update `SKIN_CLASSES` and the class list passed to the dataset loader.
2. The classifier uses ImageNet normalization and transfer learning. The uploaded dataset has four skin-type classes: normal, oily, dry, and combination.
3. The GAN training path uses [-1, 1] normalization and must remain separate from the CNN preprocessing pipeline.
4. The weighted sampler reduces the effect of class imbalance during CNN training.
5. Use a fixed validation split and keep a final held-out test set for panel-ready evaluation.
6. Report accuracy, macro F1, precision, recall, confusion matrix, and per-class support rather than accuracy alone.
7. For the GAN, evaluate generated samples visually and with quantitative measures such as FID or KID when the project scope permits. The generator now produces 224×224 images to match the classifier input size.
8. Do not describe GAN outputs as medically ideal skin. They are synthetic visual references.

## Production hardening

- Replace the in-code product catalog with SQLite/PostgreSQL once the UI is stable.
- Store model versions and preprocessing configuration alongside each checkpoint.
- Add authentication/rate limiting before exposing inference publicly.
- Add structured logging and request IDs.
- Restrict CORS to the deployed frontend domain.
- Store uploads only when there is a documented reason; otherwise process them in memory as implemented.
- Add automated tests for API validation, preprocessing, class mapping, and recommendation logic.
- Use HTTPS in deployment.
- Pin tested package versions after validating the final environment.
- Run the FastAPI service behind a production process manager/container.
- Never claim that the model diagnoses a disease. Present it as an AI-assisted skin appearance/type analysis system and cosmetic matching tool.

## Recommended panel demonstration flow

1. Show the architecture diagram: Next.js → FastAPI → preprocessing → ResNet classifier → recommendation engine.
2. Upload a representative image.
3. Show the animated scanning state.
4. Explain the probability distribution instead of presenting only the top class.
5. Show the side-by-side input and conditional GAN simulation.
6. Explain that GAN augmentation can help balance training data and explore class-conditioned visual synthesis.
7. Show ingredient-level reasoning and the product match score.
8. Show validation metrics and confusion matrix from the actual trained model.
9. Explain limitations, dataset bias, and why the system is not a medical diagnostic device.


## Multi-task annotation upgrade

The supplied annotation sheets contain 150 training rows and 50 validation rows, linked exactly to images in the train/valid folders. The upgraded model predicts:

- 4 skin types: normal, oily, dry, combination
- 18 concern severity scores on a 0–5 scale

The model uses a shared ResNet18 backbone and two heads. Skin type uses cross-entropy; concern severity uses masked SmoothL1 loss so the 2,672 unannotated training images still contribute to skin-type learning.

### Train the multi-task model

From `backend`:

```powershell
python train_multitask.py --data "C:\path\to\skin_type_classification_dataset" --epochs 15 --batch-size 32
```

The script automatically uses:
- `skinalaysis_labeling_train1.xlsx`
- `skinanalysis_valid1.xlsx`

If they are elsewhere, pass `--train-annotations` and `--valid-annotations`.

The best checkpoint is saved as:

`backend/artifacts/skin_multitask.pt`

### Evaluate

```powershell
pip install scikit-learn
python evaluate_multitask.py --data "C:\path\to\skin_type_classification_dataset"
```

Report:
- per-class precision/recall/F1
- confusion matrix
- skin-type accuracy
- concern MAE

### Recommended training order

1. Train the original skin classifier on all train images.
2. Train the multi-task model; it warm-starts the ResNet backbone from `artifacts/skin_classifier.pt`.
3. Train the conditional GAN.
4. Start FastAPI.
5. Start Next.js.
6. Demonstrate the full analysis workflow.

### Data-quality handling

The annotation parser clips severity values to the documented 0–5 range. This prevents an out-of-range spreadsheet value from destabilizing training. It also maps the validation sheet's `pigmentation` field to the common `dark_spots` model target.

The test split remains untouched for final evaluation.
