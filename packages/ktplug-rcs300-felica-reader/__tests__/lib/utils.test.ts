import { hexToAscii } from "@/src/lib/utils";
import { describe, expect, it } from "vitest";

describe("hexToAscii", () => {
  it("should convert a simple hex string to ASCII", () => {
    expect(hexToAscii("48656c6c6f")).toBe("Hello");
  });

  it("should handle hex strings with spaces", () => {
    expect(hexToAscii("48 65 6C 6C 6F")).toBe("Hello");
  });

  it("should convert numbers in hex to ASCII characters", () => {
    expect(hexToAscii("31323334")).toBe("1234");
  });

  it("should handle special characters", () => {
    expect(hexToAscii("21222324")).toBe('!"#$');
  });

  it("should return an empty string for an empty input", () => {
    expect(hexToAscii("")).toBe("");
  });

  it("should handle mixed-case hex input", () => {
    expect(hexToAscii("48 65 6C 6C 6F")).toBe(hexToAscii("48 65 6c 6C 6f"));
  });

  it("should throw an error for invalid hex characters", () => {
    expect(() => hexToAscii("ZZZ123")).toThrow(`Invalid hex pair: ${"ZZ"}`);
  });

  it("should throw an error for odd-length hex strings", () => {
    expect(() => hexToAscii("123")).toThrow(
      "Invalid hex string: length must be even.",
    );
  });
});
