import {
    type Handler,
    type HandlerEvent,
    type HandlerResponse,
} from "@netlify/functions";
import fs from "fs/promises"; // Use promises for async file reading
import path from "path";

interface Author {
    name: string;
    // Add other author properties if needed
}

interface Config {
    // Define the structure of your config object
    [key: string]: any; // Example: allows any key-value pair
}

interface LabInterface {
    id: number;
    title: string;
    name: string;
    description: string;
    overview: string;
    logo: string;
    tags: string[];
    author: Author; // Use the Author interface
    image: string;
    created_at: string;
    config: Config; // Use the Config interface
}

const handler: Handler = async (
    event: HandlerEvent
): Promise<HandlerResponse> => {
    try {
        const filePath = path.resolve("data/labs.json");
        const rawData = await fs.readFile(filePath, "utf-8");
        const allLabs: LabInterface[] = JSON.parse(rawData);

        const {
            name: filterName,
            fetch: shouldFetch,
            ...otherFilters
        } = event.queryStringParameters || {};

        let filteredLabs = [...allLabs];

        // Filter by name (case-insensitive)
        if (filterName) {
            filteredLabs = filteredLabs.filter((lab) =>
                lab.name.toLowerCase().includes(filterName.toLowerCase())
            );
        }

        // Apply other filters
        for (const key in otherFilters) {
            const filterValue = otherFilters[key]?.toLowerCase();
            if (filterValue) {
                filteredLabs = filteredLabs.filter((lab) => {
                    const labValue = (lab as any)[key]; // Be flexible with property access
                    if (Array.isArray(labValue)) {
                        return labValue.some((item) =>
                            String(item).toLowerCase().includes(filterValue)
                        );
                    } else if (typeof labValue === "string") {
                        return labValue.toLowerCase().includes(filterValue);
                    } else if (
                        typeof labValue === "number" ||
                        typeof labValue === "boolean"
                    ) {
                        return String(labValue).toLowerCase() === filterValue;
                    } else if (
                        typeof labValue === "object" &&
                        labValue !== null
                    ) {
                        // Basic check for properties within the object
                        return Object.values(labValue).some(
                            (val) =>
                                typeof val === "string" &&
                                val.toLowerCase().includes(filterValue)
                        );
                    }
                    return false;
                });
            }
        }

        let responseBody;
        if (
            shouldFetch?.toLowerCase() === "single" &&
            filteredLabs.length > 0
        ) {
            responseBody = JSON.stringify(filteredLabs[0]);
        } else {
            responseBody = JSON.stringify(filteredLabs);
        }

        return {
            statusCode: 200,
            body: responseBody,
            headers: {
                "Content-Type": "application/json",
            },
        };
    } catch (error: any) {
        console.error("Error reading or processing data:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Failed to fetch or process lab data",
            }),
            headers: {
                "Content-Type": "application/json",
            },
        };
    }
};

export { handler };
