from setuptools import find_packages, setup

setup(
    name="python_utils",
    version="0.1.0",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    install_requires=[
        # Essential dependencies for the remaining utilities
        "langchain-openai",  # for embedding functionality
        "pydantic",  # for data validation
        "python-dotenv",  # for environment variables
        "tenacity",  # for retry logic
        "numpy",  # for similarity calculations
    ],
) 