import type { LookupAddress } from "node:dns";
import { createServer, type Server } from "node:net";
import { Readable } from "node:stream";
import { brotliCompressSync, gzipSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dnsLookup = vi.hoisted(() => vi.fn());
vi.mock("node:dns", () => ({ lookup: dnsLookup }));

import {
  createGuardedLookup,
  decodeBody,
  guardedGet,
} from "@/features/recipes/extraction/guarded-request";

type Resolved = LookupAddress[];

function resolverReturning(addresses: Resolved) {
  return vi.fn(
    (
      _hostname: string,
      _options: object,
      callback: (err: Error | null, addresses: Resolved) => void,
    ) => callback(null, addresses),
  );
}

function runLookup(
  lookup: ReturnType<typeof createGuardedLookup>,
  options: { all?: boolean },
) {
  return new Promise<{ err: Error | null; result: unknown[] }>((resolve) => {
    lookup("example.com", options, (err, ...result) =>
      resolve({ err, result }),
    );
  });
}

describe("createGuardedLookup", () => {
  const PUBLIC_V4 = { address: "93.184.216.34", family: 4 };
  const PUBLIC_V6 = { address: "2606:4700:4700::1111", family: 6 };

  it("passes every resolved address through when all are public (all: true)", async () => {
    const lookup = createGuardedLookup(
      resolverReturning([PUBLIC_V6, PUBLIC_V4]),
    );

    const { err, result } = await runLookup(lookup, { all: true });

    expect(err).toBeNull();
    expect(result).toEqual([[PUBLIC_V6, PUBLIC_V4]]);
  });

  it("returns the first address in the single-address form (all: false)", async () => {
    const lookup = createGuardedLookup(
      resolverReturning([PUBLIC_V4, PUBLIC_V6]),
    );

    const { err, result } = await runLookup(lookup, {});

    expect(err).toBeNull();
    expect(result).toEqual(["93.184.216.34", 4]);
  });

  it("always asks the resolver for every address, so none goes unchecked", async () => {
    const resolver = resolverReturning([PUBLIC_V4]);

    await runLookup(createGuardedLookup(resolver), {});

    expect(resolver.mock.calls[0]?.[1]).toMatchObject({ all: true });
  });

  it.each([
    ["a private IPv4", [{ address: "10.0.0.5", family: 4 }]],
    ["loopback IPv6", [{ address: "::1", family: 6 }]],
    [
      "a public address mixed with an internal one",
      [PUBLIC_V4, { address: "169.254.169.254", family: 4 }],
    ],
    ["no address at all", []],
  ])("fails when the resolver returns %s", async (_label, addresses) => {
    const lookup = createGuardedLookup(resolverReturning(addresses));

    const { err } = await runLookup(lookup, { all: true });

    expect(err).toBeInstanceOf(Error);
  });

  it("propagates a resolver error", async () => {
    const failure = new Error("ENOTFOUND");
    const lookup = createGuardedLookup((_hostname, _options, callback) =>
      callback(failure, []),
    );

    const { err } = await runLookup(lookup, { all: true });

    expect(err).toBe(failure);
  });
});

describe("guardedGet", () => {
  let server: Server;
  let port: number;
  let connections: number;

  beforeEach(async () => {
    connections = 0;
    server = createServer((socket) => {
      connections += 1;
      socket.destroy();
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (address === null || typeof address === "string") throw new Error();
    port = address.port;
  });

  afterEach(async () => {
    dnsLookup.mockReset();
    await new Promise((resolve) => server.close(resolve));
  });

  function get(url: string) {
    return guardedGet(new URL(url), {
      signal: AbortSignal.timeout(2000),
      headers: {},
    });
  }

  it("does not connect when the name resolves to an internal IP at connection time", async () => {
    dnsLookup.mockImplementation(
      resolverReturning([{ address: "127.0.0.1", family: 4 }]),
    );

    await expect(get(`https://rebind.example.com:${port}/`)).rejects.toThrow();

    expect(dnsLookup).toHaveBeenCalledTimes(1);
    expect(connections).toBe(0);
  });

  it.each(["127.0.0.1", "[::1]", "[::ffff:7f00:1]", "0x7f.1"])(
    "does not connect to the internal IP literal %s",
    async (host) => {
      await expect(get(`https://${host}:${port}/`)).rejects.toThrow();

      expect(connections).toBe(0);
    },
  );
});

describe("decodeBody", () => {
  const HTML = "<html>レシピ</html>";

  async function read(stream: Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks).toString("utf8");
  }

  it.each([
    ["gzip", gzipSync(HTML)],
    ["x-gzip", gzipSync(HTML)],
    ["br", brotliCompressSync(HTML)],
    ["identity", Buffer.from(HTML)],
    [undefined, Buffer.from(HTML)],
  ])("decodes content-encoding %s", async (encoding, bytes) => {
    const decoded = decodeBody(Readable.from([bytes]), encoding);

    expect(decoded && (await read(decoded))).toBe(HTML);
  });

  it("returns null for an encoding it cannot decode", () => {
    expect(decodeBody(Readable.from([Buffer.from(HTML)]), "zstd")).toBeNull();
  });

  it("errors the returned stream when the source fails mid-body", async () => {
    const source = new Readable({ read() {} });
    const decoded = decodeBody(source, "gzip");
    source.destroy(new Error("aborted"));

    await expect(decoded && read(decoded)).rejects.toThrow();
  });
});
