class LabNotFoundError(Exception):
    def __init__(self, lab_name: str):
        super().__init__(f"Lab with name '{lab_name}' not found.")

class PullImageError(Exception):
    pass

class ContainerNotFound(Exception):
    def __init__(self, *args: object) -> None:
        super().__init__(f"No active container found.")