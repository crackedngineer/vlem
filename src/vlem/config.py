from vlem.logger import configure_logging, get_system_log_path

log_file_path = get_system_log_path()
logger = configure_logging(log_file_path)
