import logging
import os
import sys

from vlem.constants import APPLICATION_LOGS_FILE


def get_system_log_path():
    """
    Determines the appropriate log file path based on the operating system.

    Returns:
        str: The log file path.
    """
    system = sys.platform
    if system.startswith("darwin"):
        log_dir = os.path.join(os.path.expanduser("~"), "Library", "Logs")
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)
        return os.path.join(log_dir, APPLICATION_LOGS_FILE)
    elif system.startswith("win"):
        log_dir = os.path.join(os.environ["LOCALAPPDATA"], "vlem")
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)
        return os.path.join(log_dir, APPLICATION_LOGS_FILE)
    else:
        return APPLICATION_LOGS_FILE


def configure_logging(log_file_path):
    """
    Configures the logging system.

    Args:
        log_file_path (str): The path to the log file.
    """
    # Create a logger
    logger = logging.getLogger(__name__)  # Use __name__ for the logger name
    logger.setLevel(logging.DEBUG)  # Set the logging level

    # Create a file handler
    file_handler = logging.FileHandler(
        log_file_path, mode="a", encoding="utf-8"
    )  # Append mode and encoding
    file_handler.setLevel(logging.DEBUG)  # Set the handler level

    # Create a formatter
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s - %(filename)s:%(lineno)d"
    )  # More detailed format
    file_handler.setFormatter(formatter)

    # Add the file handler to the logger
    logger.addHandler(file_handler)

    # Add a stream handler to also log to console
    stream_handler = logging.StreamHandler()
    stream_handler.setLevel(logging.INFO)  # Set the level for console output
    stream_formatter = logging.Formatter(
        "%(levelname)s - %(message)s"
    )  # Simpler format for console
    stream_handler.setFormatter(stream_formatter)
    logger.addHandler(stream_handler)
    return logger
