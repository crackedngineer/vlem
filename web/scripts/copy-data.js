import { existsSync, mkdirSync, copyFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define paths
const sourceFile = join(__dirname, '../../data/labs.json');
const targetFile = join(__dirname, '../labs.json');

// Create function to copy file
function copyDataFile() {
    try {
        // Check if source file exists
        if (!existsSync(sourceFile)) {
            console.warn(`Warning: Source file ${sourceFile} does not exist`);
            console.log('Creating empty labs.json file');

            // Create an empty JSON file
            const emptyJson = JSON.stringify({}, null, 2);

            // Ensure target directory exists
            const targetDir = dirname(targetFile);
            if (!existsSync(targetDir)) {
                mkdirSync(targetDir, { recursive: true });
            }

            // Write empty JSON file
            writeFileSync(targetFile, emptyJson);
            console.log(`Created empty file at ${targetFile}`);
            return;
        }

        // Ensure target directory exists
        const targetDir = dirname(targetFile);
        if (!existsSync(targetDir)) {
            mkdirSync(targetDir, { recursive: true });
        }

        // Copy the file
        copyFileSync(sourceFile, targetFile);
        console.log(`Successfully copied ${sourceFile} to ${targetFile}`);
    } catch (error) {
        console.error(`Error copying data file: ${error.message}`);
        process.exit(1);
    }
}

// Execute the function
copyDataFile();