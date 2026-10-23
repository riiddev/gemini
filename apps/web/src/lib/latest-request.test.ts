import { describe, expect, it } from "vitest";
import { createLatestRequestGate } from "./latest-request";

describe("latest request gate", () => {
  it("rejects older requests after a newer request begins", () => {
    const gate = createLatestRequestGate();
    const older = gate.begin();
    const newer = gate.begin();

    expect(gate.isCurrent(older)).toBe(false);
    expect(gate.isCurrent(newer)).toBe(true);
  });

  it("invalidates an in-flight request when its owner unmounts", () => {
    const gate = createLatestRequestGate();
    const request = gate.begin();

    gate.invalidate();

    expect(gate.isCurrent(request)).toBe(false);
  });
});
