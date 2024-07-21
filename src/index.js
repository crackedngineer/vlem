#!/usr/bin/env node
import config from "../package.json" assert { type: "json" };

import chalk from "chalk";
import inquirer from "inquirer";
import { program } from "commander";

import {
  rl,
  clearConsole,
  bindPorts,
  checkDockerInstalled,
  ensureNetworkExists,
  runDockerContainer,
  fetchLabs,
  listContainers
} from "./utils.js";

// Print the header
function printHeader(githubLink) {
  const title = `HackerLab (${config.version})`;
  const terminalWidth = process.stdout.columns;
  const padLength = (terminalWidth - title.length) / 2;
  console.log(chalk.blue("*" + "-".repeat(terminalWidth - 2) + "*"));
  console.log(
    `${chalk.blue("*")}${chalk.yellow(
      " ".repeat(Math.floor(padLength - 1)) +
        title +
        " ".repeat(Math.ceil(padLength - 1))
    )}${chalk.blue("*")}`
  );
  console.log(chalk.blue("*" + "-".repeat(terminalWidth - 2) + "*"));
  console.log(
    chalk.blue("*") +
      chalk.white.bgMagenta(" GitHub: ") +
      chalk.black.bgWhite(` ${githubLink} `) +
      chalk.blue("*")
  );
  console.log(chalk.blue("*" + "-".repeat(terminalWidth - 2) + "*"));
}

// Print lab info
function printLabInfo(labObj) {
  const terminalWidth = process.stdout.columns;
  console.log(chalk.greenBright("=".repeat(terminalWidth)));
  console.log(
    chalk.greenBright("Lab: ") +
      chalk.white.green(
        ` ${labObj.name} `.padEnd(terminalWidth - "Lab: ".length - 1, " ")
      )
  );
  const words = labObj.description.split(" ");
  let line = chalk.cyanBright("Description: ");
  words.forEach((word) => {
    if (line.length + word.length + 1 > terminalWidth) {
      console.log(line);
      line = " ".repeat("Description: ".length);
    }
    line += word + " ";
  });
  if (line.trim().length > 0) {
    console.log(line);
  }
  console.log(chalk.greenBright("=".repeat(terminalWidth)) + "\n");
}

// Ask questions and configure container
async function configureContainer(labObj) {
  const questions = [
    {
      type: "input",
      name: "containerName",
      message: "Enter container name",
      default: labObj.default.container_name, // Default value from labObj
    },
    {
      type: "input",
      name: "imageName",
      message: "Enter image name",
      default: labObj.image, // Default value from labObj
    },
    {
      type: "list", // Using 'list' for selection
      name: "restartPolicy",
      message: chalk.greenBright(
        "Choose a restart policy for the Docker container"
      ),
      choices: ["no", "always", "unless-stopped", "on-failure"], // Options for restart policy
      filter: (val) => val.toLowerCase(), // Ensuring the value is in lower case
    },
  ];

  const answers = await inquirer.prompt(questions);

  // Configure Port bindings
  const { portBinding, applicationPort } = await bindPorts(labObj);

  return {
    containerName: answers.containerName,
    imageName: answers.imageName,
    restartPolicy: answers.restartPolicy,
    portBinding: portBinding,
    applicationPort: applicationPort,
  };
}

// Initialize and run the Docker container
async function initializeLab(labConfig, labObj) {
  await ensureNetworkExists(labObj.default.network);
  await runDockerContainer(
    labConfig.containerName.startsWith("hlb-")
      ? labConfig.containerName
      : `hlb-${labConfig.containerName}`,
    labObj.default.network,
    labConfig.restartPolicy,
    labConfig.portBinding,
    labConfig.imageName,
    labConfig.applicationPort,
    labObj.default.environment_variables
  );
}

// Main function
program
  .name("hlb")
  .description(
    "CLI tool for for setting up the Local Penetration testing Environment"
  )
  .version(config.version);

program
  .command("add")
  .description("Add the lab environment")
  .argument("<labName>", "Name of the lab to fetch and manage")
  .action(async (labName) => {
    try {
      const labs = await fetchLabs();
      const labObj = labs.find((item) => item.slug === labName);
      if (!labObj) {
        throw new Error(`Cannot find a lab environment named ${labName}`);
      }
      const githubLink = "https://github.com/yourusername/bwapp-container";

      clearConsole();
      printHeader(githubLink);
      printLabInfo(labObj);

      // Confirm if the user wants to proceed
      const answer = await inquirer.prompt([
        {
          type: "confirm",
          name: "proceed",
          message: "Do you want to proceed with setting up this lab?",
          default: false,
        },
      ]);

      if (!answer.proceed) {
        console.log(chalk.yellow("Setup canceled by user."));
        return;
      }

      await checkDockerInstalled();

      const labConfig = await configureContainer(labObj);
      await initializeLab(labConfig, labObj);

      rl.close();
    } catch (error) {
      console.error(chalk.redBright(error.message));
      process.exit(0);
    }
  });

program.command("labs").action(async () => {
  await listContainers("/hlb-");
  process.exit(0);
});

program.parse(process.argv);
