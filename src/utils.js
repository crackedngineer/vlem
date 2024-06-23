import fs from "fs";
import readline from "readline";

import ora from "ora";
import chalk from "chalk";
import Docker from "dockerode";
const docker = new Docker();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const clearConsole = () => {
    console.clear();
};

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
        console.error(chalk.red("Failed to create network:"), error);
    }
};

const runDockerContainer = async (
    containerName,
    platform,
    network,
    restartPolicy,
    hostPort,
    containerPort,
    imageName
) => {
    const spinner = ora("Starting Docker operations").start();

    try {
        // Remove existing container if it exists
        let existingContainer = await docker.getContainer(containerName);
        try {
            await existingContainer.inspect(); // Check if container actually exists
            spinner.text = "Found existing container, stopping and removing...";
            await existingContainer.stop();
            await existingContainer.remove({ force: true });
            spinner.succeed("Existing container removed");
        } catch (err) {
            // This error means the container does not exist, so no removal needed
            spinner.text = "No active container found. Proceeding with creation...";
        }

        spinner.text = "Creating and starting the container";
        // Create and start the container
        const container = await docker.createContainer({
            Image: imageName,
            name: containerName,
            Platform: platform,
            NetworkingConfig: {
                EndpointsConfig: {
                    [network]: {},
                },
            },
            HostConfig: {
                NetworkMode: network,
                PortBindings: {
                    [`${containerPort}/tcp`]: [{ HostPort: `${hostPort}` }],
                },
                RestartPolicy: { Name: restartPolicy },
            },
        });
        await container.start();
        spinner.succeed(
            `Container ${containerName} is deployed and running on port ${hostPort}.`
        );
    } catch (error) {
        spinner.fail("Error running Docker container");
        console.error(chalk.red("Error:"), error);
    }
};

const fetchLabs = async (slug) => {
    const filePath = "labs.json";
    try {
        const data = fs.readFileSync(filePath, "utf8");
        const labs = JSON.parse(data);
        return labs
    } catch (err) {
        console.error("Error reading or parsing the file:", err);
    }
};

const listContainers = async (suffix) => {
    try {
        const containers = await docker.listContainers({ all: true });
        const hlbContainers = containers.filter(container => container.Names.some(name => name.startsWith(suffix)));

        if (hlbContainers.length === 0) {
            console.log(chalk.yellow('No containers found starting with "hlb-"'));
            return;
        }

        console.log(chalk.green('Lab Environments:\n'));
        hlbContainers.forEach(container => {
            console.log(chalk.blue(`Container Name: ${container.Names.join(', ').replace(/^\//, '')}`)); // Removes leading slash
            // console.log(chalk.magenta(`Container ID: ${container.Id}`));
            console.log(chalk.cyan(`Image: ${container.Image}`));
            console.log(chalk.cyan(`Status: ${container.Status}`));
            console.log(chalk.cyan(`State: ${container.State}`)); // Running, Paused, etc.
            console.log(chalk.gray(`\n--------------------------------------------------`));
        });
    } catch (error) {
        console.error(chalk.red(`Error fetching containers: ${error.message}`));
    }
};

export {
    rl,
    clearConsole,
    checkDockerInstalled,
    ensureNetworkExists,
    runDockerContainer,
    fetchLabs,
    listContainers,
};
