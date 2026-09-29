import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

// MUI v9 の Typography は color="text.secondary" のような経路指定を受けず、
// 黙って継承色になる。textSecondary か sx の color を使う。
describe("Typography の color 指定", () => {
  it('color="text.*" のようなドット経路を使っていない', () => {
    const offenders = sourceFiles("src").filter((file) =>
      /\bcolor="(text|primary|secondary|error|warning|info|success)\.[A-Za-z]+"/.test(
        readFileSync(file, "utf8"),
      ),
    );
    expect(offenders).toEqual([]);
  });
});
