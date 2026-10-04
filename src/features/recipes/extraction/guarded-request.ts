import "server-only";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import type { IncomingHttpHeaders } from "node:http";
import { request } from "node:https";
import { isIP, type LookupFunction } from "node:net";
import { pipeline, type Readable } from "node:stream";
import { createBrotliDecompress, createGunzip } from "node:zlib";
import { isDisallowedAddress } from "./ip-guard";

type ResolveAll = (
  hostname: string,
  options: { all: true },
  callback: (
    err: NodeJS.ErrnoException | null,
    addresses: LookupAddress[],
  ) => void,
) => void;

export type GuardedResponse = {
  status: number;
  headers: IncomingHttpHeaders;
  body: Readable;
};

/**
 * ソケットの接続時に呼ばれる lookup。解決結果に接続禁止の IP が1つでも
 * あれば失敗させるので、検査した IP と接続先の IP が食い違わない。
 */
export function createGuardedLookup(
  resolveAll: ResolveAll = dnsLookup,
): LookupFunction {
  return (hostname, options, callback) => {
    resolveAll(hostname, { ...options, all: true }, (err, addresses) => {
      if (err) {
        callback(err, []);
        return;
      }
      const [first] = addresses;
      if (
        !first ||
        addresses.some((entry) => isDisallowedAddress(entry.address))
      ) {
        callback(new Error(`Blocked address for host: ${hostname}`), []);
        return;
      }
      if (options.all) {
        callback(null, addresses);
      } else {
        callback(null, first.address, first.family);
      }
    });
  };
}

const guardedLookup = createGuardedLookup();

/** 復号できない content-encoding は null。 */
export function decodeBody(
  source: Readable,
  encoding: string | undefined,
): Readable | null {
  switch (encoding?.trim().toLowerCase() ?? "") {
    case "":
    case "identity":
      return source;
    case "gzip":
    case "x-gzip":
      return pipeline(source, createGunzip(), () => {});
    case "br":
      return pipeline(source, createBrotliDecompress(), () => {});
    default:
      return null;
  }
}

/**
 * 接続禁止の IP には繋がらない https GET。リダイレクトは追わない。
 * signal はレスポンス本文の受信中も有効。
 */
export function guardedGet(
  url: URL,
  options: { signal: AbortSignal; headers: Record<string, string> },
): Promise<GuardedResponse> {
  return new Promise((resolve, reject) => {
    // IP リテラルは lookup を経由せずに接続されるため、ここで検査する。
    const host = url.hostname.replace(/^\[|\]$/g, "");
    if (isIP(host) !== 0 && isDisallowedAddress(host)) {
      reject(new Error(`Blocked address: ${host}`));
      return;
    }

    const req = request(
      url,
      {
        // 接続を使い回すと lookup を通らないリクエストができる。
        agent: false,
        lookup: guardedLookup,
        signal: options.signal,
        headers: { ...options.headers, "Accept-Encoding": "gzip, br" },
      },
      (res) => {
        const body = decodeBody(res, res.headers["content-encoding"]);
        if (!body) {
          res.destroy();
          reject(new Error("Unsupported content-encoding"));
          return;
        }
        resolve({ status: res.statusCode ?? 0, headers: res.headers, body });
      },
    );
    req.on("error", reject);
    req.end();
  });
}
