import json
import requests
from pathlib import Path
from typing import Dict


def read_json(filepath: Path):
    with open(filepath, "r") as file:
        return json.load(file)


def read_data_from_api(url: str, ssl_verify: bool = False):
    response = requests.get(url, verify=ssl_verify)
    return response.json()
