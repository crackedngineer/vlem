#!/usr/bin/env node
import chalk from "chalk";
// import inquirer from "inquirer";
import { program } from "commander";

import { AddOptionsType } from "./types";
import { addHandler, listHandler } from "./handlers";

program
  .name("hackerlab")
  .description(
    "CLI tool for setting up a Local Penetration Testing Environment"
  )
  .version();

program
  .command("add")
  .description("Add the lab environment")
  .argument("<labName>", "Name of the lab to fetch and manage")
  .option("-n, --name <name>", "Name of the Docker container")
  .option("-p, --port <port>", "Host port to bind the application", parseInt)
  .option(
    "-r, --restart <policy>",
    "Restart policy (e.g. always, unless-stopped, no)",
    "no"
  )
  .action(async (labName: string, options: AddOptionsType) => {
    await addHandler(labName, options);
  });

program
  .command("list")
  .description("List all running HackerLab containers")
  .action(async () => {
    await listHandler();
  });

// Run CLI
program.parseAsync(process.argv).catch((err) => {
  console.error(chalk.red("Unexpected error:"), err);
  process.exit(1);
});
