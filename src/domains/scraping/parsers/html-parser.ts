import * as cheerio from "cheerio";
import type { RoomType } from "@/domains/hotels/types";

export type CheerioRoot = ReturnType<typeof cheerio.load>;

export function loadHtml(html: string): CheerioRoot {
  return cheerio.load(html);
}

export function extractRoomOptions($: CheerioRoot): RoomType[] {
  const roomOptions: RoomType[] = [];

  // Method 1: select dropdown (used by some hotels)
  $('select[name="room"] option').each((_, el) => {
    const $option = $(el);
    const code = $option.attr("value");
    const name = $option.text().trim();
    if (code && !$option.hasClass("empty")) {
      roomOptions.push({ code, name });
    }
  });

  if (roomOptions.length > 0) {
    return roomOptions;
  }

  // Method 2: tr.room elements with data-room attributes (Cocooning, etc.)
  const roomMap = new Map<string, string>();

  $("tr.room").each((_, roomRow) => {
    const $roomRow = $(roomRow);
    const roomName = $roomRow.find("td.name").first().text().trim();

    let $currentRow = $roomRow.next("tr");
    while ($currentRow.length > 0 && !$currentRow.hasClass("room")) {
      const roomCode = $currentRow.attr("data-room");
      if (roomCode && roomName) {
        roomMap.set(roomCode, roomName);
        break;
      }
      $currentRow = $currentRow.next("tr");
    }
  });

  for (const [code, name] of roomMap) {
    roomOptions.push({ code, name });
  }

  return roomOptions;
}

export function unwrapJsonHtml(html: string): string {
  if (
    html.trim().startsWith("{") &&
    html.includes('"demand"') &&
    html.includes('"html"')
  ) {
    try {
      const jsonData = JSON.parse(html);
      if (jsonData.html) {
        return jsonData.html;
      }
    } catch {
      // JSON parse failed, return original
    }
  }
  return html;
}
