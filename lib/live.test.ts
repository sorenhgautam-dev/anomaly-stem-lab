import { describe, expect, it } from "vitest";
import { getExperiment } from "@/lib/content";
import { classSummary, ideaBehind, roomAnswer } from "@/lib/live-class";
import { CODE, memoryLive, newCode } from "@/lib/live";

describe("live rooms (memory store)", () => {
  it("makes readable 4-letter codes", () => {
    for (let i = 0; i < 50; i++) expect(newCode()).toMatch(CODE);
  });

  it("counts one guess per voter, only while guessing, and only the host can reveal", async () => {
    let t = 0;
    const store = memoryLive(() => t);
    const { code, hostKey } = await store.create("treatment-chemo-hair", 4);
    expect(await store.vote(code, 2, "voter-aaaa")).toBe(true);
    expect(await store.vote(code, 1, "voter-aaaa")).toBe(false);
    expect(await store.vote(code, 9, "voter-bbbb")).toBe(false);
    expect(await store.vote(code, 2, "voter-cccc")).toBe(true);
    expect((await store.read(code))?.counts).toEqual([0, 0, 2, 0]);
    expect(await store.reveal(code, "not-the-host")).toBe(false);
    expect(await store.reveal(code, hostKey)).toBe(true);
    expect((await store.read(code))?.phase).toBe("revealed");
    expect(await store.vote(code, 0, "voter-dddd")).toBe(false);
    t = 4 * 3600 * 1000;
    expect(await store.read(code)).toBeNull();
  });
});

describe("what the class sees", () => {
  const chemo = getExperiment("treatment-chemo-hair")!;

  it("takes the answer from the simulator", () => {
    expect(roomAnswer(chemo)).toBe("They are affected, like the cancer cells");
  });

  it("names the most common wrong idea from the lab's own diagnosis, from real counts only", () => {
    const options = chemo.prediction.type === "choice" ? chemo.prediction.options : [];
    const counts = options.map((o) => (o === "Nothing happens to them" ? 5 : o === "They are affected, like the cancer cells" ? 3 : 0));
    const s = classSummary(chemo, counts);
    expect(s.total).toBe(8);
    expect(s.wrong).toBe(5);
    expect(s.commonWrong?.option).toBe("Nothing happens to them");
    expect(s.commonWrong?.idea).toBe(ideaBehind(chemo, "Nothing happens to them"));
    expect(s.commonWrong?.idea).toBeTruthy();
    expect(s.next).toHaveLength(2);
  });

  it("says nothing made up when nobody has guessed", () => {
    const s = classSummary(chemo, [0, 0, 0, 0]);
    expect(s).toMatchObject({ total: 0, wrong: 0, commonWrong: null, next: null });
  });
});
