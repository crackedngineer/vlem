from typing import List, Optional

from docker.errors import APIError
from docker.models.containers import Container
from rich.console import Console

from vlem.config import log_file_path
from vlem.constants import LAB_NETWORK
from vlem.docker_client import get_docker_client
from vlem.utils import (
    create_container,
    create_network,
    fetch_container,
    fetch_lab_environment,
    fetch_network,
    format_ports,
    image_available,
    list_containers,
    pull_image,
)

console = Console()
client = get_docker_client()


def add_handler(
    lab_name: str, name: Optional[str], ports: List[str], restart_policy: str = "no"
):
    """
    Handles the lifecycle of a lab container.

    Stops and removes an existing container if found, pulls the Docker image
    if it's not available locally, creates a Docker network if it doesn't exist,
    and then creates and starts a new container based on the provided
    lab configuration.

    Args:
        lab_name (str): The name of the lab environment to deploy. This is
            used to fetch lab details (like image name) from a configuration source.
        name (Optional[str]): An optional custom name for the container. If not
            provided, the name from the lab configuration will be used.
        ports (List[str]): A list of port mappings to expose for the container,
            in the format 'host_port:container_port'.
        restart_policy (str, optional): The restart policy for the container
            (e.g., 'no', 'on-failure', 'always'). Defaults to 'no'.

    Raises:
        docker.errors.APIError: If there is an error interacting with the Docker API.
        Exception: For unexpected errors during the process.
    """
    try:
        lab_details = fetch_lab_environment(name=lab_name)
        container_name = name if name else lab_details["name"]
        image = lab_details["image"]

        with console.status(
            "[bold cyan]Preparing Docker environment...[/]", spinner="dots"
        ) as status:
            container = fetch_container(client, container_name=container_name)

            if container:
                status.update("[yellow]Existing container found. Removing...[/]")
                if container.status == "running":
                    container.stop()
                    console.log(f"[green]Stopped container '{container_name}'[/green]")
                container.remove(force=True)
                console.log(f"[green]Removed container '{container_name}'[/green]")
            else:
                console.log(
                    "[blue]No existing container found. "
                    "Proceeding to create one...[/blue]"
                )

            # Format Ports
            container_ports = format_ports(ports)

            # Pulling Image
            status.update(f"[cyan]Ensuring image '{image}' is available...[/cyan]")
            if not image_available(client, image):
                try:
                    status.update(
                        f"[cyan]Pulling image '{image}' from Docker Hub...[/cyan]"
                    )
                    for line in pull_image(client, image):
                        status_msg = line.get("status", "")
                        if status_msg:
                            console.log(f"[blue]Pulling... {status_msg}[/blue]")
                except APIError as e:
                    console.print(f"[red]Failed to pull image: {e}[/red]")
                    return

            # Creating Network
            status.update("[cyan]Creating new network...[/cyan]")
            network = fetch_network(client, network_name=LAB_NETWORK)
            if not network:
                network = create_network(client, network_name=LAB_NETWORK)

            status.update("[cyan]Creating and starting new container...[/cyan]")
            container = create_container(
                client=client,
                image_name=image,
                container_name=container_name,
                restart_policy=restart_policy,
                network_name=LAB_NETWORK,
                ports=container_ports,
            )
            container.start()

            console.log(
                f"[green]Container '{container_name}' is deployed and running.[/green]"
            )
            message = f"Lab '{lab_details['name']}' started successfully!"
            console.print(
                f"[bold green]{message}[/bold green] "
                f"(Container ID: {container.short_id})"
            )

    except APIError as e:
        console.print(f"[red]Docker API Error: {e}[/red]")
    except Exception as e:
        console.print(
            f"[red]Unexpected error: {e}[/red]"
            f"\nPlease check the logs {log_file_path}"
        )


def list_handler() -> None:
    """
    Lists and displays Docker containers with a specific label in a horizontal format.

    Args:
        client: The Docker client object.
    """
    containers: List[Container] = list_containers(client)

    if not containers:
        console.print("[yellow]No lab environments found[/yellow]")
        return

    console.print("[bold underline white]Lab Environments[/bold underline white]\n")
    headers = ["Container ID", "Name", "Image", "Status"]
    console.print(
        f"[bold cyan]{headers[0]:<25}[/bold cyan]"
        f"[bold cyan]{headers[1]:<25}[/bold cyan]"
        f"[bold magenta]{headers[2]:<40}[/bold magenta]"
        f"[bold green]{headers[3]:<10}[/bold green]"
    )

    for container in containers:
        image_name = (
            container.image.tags[0]
            if container.image and container.image.tags
            else "untagged"
        )
        console.print(
            f"[cyan]{container.short_id:<25}[/cyan]"
            f"[cyan]{container.name:<25}[/cyan]"
            f"[magenta]{image_name:<40}[/magenta]"
            f"[green]{container.status:<10}[/green]"
        )
