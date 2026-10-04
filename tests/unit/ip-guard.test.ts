import { describe, expect, it } from "vitest";
import { isDisallowedAddress } from "@/features/recipes/extraction/ip-guard";

describe("isDisallowedAddress (IPv4)", () => {
  // 各範囲の下端・上端と、そのすぐ外側。
  const cases: [string, boolean][] = [
    ["0.0.0.0", true],
    ["0.255.255.255", true],
    ["1.0.0.0", false],
    ["9.255.255.255", false],
    ["10.0.0.0", true],
    ["10.255.255.255", true],
    ["11.0.0.0", false],
    ["100.63.255.255", false],
    ["100.64.0.0", true],
    ["100.127.255.255", true],
    ["100.128.0.0", false],
    ["126.255.255.255", false],
    ["127.0.0.1", true],
    ["127.255.255.255", true],
    ["128.0.0.0", false],
    ["169.253.255.255", false],
    ["169.254.0.0", true],
    ["169.254.169.254", true],
    ["169.255.0.0", false],
    ["172.15.255.255", false],
    ["172.16.0.0", true],
    ["172.31.255.255", true],
    ["172.32.0.0", false],
    ["191.255.255.255", false],
    ["192.0.0.0", true],
    ["192.0.0.255", true],
    ["192.0.1.0", false],
    ["192.0.1.255", false],
    ["192.0.2.0", true],
    ["192.0.2.255", true],
    ["192.0.3.0", false],
    ["192.88.98.255", false],
    ["192.88.99.0", true],
    ["192.88.99.255", true],
    ["192.88.100.0", false],
    ["192.167.255.255", false],
    ["192.168.0.0", true],
    ["192.168.255.255", true],
    ["192.169.0.0", false],
    ["198.17.255.255", false],
    ["198.18.0.0", true],
    ["198.19.255.255", true],
    ["198.20.0.0", false],
    ["198.51.99.255", false],
    ["198.51.100.0", true],
    ["198.51.100.255", true],
    ["198.51.101.0", false],
    ["203.0.112.255", false],
    ["203.0.113.0", true],
    ["203.0.113.255", true],
    ["203.0.114.0", false],
    ["223.255.255.255", false],
    ["224.0.0.0", true],
    ["239.255.255.255", true],
    ["240.0.0.0", true],
    ["255.255.255.254", true],
    ["255.255.255.255", true],
    ["93.184.216.34", false],
  ];

  it.each(cases)("%s -> %s", (ip, expected) => {
    expect(isDisallowedAddress(ip)).toBe(expected);
  });
});

describe("isDisallowedAddress (IPv6)", () => {
  const cases: [string, boolean][] = [
    // 2000::/3（グローバルユニキャスト）の外はすべて拒否。
    ["::", true],
    ["::1", true],
    ["0:0:0:0:0:0:0:1", true],
    ["64:ff9b::7f00:1", true],
    ["64:ff9b::5db8:d822", true],
    ["64:ff9b:1::1", true],
    ["100::1", true],
    ["1fff:ffff:ffff:ffff:ffff:ffff:ffff:ffff", true],
    ["2000::1", false],
    ["3fff:ffff:ffff:ffff:ffff:ffff:ffff:ffff", false],
    ["4000::1", true],
    ["5f00::1", true],
    ["fc00::1", true],
    ["fdff:ffff::1", true],
    ["fe80::1", true],
    ["fe80::1%en0", true],
    ["fe90::1", true],
    ["febf:ffff::1", true],
    ["fec0::1", true],
    ["ff02::1", true],
    ["ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff", true],
    // IPv4-mapped は公開 IPv4 を指していても拒否。
    ["::ffff:127.0.0.1", true],
    ["::ffff:7f00:1", true],
    ["::FFFF:7F00:1", true],
    ["0:0:0:0:0:ffff:7f00:1", true],
    ["::ffff:a9fe:a9fe", true],
    ["::ffff:93.184.216.34", true],
    ["::ffff:5db8:d822", true],
    // 2000::/3 の中の特別用途。
    ["2001::1", true],
    ["2001:0:7f00:1::1", true],
    ["2001:2::1", true],
    ["2001:1ff:ffff:ffff:ffff:ffff:ffff:ffff", true],
    ["2001:200::1", false],
    ["2001:db7:ffff:ffff:ffff:ffff:ffff:ffff", false],
    ["2001:db8::1", true],
    ["2001:db8:ffff:ffff:ffff:ffff:ffff:ffff", true],
    ["2001:db9::1", false],
    ["2001:ffff:ffff:ffff:ffff:ffff:ffff:ffff", false],
    ["2002::1", true],
    ["2002:7f00:1::1", true],
    ["2002:ffff:ffff:ffff:ffff:ffff:ffff:ffff", true],
    ["2003::1", false],
    ["3ffe:ffff:ffff:ffff:ffff:ffff:ffff:ffff", false],
    ["3fff::1", true],
    ["3fff:fff:ffff:ffff:ffff:ffff:ffff:ffff", true],
    ["3fff:1000::1", false],
    ["2606:4700:4700::1111", false],
    ["2001:4860:4860::8888", false],
  ];

  it.each(cases)("%s -> %s", (ip, expected) => {
    expect(isDisallowedAddress(ip)).toBe(expected);
  });
});

describe("isDisallowedAddress (IP として解釈できない入力)", () => {
  it.each([
    "",
    "example.com",
    "1.2.3",
    "1.2.3.4.5",
    "256.0.0.1",
    "1.2.3.-4",
    "0x7f.0.0.1",
    ":::",
    "1::2::3",
    "12345::1",
    "g::1",
    "1:2:3:4:5:6:7:8:9",
  ])("%j is rejected", (value) => {
    expect(isDisallowedAddress(value)).toBe(true);
  });
});
