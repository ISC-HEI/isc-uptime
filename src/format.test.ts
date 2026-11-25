import { describe, expect, test } from "bun:test";
import { visualState } from "./format";

describe("visualState", () => {
  test("reads 'operational' as ok", () => {
    expect(visualState("operational")).toBe("ok");
  });

  test("reads 'up' as ok", () => {
    expect(visualState("up")).toBe("ok");
  });

  test("reads 'ok' as ok", () => {
    expect(visualState("ok")).toBe("ok");
  });

  test("reads 'degraded' as degraded", () => {
    expect(visualState("degraded")).toBe("degraded");
  });

  test("reads 'partial_outage' as degraded", () => {
    expect(visualState("partial_outage")).toBe("degraded");
  });

  test("reads 'major_outage' as outage", () => {
    expect(visualState("major_outage")).toBe("outage");
  });

  test("reads 'down' as outage", () => {
    expect(visualState("down")).toBe("outage");
  });

  test("reads 'maintenance' as maintenance", () => {
    expect(visualState("maintenance")).toBe("maintenance");
  });

  test("reads 'no_data' as nodata", () => {
    expect(visualState("no_data")).toBe("nodata");
  });

  test("reads 'OPERATIONAL' as ok", () => {
    expect(visualState("OPERATIONAL")).toBe("ok");
  });

  test("reads an unknown word as nodata", () => {
    expect(visualState("banana")).toBe("nodata");
  });
});