import json
from pathlib import Path
from typing import Dict

import requests


def read_json(filepath: Path) -> Dict:
    """
    Reads and parses JSON data from a file.

    Args:
        filepath: The path to the JSON file.

    Returns:
        A dictionary representing the JSON data.

    Raises:
        FileNotFoundError: If the specified file does not exist.
        json.JSONDecodeError: If the file contains invalid JSON.
    """
    try:
        with open(filepath, "r") as file:
            return json.load(file)
    except FileNotFoundError:
        raise FileNotFoundError(f"Error: File not found at '{filepath}'")
    except json.JSONDecodeError as e:
        raise json.JSONDecodeError(
            f"Error decoding JSON from '{filepath}': {e.msg}", e.doc, e.pos
        )


def read_data_from_api(url: str, ssl_verify: bool = False) -> Dict:
    """
    Fetches JSON data from a given API endpoint.

    Args:
        url: The URL of the API endpoint.
        ssl_verify: Whether to verify the SSL certificate (default: False).

    Returns:
        A dictionary representing the JSON data from the API.

    Raises:
        requests.exceptions.RequestException: For network-related errors.
        json.JSONDecodeError: If the API response is not valid JSON.
        requests.exceptions.HTTPError: If the HTTP status code indicates an error.
    """
    try:
        response = requests.get(url, verify=ssl_verify)
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)
        return response.json()
    except requests.exceptions.RequestException as e:
        raise requests.exceptions.RequestException(
            f"Error during API request to '{url}': {e}"
        )
    except json.JSONDecodeError as e:
        raise json.JSONDecodeError(
            f"Error decoding JSON from API response at '{url}': {e.msg}", e.doc, e.pos
        )
