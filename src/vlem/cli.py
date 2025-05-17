import typer
from typing import List

from vlem.handler import list_handler, add_handler

app = typer.Typer()


@app.command()
def add(
    lab: str,
    name: str = typer.Option(
        None, "--name", "-n", help="Name for the lab environment (optional)"
    ),
    restart_policy: str = typer.Option(
        "no", "--restart", help="Restart Policy of the lab environment (optional)"
    ),
    ports: List[str] = typer.Option(
        None,
        "--port",
        "-p",
        help="Expose container ports in format host:container (e.g. -p 80:80 -p 443:443)",
    ),
):
    """Add Lab Environment"""
    add_handler(lab_name=lab, name=name, ports=ports, restart_policy=restart_policy)


@app.command()
def list():
    """List Lab 6"""
    list_handler()
