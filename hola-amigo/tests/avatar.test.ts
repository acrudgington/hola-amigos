import { describe, expect, it } from "vitest";
import { ACCESSORIES, BACKGROUNDS, CHARACTERS, avatarEmoji, decodeAvatar, encodeAvatar, randomAvatar } from "../src/domain/avatar.ts";

describe("avatars", () => {
  it("round-trips every combination and always fits the 16-character database limit", () => {
    CHARACTERS.forEach((c, char) => c.tones.forEach((_, tone) => BACKGROUNDS.forEach((_, bg) => ACCESSORIES.forEach((_, acc) => {
      const code = encodeAvatar({ char, tone, bg, acc });
      expect(code.length).toBeLessThanOrEqual(16);
      expect(decodeAvatar(code)).toEqual({ char, tone, bg, acc });
    }))));
  });
  it("still shows older single-emoji avatars", () => {
    expect(avatarEmoji(decodeAvatar("🐼"))).toBe("🐼");
    expect(avatarEmoji(decodeAvatar("🦋"))).toBe("🦋");     // not in the new list: shown as it was
    expect(avatarEmoji(decodeAvatar(""))).toBe("🦊");
  });
  it("offers children in five skin tones", () => {
    expect(CHARACTERS.filter(c => c.tones.length === 6).length).toBeGreaterThanOrEqual(3);
  });
  it("ignores broken codes safely", () => {
    expect(() => decodeAvatar("av1:zzzzz")).not.toThrow();
    expect(decodeAvatar(randomAvatar()).char).toBeLessThan(CHARACTERS.length);
  });
});
