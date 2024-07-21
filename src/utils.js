import fs from "fs";
import path from "path";

import net from "net";
import readline from "readline";

import ora from "ora";
import chalk from "chalk";
import Docker from "dockerode";
import axios from "axios";

// Constants
import { CONSTANTS } from "./constants.js";

const docker = new Docker();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const clearConsole = () => {
  console.clear();
};

const checkPortAvailability = (port) => {
  return new Promise((resolve, reject) => {
    const server = net
      .createServer()
      .once("error", (err) => {
        if (err.code === "EADDRINUSE") {
          resolve(false); // Port is in use
        } else {
          reject(err); // Other errors
        }
      })
      .once("listening", () => {
        server.close(() => resolve(true)); // Port is available
      })
      .listen(port);
  });
};

// Function to determine and assign the external port
async function determineExternalPort(port, defaultPort) {
  let externalPort =
    port.type === CONSTANTS.PORT_TYPE.APPLICATION ? defaultPort : port.internal;
  while (!(await checkPortAvailability(externalPort))) {
    externalPort++;
  }
  return externalPort;
}

// Function to bind ports
async function bindPorts(labObj) {
  const portBinding = {};
  const defaultPort = CONSTANTS.DEFAULT_PORT;
  let applicationPort;

  for (const port of labObj.default.ports) {
    const externalPort = await determineExternalPort(port, defaultPort);
    portBinding[externalPort] = port.internal;

    if (!applicationPort && port.type === CONSTANTS.PORT_TYPE.APPLICATION) {
      applicationPort = externalPort;
    }
  }

  return { portBinding, applicationPort };
}

const checkDockerInstalled = async () => {
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

const ensureNetworkExists = async (networkName) => {
  try {
    const networks = await docker.listNetworks();
    const networkExists = networks.some(
      (network) => network.Name === networkName
    );
    if (!networkExists) {
      console.log(chalk.blue(`Creating network: `) + chalk.cyan(networkName));
      await docker.createNetwork({ Name: networkName });
    }
  } catch (error) {
    console.log(chalk.red("Failed to create network:"), error.message);
  }
};

async function imageAvailable(imageName) {
  try {
    await docker.getImage(imageName).inspect();
    return true;
  } catch (error) {
    return false;
  }
}

async function pullImage(imageName, spinner) {
  return new Promise((resolve, reject) => {
    docker.pull(imageName, (err, stream) => {
      if (err) {
        spinner.fail("Error pulling image");
        return reject(err);
      }
      docker.modem.followProgress(
        stream,
        (err, res) => (err ? reject(err) : resolve(res)),
        (event) => {
          spinner.text = `Pulling image... ${event.status}`;
        }
      );
    });
  });
}

const runDockerContainer = async (
  containerName,
  network,
  restartPolicy,
  boundPorts,
  imageName,
  applicationPort,
  environmentVariables
) => {
  const spinner = ora("Starting Docker operations").start();

  try {
    // Remove existing container if it exists
    const existingContainer = docker.getContainer(containerName);
    try {
      const containerInfo = await existingContainer.inspect(); // Check if container actually exists
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
    } catch (err) {
      if (err.statusCode === 404) {
        // This error means the container does not exist, so no removal needed
        spinner.text = "No active container found. Proceeding with creation...";
      } else {
        throw err;
      }
    }

    // Check if image is available locally, otherwise pull it
    spinner.text = `Checking for image ${imageName} locally...`;
    const imageExists = await imageAvailable(imageName);
    if (!imageExists) {
      spinner.text = `Image ${imageName} not found locally. Pulling from Docker Hub...`;
      await pullImage(imageName, spinner);
    }

    // Create and start the container
    spinner.text = "Creating and starting the container";
    const portBindings = Object.entries(boundPorts).reduce(
      (acc, [hostPort, containerPort]) => {
        acc[`${containerPort}/tcp`] = [{ HostPort: `${hostPort}` }];
        return acc;
      },
      {}
    );

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
        PortBindings: portBindings,
        RestartPolicy: { Name: restartPolicy },
      },
    });
    await container.start();
    spinner.succeed(
      `Container ${containerName} is deployed and running on port ${applicationPort}.`
    );
  } catch (error) {
    spinner.fail("Error running Docker container");
    console.log(chalk.red("Error:"), error.message);
  }
};

const fetchLabs = async () => {
  if (process.env.HLB_DEBUG === "true") {
    const filePath = "labs.json";
    const jsonData = fs.readFileSync(filePath, "utf8");

    const data = JSON.parse(jsonData);
    return data;
  } else {
    const url =
      "https://raw.githubusercontent.com/Hacker-Lab-Pro/hackerlab-scripts/main/labs.json";
    try {
      const response = await axios.get(url);
      const labs = response.data;
      return labs;
    } catch (err) {
      console.log(chalk.red("Error fetching the data:"), err.message);
      return [];
    }
  }
};

const listContainers = async (suffix) => {
  try {
    const containers = await docker.listContainers({ all: true });
    const hlbContainers = containers.filter((container) =>
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
      ); // Removes leading slash
      // console.log(chalk.magenta(`Container ID: ${container.Id}`));
      console.log(chalk.cyan(`Image: ${container.Image}`));
      console.log(chalk.cyan(`Status: ${container.Status}`));
      console.log(chalk.cyan(`State: ${container.State}`)); // Running, Paused, etc.
      console.log(
        chalk.gray(`\n--------------------------------------------------`)
      );
    });
  } catch (error) {
    console.log(chalk.red(`Error fetching containers: ${error.message}`));
  }
};

export {
  rl,
  clearConsole,
  bindPorts,
  checkDockerInstalled,
  ensureNetworkExists,
  runDockerContainer,
  fetchLabs,
  listContainers
};
