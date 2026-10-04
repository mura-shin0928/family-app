import { BlockList, isIP } from "node:net";

// 出典: IANA IPv4 / IPv6 Special-Purpose Address Registry の
// "Globally Reachable" が True でない範囲と、マルチキャスト。
// https://www.iana.org/assignments/iana-ipv4-special-registry/
// https://www.iana.org/assignments/iana-ipv6-special-registry/
const DISALLOWED_IPV4_SUBNETS: [string, number][] = [
  ["0.0.0.0", 8], // "this network"
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // CGNAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // documentation
  ["192.88.99.0", 24], // deprecated 6to4 relay
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // documentation
  ["203.0.113.0", 24], // documentation
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved, broadcast
];

// IPv6 は 2000::/3（グローバルユニキャスト）だけを許可し、その中の特別用途を除く。
const ALLOWED_IPV6_SUBNET: [string, number] = ["2000::", 3];
const DISALLOWED_IPV6_SUBNETS: [string, number][] = [
  ["2001::", 23], // IETF protocol assignments (Teredo, benchmarking, ORCHID)
  ["2001:db8::", 32], // documentation
  ["2002::", 16], // 6to4
  ["3fff::", 20], // documentation
];

const disallowed = new BlockList();
for (const [network, prefix] of DISALLOWED_IPV4_SUBNETS) {
  disallowed.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of DISALLOWED_IPV6_SUBNETS) {
  disallowed.addSubnet(network, prefix, "ipv6");
}

const allowedIPv6 = new BlockList();
allowedIPv6.addSubnet(...ALLOWED_IPV6_SUBNET, "ipv6");

/**
 * 外部サイトの取得先として接続してはいけない IP アドレスかを判定する。
 * IP として解釈できない文字列も拒否する。
 */
export function isDisallowedAddress(address: string): boolean {
  switch (isIP(address)) {
    case 4:
      return disallowed.check(address, "ipv4");
    case 6:
      return (
        !allowedIPv6.check(address, "ipv6") || disallowed.check(address, "ipv6")
      );
    default:
      return true;
  }
}
