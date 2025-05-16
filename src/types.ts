export interface Port {
  type: string;
  internal: number;
}

export interface LabObject {
  default: {
    ports: Port[];
  };
}

export interface PortBinding {
  [externalPort: number]: number;
}

export type EnvVars = Record<string, boolean | string | number>;

export interface LabDetailsType {
  name: string;
  restartPolicy: string;
  //   portBinding: string[];
  imageName: string;
  network: string;
  environmentVariables: EnvVars;
}

export interface AddOptionsType {
  name: string;
  port: number;
  restart: string;
}
