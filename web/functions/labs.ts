import labs from "./labs.json";

interface Author {
  name: string;
}

interface Config {
  [key: string]: unknown;
}

interface LabInterface {
  id: number;
  title: string;
  name: string;
  description: string;
  overview: string;
  logo: string | null;
  tags: string[];
  author: string | null;
  image: string;
  created_at: string;
  difficulty?: number;
  config: Config;
}

export async function onRequest(context: { request: Request }): Promise<Response> {
  try {
    const { request } = context;
    const url = new URL(request.url);
    const params = url.searchParams;

    const filterName = params.get("name");
    const shouldFetch = params.get("fetch");

    const otherFilters: Record<string, string> = {};
    params.forEach((value, key) => {
      if (key !== "name" && key !== "fetch") {
        otherFilters[key] = value;
      }
    });

    let filteredLabs: LabInterface[] = [...labs];

    if (filterName) {
      filteredLabs = filteredLabs.filter((lab) =>
        lab.name.toLowerCase().includes(filterName.toLowerCase())
      );
    }

    for (const key in otherFilters) {
      const filterValue = otherFilters[key].toLowerCase();
      filteredLabs = filteredLabs.filter((lab) => {
        const labValue = lab.name;
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
        } else if (typeof labValue === "object" && labValue !== null) {
          return Object.values(labValue).some(
            (val) =>
              typeof val === "string" &&
              val.toLowerCase().includes(filterValue)
          );
        }
        return false;
      });
    }

    const responseBody =
      shouldFetch?.toLowerCase() === "single" && filteredLabs.length > 0
        ? JSON.stringify(filteredLabs[0])
        : JSON.stringify(filteredLabs);

    return new Response(responseBody, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process lab data" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
