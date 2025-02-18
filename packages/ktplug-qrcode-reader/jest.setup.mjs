import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { jest } from "@jest/globals";

global.__filename = fileURLToPath(import.meta.url);
global.__dirname = dirname(global.__filename);

jest.useFakeTimers();
