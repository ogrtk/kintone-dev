import { customMatchers } from "@ogrtk/shared-components";
import * as matchers from "@testing-library/jest-dom/matchers";
import { expect } from "vitest";
import "@ogrtk/shared-components/vitest";

// `jest-dom` のマッチャーと独自マッチャーを登録
expect.extend(matchers);
expect.extend(customMatchers);
