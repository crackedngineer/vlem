import fs from "fs";
import net from "net";
import readline from "readline";

import ora, { Ora } from "ora";
import chalk from "chalk";
import Docker, { ContainerInfo } from "dockerode";
import axios from "axios";

import { DEFAULT_PORT, PORT_TYPE } from "./constants";
import { LabDetailsType, LabObject, PortBinding, EnvVars } from "./types";
import { determineExternalPort } from "./helpers";

const docker = new Docker();

export const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Function to bind ports
async function bindPorts(labObj: LabObject): Promise<{
  portBinding: PortBinding;
  applicationPort: number | undefined;
}> {
  const portBinding: PortBinding = {};
  const defaultPort = DEFAULT_PORT;
  let applicationPort: number | undefined;

  for (const port of labObj.default.ports) {
    const externalPort = await determineExternalPort(port, defaultPort);
    portBinding[externalPort] = port.internal;

    if (!applicationPort && port.type === PORT_TYPE.APPLICATION) {
      applicationPort = externalPort;
    }
  }

  return { portBinding, applicationPort };
}

export const checkDockerInstalled = async (): Promise<void> => {
  try {
    await docker.ping();
  } catch (error) {
    console.error(
      chalk.red(
        "Docker is not installed or not running. Please install Docker and run this script again."
      )
    );
    process.exit(1);
  }
};

export const ensureNetworkExists = async (
  networkName: string
): Promise<void> => {
  try {
    const networks = await docker.listNetworks();
    const networkExists = networks.some(
      (network) => network.Name === networkName
    );
    if (!networkExists) {
      console.log(chalk.blue(`Creating network: `) + chalk.cyan(networkName));
      await docker.createNetwork({ Name: networkName });
    }
  } catch (error: any) {
    console.log(chalk.red("Failed to create network:"), error.message);
  }
};

export async function imageAvailable(imageName: string): Promise<boolean> {
  try {
    await docker.getImage(imageName).inspect();
    return true;
  } catch {
    return false;
  }
}

async function pullImage(imageName: string, spinner: Ora): Promise<void> {
  return new Promise((resolve, reject) => {
    docker.pull(imageName, (err: any, stream: any) => {
      if (err) {
        spinner.fail("Error pulling image");
        return reject(err);
      }
      docker.modem.followProgress(
        stream,
        (err: any, res: any) => (err ? reject(err) : resolve(res)),
        (event) => {
          spinner.text = `Pulling image... ${event.status}`;
        }
      );
    });
  });
}

interface RunDockerContType {
  containerName: string;
  network: string;
  restartPolicy: string;
  imageName: string;
  environmentVariables: EnvVars;
  // applicationPort: number | undefined,
  // boundPorts: PortBinding,
}

export const runDockerContainer = async ({
  containerName,
  network,
  restartPolicy,
  imageName,
  environmentVariables,
}: RunDockerContType): Promise<void> => {
  const spinner = ora("Starting Docker operations").start();

  try {
    const existingContainer = docker.getContainer(containerName);
    try {
      const containerInfo = await existingContainer.inspect();
      if (containerInfo.State.Running) {
        spinner.text = "Found existing container, stopping and removing...";
        await existingContainer.stop();
        await existingContainer.remove({ force: true });
        spinner.succeed("Existing container stopped and removed");
      } else {
        spinner.text = "Found existing container, removing...";
        await existingContainer.remove({ force: true });
        spinner.succeed("Existing container removed");
      }
    } catch (err: any) {
      if (err.statusCode === 404) {
        spinner.text = "No active container found. Proceeding with creation...";
      } else {
        throw err;
      }
    }

    spinner.text = `Checking for image ${imageName} locally...`;
    const imageExists = await imageAvailable(imageName);
    if (!imageExists) {
      spinner.text = `Image ${imageName} not found locally. Pulling from Docker Hub...`;
      await pullImage(imageName, spinner);
    }

    spinner.text = "Creating and starting the container";
    // const portBindings = Object.entries(boundPorts).reduce(
    //   (acc, [hostPort, containerPort]) => {
    //     acc[`${containerPort}/tcp`] = [{ HostPort: `${hostPort}` }];
    //     return acc;
    //   },
    //   {} as Record<string, Array<{ HostPort: string }>>
    // );

    const container = await docker.createContainer({
      Image: imageName,
      name: containerName,
      Env: Object.entries(environmentVariables).map(
        ([key, value]) => `${key}=${value}`
      ),
      NetworkingConfig: {
        EndpointsConfig: {
          [network]: {},
        },
      },
      HostConfig: {
        NetworkMode: network,
        // PortBindings: portBindings,
        RestartPolicy: { Name: restartPolicy },
      },
    });

    await container.start();
    // spinner.succeed(
    //   `Container ${containerName} is deployed and running on port ${applicationPort}.`
    // );
  } catch (error: any) {
    spinner.fail("Error running Docker container");
    console.log(chalk.red("Error:"), error.message);
  }
};

export const fetchLabs = async (): Promise<any[]> => {
  if (process.env.HLB_DEBUG === "true") {
    const filePath = "labs.json";
    const jsonData = fs.readFileSync(filePath, "utf8");
    return JSON.parse(jsonData);
  } else {
    const url =
      "https://raw.githubusercontent.com/Hacker-Lab-Pro/hackerlab-scripts/main/labs.json";
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (err: any) {
      console.log(chalk.red("Error fetching the data:"), err.message);
      return [];
    }
  }
};

export const listContainers = async (suffix: string): Promise<void> => {
  try {
    const containers = await docker.listContainers({ all: true });
    const hlbContainers = containers.filter((container: ContainerInfo) =>
      container.Names.some((name) => name.startsWith(suffix))
    );

    if (hlbContainers.length === 0) {
      console.log(chalk.yellow('No containers found starting with "hlb-"'));
      return;
    }

    console.log(chalk.green("Lab Environments:\n"));
    hlbContainers.forEach((container) => {
      console.log(
        chalk.blue(
          `Container Name: ${container.Names.join(", ").replace(/^\//, "")}`
        )
      );
      console.log(chalk.cyan(`Image: ${container.Image}`));
      console.log(chalk.cyan(`Status: ${container.Status}`));
      console.log(chalk.cyan(`State: ${container.State}`));
      console.log(
        chalk.gray(`\n--------------------------------------------------`)
      );
    });
  } catch (error: any) {
    console.log(chalk.red(`Error fetching containers: ${error.message}`));
  }
};

export async function createLab(details: LabDetailsType) {
  await ensureNetworkExists(details.network);
  await runDockerContainer({
    containerName: details.name,
    network: details.network,
    restartPolicy: details.restartPolicy,
    imageName: details.imageName,
    environmentVariables: details.environmentVariables,
  });
  rl.close();
}
