import { describe, expect, it } from "vitest";
import { inkOn, luminance } from "@/lib/color";

describe("inkOn", () => {
  it("usa tinta oscura en camisetas claras y blanca en oscuras", () => {
    expect(inkOn("#ffffff")).toBe("#14291d");
    expect(inkOn("#FACC15")).toBe("#14291d");
    expect(inkOn("#16A34A")).toBe("#ffffff");
    expect(inkOn("#2563eb")).toBe("#ffffff");
    expect(inkOn("#000")).toBe("#ffffff");
  });
  it("ignora valores que no son hex", () => {
    expect(luminance("var(--primary)")).toBeNull();
    expect(inkOn("red")).toBe("#ffffff");
  });
});
