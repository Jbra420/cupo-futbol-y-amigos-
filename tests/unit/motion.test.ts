import { describe, expect, it } from "vitest";
import { shirtNumber } from "@/lib/motion";

describe("shirtNumber", () => {
  it("da un dorsal estable entre 1 y 99", () => {
    for (let index = 0; index < 500; index++) {
      const id = `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
      const number = shirtNumber(id);
      expect(number).toBeGreaterThanOrEqual(1);
      expect(number).toBeLessThanOrEqual(99);
      expect(shirtNumber(id)).toBe(number);
    }
  });
});
