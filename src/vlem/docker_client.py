import sys
import docker
from docker.errors import DockerException
from rich.console import Console

console = Console()


def get_docker_client() -> docker.DockerClient:
    """Initialize Docker client and check connection"""
    try:
        client = docker.from_env()
        client.ping()  # Check Docker is responsive
        return client
    except DockerException:
        console.print(
            "[bold red]Docker is not running or not accessible. Please start Docker and try again.[/bold red]"
        )
        sys.exit(1)
