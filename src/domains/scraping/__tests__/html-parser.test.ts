import { describe, expect, it } from "vitest";
import {
  extractRoomOptions,
  loadHtml,
  unwrapJsonHtml,
} from "../parsers/html-parser";

describe("extractRoomOptions", () => {
  it("reads rooms from the room dropdown and skips the empty option", () => {
    const $ = loadHtml(`
      <select name="room">
        <option class="empty" value="">Any room</option>
        <option value="DBL"> Double room </option>
        <option value="STE">Suite</option>
        <option value="">No code</option>
      </select>`);

    expect(extractRoomOptions($)).toEqual([
      { code: "DBL", name: "Double room" },
      { code: "STE", name: "Suite" },
    ]);
  });

  it("falls back to room rows followed by rows carrying data-room", () => {
    const $ = loadHtml(`
      <table>
        <tr class="room"><td class="name"> Garden Suite </td></tr>
        <tr><td>spacer without a code</td></tr>
        <tr data-room="GS1"><td>rate</td></tr>
        <tr data-room="GS2"><td>second rate, ignored</td></tr>
        <tr class="room"><td class="name">Sea Villa</td></tr>
        <tr data-room="SV"><td>rate</td></tr>
        <tr class="room"><td class="name">No rates</td></tr>
        <tr class="room"><td class="name"></td></tr>
        <tr data-room="NAMELESS"><td>rate</td></tr>
      </table>`);

    expect(extractRoomOptions($)).toEqual([
      { code: "GS1", name: "Garden Suite" },
      { code: "SV", name: "Sea Villa" },
    ]);
  });

  it("returns no rooms when the page lists none", () => {
    expect(extractRoomOptions(loadHtml("<p>Sold out</p>"))).toEqual([]);
  });
});

describe("unwrapJsonHtml", () => {
  it("returns the html field of a JSON booking-engine response", () => {
    const body = JSON.stringify({ demand: 1, html: "<table>rates</table>" });
    expect(unwrapJsonHtml(body)).toBe("<table>rates</table>");
  });

  it("keeps the body when the JSON html field is empty", () => {
    const body = JSON.stringify({ demand: 1, html: "" });
    expect(unwrapJsonHtml(body)).toBe(body);
  });

  it("keeps the body when it only looks like JSON", () => {
    const body = '{ "demand": 1, "html": broken';
    expect(unwrapJsonHtml(body)).toBe(body);
  });

  it("keeps plain HTML untouched", () => {
    expect(unwrapJsonHtml("<div>html</div>")).toBe("<div>html</div>");
  });
});
