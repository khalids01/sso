import { afterEach, describe, expect, it } from "bun:test";
import {
  createRemoteJWKSet,
  exportJWK,
  generateKeyPair,
  jwtVerify,
  SignJWT,
  type JWK,
} from "jose";

const servers: ReturnType<typeof Bun.serve>[] = [];

afterEach(() => {
  for (const server of servers.splice(0)) server.stop(true);
});

describe("JWKS consumer contract", () => {
  it("refreshes unknown kids and keeps retired published keys valid", async () => {
    const first = await generateKeyPair("RS256", { modulusLength: 2048 });
    const second = await generateKeyPair("RS256", { modulusLength: 2048 });
    const firstPublic = {
      ...(await exportJWK(first.publicKey)),
      alg: "RS256",
      kid: "key-1",
      use: "sig",
    };
    const secondPublic = {
      ...(await exportJWK(second.publicKey)),
      alg: "RS256",
      kid: "key-2",
      use: "sig",
    };
    let keys: JWK[] = [firstPublic];
    let requests = 0;
    const server = Bun.serve({
      port: 0,
      fetch() {
        requests += 1;
        return Response.json(
          { keys },
          { headers: { "cache-control": "public, max-age=300" } },
        );
      },
    });
    servers.push(server);

    const resolver = createRemoteJWKSet(new URL(`http://127.0.0.1:${server.port}/jwks`), {
      cacheMaxAge: 5 * 60 * 1_000,
      // A new signing kid must trigger a refresh even inside the normal cache
      // window. Clients should use this behavior during key rotation.
      cooldownDuration: 0,
    });
    const sign = (kid: string, key: CryptoKey) =>
      new SignJWT({ scope: "openid" })
        .setProtectedHeader({ alg: "RS256", kid })
        .setIssuer("https://issuer.example.test")
        .setAudience("urn:sso:application:test")
        .setIssuedAt()
        .setExpirationTime("1m")
        .sign(key);

    await jwtVerify(await sign("key-1", first.privateKey), resolver, {
      issuer: "https://issuer.example.test",
      audience: "urn:sso:application:test",
      algorithms: ["RS256"],
    });
    expect(requests).toBe(1);

    keys = [secondPublic, firstPublic];
    await jwtVerify(await sign("key-2", second.privateKey), resolver, {
      issuer: "https://issuer.example.test",
      audience: "urn:sso:application:test",
      algorithms: ["RS256"],
    });
    expect(requests).toBe(2);

    // Rotation publishes the previous public key for the configured grace
    // period, so tokens signed just before rotation continue to verify.
    await jwtVerify(await sign("key-1", first.privateKey), resolver, {
      issuer: "https://issuer.example.test",
      audience: "urn:sso:application:test",
      algorithms: ["RS256"],
    });
    expect(requests).toBe(2);
  });
});
