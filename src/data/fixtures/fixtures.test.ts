import { describe, expect, test } from "bun:test";
import type { StatusPayload, Component, Incident } from "../../types";
import { componentUptime } from "../../uptime";
import outage from "./outage.json";

describe("fixtures", () => {
    test("counts if it has one incident", () => {
        expect(outage.active_incidents.length).toBe(1)
    });

    test("componentUptime is lower than 100%", () => {
        // component est le service en panne
        let component = outage.groups[0]?.components[0]
        const up = componentUptime(component!, outage.active_incidents, new Date(outage.generated_at))
        expect(up?.pct).toBeLessThan(100)
    });
});