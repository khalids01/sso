import { describe, expect, it } from "bun:test";
import {
  buildRevocationEventPayload,
  classifyDeliveryStatus,
  isPrivateOrReservedAddress,
  retryDelayMs,
  validateRevocationWebhookUrl,
  type ClaimedDelivery,
} from "../src/modules/application-revocation/revocation.service";

describe("application revocation delivery primitives", () => {
  it("accepts deployed HTTPS destinations and rejects unsafe URL shapes", () => {
    expect(validateRevocationWebhookUrl("https://app.example.com/revocations")).toBe(
      "https://app.example.com/revocations",
    );
    expect(() => validateRevocationWebhookUrl("http://app.example.com/hook")).toThrow();
    expect(() => validateRevocationWebhookUrl("https://user:pass@app.example.com/hook")).toThrow();
    expect(() => validateRevocationWebhookUrl("https://app.example.com/hook#secret")).toThrow();
  });

  it("permits loopback HTTP only through the explicit local option", () => {
    expect(() => validateRevocationWebhookUrl("http://127.0.0.1:5010/revocations")).toThrow();
    expect(
      validateRevocationWebhookUrl("http://127.0.0.1:5010/revocations", {
        allowLocal: true,
      }),
    ).toBe("http://127.0.0.1:5010/revocations");
    expect(() =>
      validateRevocationWebhookUrl("http://public.example.com/revocations", {
        allowLocal: true,
      }),
    ).toThrow();
  });

  it("recognizes private and reserved IP address ranges", () => {
    for (const address of [
      "127.0.0.1",
      "10.0.0.1",
      "172.16.0.1",
      "192.168.1.1",
      "169.254.1.1",
      "198.51.100.10",
      "203.0.113.10",
      "::1",
      "::ffff:7f00:1",
      "fd00::1",
      "fe80::1",
      "2001:db8::1",
    ]) {
      expect(isPrivateOrReservedAddress(address)).toBe(true);
    }
    expect(isPrivateOrReservedAddress("8.8.8.8")).toBe(false);
    expect(isPrivateOrReservedAddress("2606:4700:4700::1111")).toBe(false);
  });

  it("classifies responses without retrying permanent client errors", () => {
    expect(classifyDeliveryStatus(204)).toBe("delivered");
    expect(classifyDeliveryStatus(408)).toBe("retry");
    expect(classifyDeliveryStatus(429)).toBe("retry");
    expect(classifyDeliveryStatus(503)).toBe("retry");
    expect(classifyDeliveryStatus(400)).toBe("terminal");
    expect(classifyDeliveryStatus(410)).toBe("terminal");
  });

  it("uses bounded retry delays", () => {
    expect(retryDelayMs(1)).toBe(60_000);
    expect(retryDelayMs(2)).toBe(5 * 60_000);
    expect(retryDelayMs(100)).toBe(6 * 60 * 60_000);
  });

  it("builds an app-audienced pairwise event without platform identity", () => {
    const delivery: ClaimedDelivery = {
      id: "event-1",
      applicationId: "app-1",
      endpointId: "endpoint-1",
      membershipId: "member-1",
      destinationUrl: "https://app.example.com/revocations",
      eventType: "application.access.revoked",
      reason: "user_banned",
      subject: "pairwise-subject-1",
      authorizationVersion: 2,
      effectiveAt: new Date("2026-07-16T12:00:00.000Z"),
      attemptCount: 0,
      deadlineAt: new Date("2026-07-17T12:00:00.000Z"),
    };
    const payload = buildRevocationEventPayload(delivery, 1_768_478_400);
    expect(payload).toMatchObject({
      aud: "urn:sso:application:app-1",
      jti: "event-1",
      sub: "pairwise-subject-1",
      application_id: "app-1",
      membership_id: "member-1",
      authorization_version: 2,
      event_type: "application.access.revoked",
      reason: "user_banned",
    });
    expect(payload).not.toHaveProperty("user_id");
    expect(payload).not.toHaveProperty("email");
    expect(payload).not.toHaveProperty("permissions");
    expect(payload).not.toHaveProperty("roles");
  });
});
