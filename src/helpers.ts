import net from "net";
import { Port } from "./types";
import { PORT_TYPE } from "./constants";

const checkPortAvailability = (port: number): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const server = net
      .createServer()
      .once("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          resolve(false); // Port is in use
        } else {
          reject(err);
        }
      })
      .once("listening", () => {
        server.close(() => resolve(true)); // Port is available
      })
      .listen(port);
  });
};

// Function to determine and assign the external port
export async function determineExternalPort(
  port: Port,
  defaultPort: number
): Promise<number> {
  let externalPort =
    port.type === PORT_TYPE.APPLICATION ? defaultPort : port.internal;
  while (!(await checkPortAvailability(externalPort))) {
    externalPort++;
  }
  return externalPort;
}
