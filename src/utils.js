import fs from 'fs';
import readline from "readline";

import inquirer from 'inquirer';
import chalk from 'chalk';
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
    imageName,
) => {
    try {
        // Remove existing cont dainer if it exists
        let existingContainer = await docker.getContainer(containerName);
        try {
            await existingContainer.inspect(); // Check if container actually exists
            console.log(chalk.yellow(`\nFound existing container ${containerName}, stopping and removing...`));
            await existingContainer.stop();
            await existingContainer.remove({ force: true });
        } catch (err) {
            // This error means the container does not exist, so no removal needed
            console.log(chalk.yellow(`\nNo active container named ${containerName} found. Proceeding with creation...`));
        }

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
        console.log(chalk.green(`Container ${containerName} is deployed and running on port ${hostPort}. \n`));
    } catch (error) {
        console.error(chalk.red("Error running Docker container:"), error);
    }
};

const fetchLab = async (slug) => {
    const filePath = "labs.json";
    try {
        const data = fs.readFileSync(filePath, "utf8");
        const labs = JSON.parse(data);
        return labs.find(item => item.slug === slug)
    } catch (err) {
        console.error("Error reading or parsing the file:", err);
    }
};

export {
    rl,
    clearConsole,
    checkDockerInstalled,
    ensureNetworkExists,
    runDockerContainer,
    fetchLab,
};
