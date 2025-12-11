import sys
import os

#this is needed to import the python_utils models into the tests
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
UTILS_PATH = os.path.join(ROOT, "packages/python-utils/src")

if UTILS_PATH not in sys.path:
    sys.path.insert(0, UTILS_PATH)
