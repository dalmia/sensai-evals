#!/usr/bin/env python3
"""
Script to compute test coverage for the database module.
This script uses the pytest.ini configuration to ensure only src/db code is counted.
"""

import subprocess
import sys
import os
from pathlib import Path


def run_coverage():
    """Run pytest with coverage and generate reports."""
    try:
        # Run pytest with coverage
        result = subprocess.run(
            [
                "python",
                "-m",
                "pytest",
                "--cov=src/db",
                "--cov-report=term-missing",
                "--cov-report=html",
                "--cov-report=xml",
                "--cov-fail-under=80",
                "tests/",
            ],
            capture_output=True,
            text=True,
            check=True,
        )

        print("Coverage computation completed successfully!")
        print(result.stdout)

        # Check if coverage files were created
        if os.path.exists("htmlcov/index.html"):
            print("HTML coverage report generated at htmlcov/index.html")

        if os.path.exists("coverage.xml"):
            print("XML coverage report generated at coverage.xml")

        return True

    except subprocess.CalledProcessError as e:
        print(f"Error running coverage: {e}")
        print(f"stdout: {e.stdout}")
        print(f"stderr: {e.stderr}")
        return False


def main():
    """Main function to run coverage computation."""
    print("Computing test coverage for src/db module...")

    # Ensure we're in the project root
    project_root = Path(__file__).parent.parent
    os.chdir(project_root)

    success = run_coverage()

    if success:
        print("\nCoverage computation completed successfully!")
        sys.exit(0)
    else:
        print("\nCoverage computation failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()
