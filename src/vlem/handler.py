from typing import Optional, List
from docker.errors import APIError
from rich.console import Console
from rich.table import Table

from vlem.docker_client import get_docker_client
from vlem.utils import (
    list_containers,
    fetch_lab_environment,
    fetch_container,
    image_available,
    pull_image,
    create_container,
    fetch_network,
    create_network,
    format_ports,
)
from vlem.constants import LAB_NETWORK

console = Console()
client = get_docker_client()


def add_handler(
    lab_name: str, name: Optional[str], ports: List[str], restart_policy: str = "no"
):
    """
    Handles the lifecycle of a lab container.
    Stops and removes an existing container if found, pulls image if needed, and starts a new container.
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
                    f"[blue]No existing container found. Proceeding to create one...[/blue]"
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
            console.print(
                f"[bold green]Lab '{lab_details["name"]}' started successfully![/bold green] "
                f"(Container ID: {container.short_id})"
            )

    except APIError as e:
        console.print(f"[red]Docker API Error: {e}[/red]")
    except Exception as e:
        console.print(f"[red]Unexpected error: {e}[/red]")


def list_handler():
    """
    Lists and displays Docker containers with a specific label in a formatted table.

    Args:
        client: The Docker client object.
    """
    containers = list_containers(client)

    if not containers:
        console.print("[yellow]No lab environments found[/yellow]")
        return

    table = Table(
        title="Lab Environments", style="bold white", header_style="bold cyan"
    )
    table.add_column("Name", style="cyan", header_style="bold cyan")
    table.add_column("Image", style="magenta", header_style="bold magenta")
    table.add_column("Status", style="green", header_style="bold green")

    for container in containers:
        image_name = container.image.tags[0] if container.image and container.image.tags else "untagged"
        # Use a more robust way to get status
        status = container.status
        table.add_row(
            container.name,
            image_name,
            status,
        )

    console.print(table)
