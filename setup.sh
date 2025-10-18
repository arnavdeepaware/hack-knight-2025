#!/bin/bash

echo "Setting up Food Assistant project..."

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies with specific versions
echo "Installing dependencies..."
pip install -r requirements.txt

# Verify Flask and Werkzeug versions
echo "Verifying installed versions:"
pip show flask werkzeug

echo "Setup complete! Run the app with: python backend/app.py"
