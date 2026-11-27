import { describe, expect, test } from "bun:test";
import { duration, snapshotStamp, span, visualState } from "./format";

const NOW = "2026-11-26T18:02:00+01:00";

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

  test("reads 'partial_outage' as outage", () => {
    expect(visualState("partial_outage")).toBe("outage");
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

describe("span", () => {
  test("span format on the same day under 1 hour", () => {
    expect(span(NOW, "2026-11-26T18:04:00+01:00")).toBe("18:02 → 18:04 (2 min)")
  });

  test("span include dates when it's not the same day", () => {
    expect(span(NOW, "2026-11-27T00:01:00+01:00")).toBe("26 novembre à 18:02 → 27 novembre à 00:01 (5 h 59)")
  });

  test("span format on the same day over 1 hour", () => {
    expect(span(NOW, "2026-11-26T19:04:00+01:00")).toBe("18:02 → 19:04 (1 h 02)")
  });

  test("span format without ending time", () => {
    expect(span(NOW, null)).toBe("depuis 18:02")
  });
});

describe("duration", () => {
  test("duration format under 1 hour", () => {
    expect(duration(NOW, "2026-11-26T18:04:00+01:00")).toBe("2 min")
  });

  test("duration format over 1 hour", () => {
    expect(duration(NOW, "2026-11-26T19:04:00+01:00")).toBe("1 h 02")
  });

  test("duration format under 48 hour", () => {
    expect(duration(NOW, "2026-11-28T18:00:00+01:00")).toBe("47 h 58")
  });

  test("duration format over 48 hour", () => {
    expect(duration(NOW, "2026-11-28T18:04:00+01:00")).toBe("2 j 00 h")
  });
});

describe("snapshotStamp", () => {
  test("the snapshot is on the day we are now", () => {
    expect(snapshotStamp("2026-11-26T19:04:00+01:00", new Date(NOW))).toBe("à 19:04")
  });

  test("the snapshot is not today", () => {
    expect(snapshotStamp("2026-11-25T19:04:00+01:00", new Date(NOW))).toBe("le 25 nov. à 19:04")
  });
});