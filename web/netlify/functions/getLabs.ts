import { Handler, HandlerEvent } from "@netlify/functions";
import fs from "fs";
import path from "path";

interface LabInterace {
    id: number;
    title: string;
    name: string;
    description: string;
    overview: string;
    logo: string;
    tags: Array<string>;
    author: JSON;
    image: string;
    created_at: string;
    config: JSON;
}

const handler: Handler = async (event: HandlerEvent) => {
    const filePath = path.resolve("data/models_list.json");
    const rawData = fs.readFileSync(filePath, "utf-8");
    const labsData: Record<string, Omit<LabInterace, "name">> = JSON.parse(
        rawData
    );
    return {
        statusCode: 200,
        body: JSON.stringify(labsData),
    };
};

export { handler };
