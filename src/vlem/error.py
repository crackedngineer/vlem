class LabNotFoundError(Exception):
    """Custom exception for when a lab is not found."""

    def __init__(self, lab_name: str):
        super().__init__(f"Lab not found: {lab_name}")
        self.lab_name = lab_name


class PullImageError(Exception):
    pass


class ContainerNotFound(Exception):
    def __init__(self, *args: object) -> None:
        super().__init__("No active container found.")
