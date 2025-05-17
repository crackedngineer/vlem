import json
from pathlib import Path
from unittest.mock import patch

import pytest
import requests

from vlem.helper import read_data_from_api, read_json


def test_read_json_success(tmp_path):
    test_data = {"name": "test", "value": 123}
    filepath = tmp_path / "test.json"
    with open(filepath, "w") as f:
        json.dump(test_data, f)
    result = read_json(filepath)
    assert result == test_data


def test_read_json_file_not_found():
    filepath = Path("nonexistent.json")
    with pytest.raises(FileNotFoundError):
        read_json(filepath)


def test_read_json_invalid_json(tmp_path):
    filepath = tmp_path / "invalid.json"
    with open(filepath, "w") as f:
        f.write("this is not valid json")
    with pytest.raises(json.JSONDecodeError):
        read_json(filepath)


@patch("requests.get")
def test_read_data_from_api_success(mock_get):
    mock_response = mock_get.return_value
    mock_response.status_code = 200
    mock_response.json.return_value = {"data": "test from api"}
    url = "http://example.com/api/data"
    result = read_data_from_api(url)
    assert result == {"data": "test from api"}
    mock_get.assert_called_once_with(url, verify=False)


@patch("requests.get")
def test_read_data_from_api_error_status(mock_get):
    mock_response = mock_get.return_value
    mock_response.status_code = 404
    mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError(
        "Not Found"
    )
    url = "http://example.com/api/error"
    with pytest.raises(requests.exceptions.RequestException) as exc_info:
        read_data_from_api(url)
    assert (
        str(exc_info.value)
        == "Error during API request to 'http://example.com/api/error': Not Found"
    )
    mock_get.assert_called_once_with(url, verify=False)


@patch("requests.get")
def test_read_data_from_api_json_decode_error(mock_get):
    mock_response = mock_get.return_value
    mock_response.status_code = 200
    mock_response.json.side_effect = json.JSONDecodeError("Expecting value", "", 0)
    url = "http://example.com/api/invalid_json"
    with pytest.raises(json.JSONDecodeError):
        read_data_from_api(url)
    mock_get.assert_called_once_with(url, verify=False)


@patch("requests.get")
def test_read_data_from_api_ssl_verification(mock_get):
    mock_response = mock_get.return_value
    mock_response.status_code = 200
    mock_response.json.return_value = {"data": "ssl test"}
    url_with_ssl = "https://secure.example.com/api/data"
    read_data_from_api(url_with_ssl, ssl_verify=True)
    mock_get.assert_called_once_with(url_with_ssl, verify=True)

    read_data_from_api(url_with_ssl)  # Default ssl_verify is False
    mock_get.assert_called_with(url_with_ssl, verify=False)
