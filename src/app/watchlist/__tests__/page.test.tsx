// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import WatchlistPage, { metadata } from "../page";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("WatchlistPage", () => {
  it("introduces the watchlist and loads the tracked stays", async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(Response.json([]))
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<WatchlistPage />);

    expect(screen.getByRole("heading", { name: "Watchlist" })).toBeTruthy();
    expect(
      await screen.findByText("No tracked stays yet. Add one above.")
    ).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith("/api/watchlist");
    expect(metadata.title).toBe("Watchlist · Thalassa");
  });
});
