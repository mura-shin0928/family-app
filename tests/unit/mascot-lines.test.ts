import { describe, expect, it } from "vitest";
import {
  MASCOT_CHATTER,
  MASCOT_GREETING,
  MASCOT_RARE_CHANCE,
  type MascotLine,
  mascotLineAt,
  pickRareLine,
} from "@/features/tasks/mascot-lines";

describe("mascotLineAt", () => {
  it("starts with the greeting for the progress", () => {
    expect(mascotLineAt("todayDone", 0)).toBe(MASCOT_GREETING.todayDone);
    expect(mascotLineAt("allDone", 0)).toBe(MASCOT_GREETING.allDone);
  });

  it("looks worried only when something is overdue", () => {
    const worried = Object.entries(MASCOT_GREETING)
      .filter(([, line]) => line.expression === "worried")
      .map(([progress]) => progress);
    expect(worried).toEqual(["overdue"]);
    expect(MASCOT_CHATTER.some((line) => line.expression === "worried")).toBe(
      false,
    );
  });

  it("moves through the chatter one tap at a time", () => {
    MASCOT_CHATTER.forEach((line, index) => {
      expect(mascotLineAt("remaining", index + 1)).toBe(line);
    });
  });

  it("returns to the greeting after the last chatter line", () => {
    expect(mascotLineAt("nothingToday", MASCOT_CHATTER.length + 1)).toBe(
      MASCOT_GREETING.nothingToday,
    );
  });

  it("cheers only when everything is done", () => {
    const cheering = Object.entries(MASCOT_GREETING)
      .filter(([, line]) => line.expression === "cheer")
      .map(([progress]) => progress);
    expect(cheering).toEqual(["allDone"]);
    expect(MASCOT_CHATTER.some((line) => line.expression === "cheer")).toBe(
      false,
    );
  });
});

describe("pickRareLine", () => {
  const randomFrom = (values: number[]) => {
    let index = 0;
    return () => values[index++];
  };
  const rareLines: MascotLine[] = [
    { expression: "wink", lines: ["レア1"] },
    { expression: "smile", lines: ["レア2"] },
  ];

  it("returns null when the draw misses", () => {
    expect(pickRareLine(randomFrom([MASCOT_RARE_CHANCE]), rareLines)).toBe(
      null,
    );
    expect(pickRareLine(randomFrom([0.99]), rareLines)).toBe(null);
  });

  it("returns a rare line when the draw hits", () => {
    expect(pickRareLine(randomFrom([0, 0]), rareLines)).toBe(rareLines[0]);
    expect(pickRareLine(randomFrom([0, 0.999]), rareLines)).toBe(rareLines[1]);
  });

  it("returns null when there is no rare line", () => {
    expect(pickRareLine(randomFrom([0, 0]), [])).toBe(null);
  });
});
