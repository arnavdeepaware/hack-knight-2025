#!/bin/bash

echo "Fixing Flask and Werkzeug compatibility issue..."

# Activate the virtual environment
source venv/bin/activate

# Uninstall current versions of Flask and Werkzeug
echo "Removing current Flask and Werkzeug installations..."
pip uninstall -y flask werkzeug

# Install specific compatible versions
echo "Installing compatible versions..."
pip install werkzeug==2.0.3
pip install flask==2.0.3

# Verify installed versions
echo "Verifying installed versions:"
pip show flask werkzeug

echo "Fix complete! Now try running your app again."
