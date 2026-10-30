import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { getAllHotels } from "@/domains/hotels/registry";
import { GET as getHotel } from "../[slug]/route";
import { GET as listHotels } from "../route";

function slugParams(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

const request = new NextRequest("http://localhost/api/hotels");

describe("GET /api/hotels", () => {
  it("lists every visible hotel", async () => {
    const response = listHotels();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(getAllHotels());
  });
});

describe("GET /api/hotels/[slug]", () => {
  it("returns the hotel for a slug", async () => {
    const response = await getHotel(request, slugParams("blue-carpet"));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      id: "bluecarpet",
      name: "Blue Carpet Suites",
    });
  });

  it("answers 404 for an unknown hotel", async () => {
    const response = await getHotel(request, slugParams("nowhere"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Hotel not found" });
  });
});
