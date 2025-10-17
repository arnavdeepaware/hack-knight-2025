# AI/ML

This directory contains machine learning and AI-related code.

## Folder Structure

```
ai-ml/
├── src/                    # Source code
│   ├── models/            # Model architectures and definitions
│   ├── data/              # Data loading and handling
│   ├── training/          # Training scripts and logic
│   ├── inference/         # Model inference and prediction
│   ├── preprocessing/     # Data preprocessing pipelines
│   └── evaluation/        # Model evaluation metrics
├── notebooks/             # Jupyter notebooks for experimentation
├── data/                  # Data directory
│   ├── raw/              # Raw, immutable data
│   ├── processed/        # Cleaned and processed data
│   └── external/         # External datasets
├── experiments/           # Experiment tracking and results
└── tests/                # Test files
```

## Getting Started

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run Jupyter notebooks:
   ```bash
   jupyter notebook
   ```

4. Train a model:
   ```bash
   python src/training/train.py
   ```

## Technologies

- Python
- PyTorch / TensorFlow
- scikit-learn
- pandas / numpy
- Jupyter
- MLflow (experiment tracking)
