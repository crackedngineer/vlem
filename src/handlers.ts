import chalk from "chalk";

import { createLab } from "./utils";
import { AddOptionsType } from "./types";
import { checkDockerInstalled, fetchLabs, listContainers } from "./utils";

export const addHandler = async (labName: string, options: AddOptionsType) => {
  try {
    const labs = await fetchLabs();
    const labObj = labs.find((item) => item.slug === labName);

    if (!labObj) {
      throw new Error(`Cannot find a lab environment named "${labName}"`);
    }

    await checkDockerInstalled();

    // Prepare labConfig using CLI options or fallbacks
    const labDetails = {
      name: `hlb-${options.name || labName}`,
      restartPolicy: options.restart,
      // portBinding: options.port,
      // applicationPort: labObj.default.application_port,
      imageName: labObj.image,
      network: "hlb-network",
      environmentVariables: labObj.default.environment_variables,
    };

    await createLab(labDetails);
  } catch (error: any) {
    console.error(chalk.redBright("Error:"), error.message);
    process.exit(1);
  }
};

export const listHandler = async () => {
  await listContainers("/hlb-");
  process.exit(0);
};
