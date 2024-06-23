import config from '../package.json' assert { type: 'json' };

import chalk from 'chalk';
import inquirer from 'inquirer';
import { program } from 'commander';

import {
  rl,
  clearConsole,
  checkDockerInstalled,
  ensureNetworkExists,
  runDockerContainer,
  fetchLab,
} from "./utils.js"

// Print the header
function printHeader(githubLink) {
  const title = `HackerLab (${config.version})`;
  const terminalWidth = process.stdout.columns;
  const padLength = (terminalWidth - title.length) / 2;
  console.log(chalk.blue("*" + "-".repeat(terminalWidth - 2) + "*"));
  console.log(
    `${chalk.blue("*")}${chalk.yellow(
      " ".repeat(Math.floor(padLength - 1)) + title + " ".repeat(Math.ceil(padLength - 1))
    )}${chalk.blue("*")}`
  );
  console.log(chalk.blue("*" + "-".repeat(terminalWidth - 2) + "*"));
  console.log(
    chalk.blue("*") +
    chalk.white.bgMagenta(" GitHub: ") + chalk.black.bgWhite(` ${githubLink} `) +
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
    chalk.white.green(` ${labObj.name} `.padEnd(terminalWidth - "Lab: ".length - 1, " "))
  );
  const words = labObj.description.split(' ');
  let line = chalk.cyanBright("Description: ");
  words.forEach(word => {
    if (line.length + word.length + 1 > terminalWidth) {
      console.log(line);
      line = " ".repeat("Description: ".length);
    }
    line += word + ' ';
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
      type: 'input',
      name: 'containerName',
      message: "Enter container name",
      default: labObj.default.container_name, // Default value from labObj
    },
    {
      type: 'input',
      name: 'imageName',
      message: "Enter image name",
      default: labObj.image // Default value from labObj

    },
    {
      type: 'input',
      name: 'platform',
      message: "Enter platform",
      default: labObj.default.default_platform // Default value from labObj
    },
    {
      type: 'input',
      name: 'hostPort',
      message: "Enter host port",
      default: labObj.default.port // Default value from labObj
    },
    {
      type: 'list', // Using 'list' for selection
      name: 'restartPolicy',
      message: chalk.greenBright("Choose a restart policy for the Docker container"),
      choices: ['no', 'always', 'unless-stopped', 'on-failure'], // Options for restart policy
      filter: (val) => val.toLowerCase() // Ensuring the value is in lower case
    }
  ];

  const answers = await inquirer.prompt(questions);
  console.log("")
  
  return {
    containerName: answers.containerName,
    imageName: answers.imageName,
    platform: answers.platform,
    hostPort: answers.hostPort,
    restartPolicy: answers.restartPolicy
  };
}

// Initialize and run the Docker container
async function initializeLab(labConfig, labObj) {
  await ensureNetworkExists(labObj.default.network);
  await runDockerContainer(
    labConfig.containerName,
    labConfig.platform,
    labObj.default.network,
    labConfig.restartPolicy,
    labConfig.hostPort,
    labObj.default.container_port,
    labConfig.imageName
  );
}

// Main function
program
  .name('hlb-cli')
  .description('CLI tool for for setting up the Local Penetration testing Environment')
  .version(config.version);

program.command("add")
  .description("Add the lab environment")
  .argument('<labName>', 'Name of the lab to fetch and manage')
  .action(async (labName) => {
    try {
      const labObj = await fetchLab(labName);
      const githubLink = "https://github.com/yourusername/bwapp-container";

      clearConsole();
      printHeader(githubLink);
      printLabInfo(labObj);

      await checkDockerInstalled();

      const labConfig = await configureContainer(labObj);
      await initializeLab(labConfig, labObj);

      rl.close();
    } catch (error) {
      console.error(error.toString());
    }
  });

program.parse(process.argv);
