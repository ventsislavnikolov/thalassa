// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExportButton } from "../export-button";
import { price } from "./fixtures";

afterEach(() => {
  vi.restoreAllMocks();
});

async function exportCsv(filename?: string) {
  const user = userEvent.setup();
  const blobs: Blob[] = [];
  vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
    blobs.push(blob as Blob);
    return "blob:prices";
  });
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockReturnValue(undefined);
  const clicked: HTMLAnchorElement[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement
  ) {
    clicked.push(this);
  });

  render(
    <ExportButton
      filename={filename}
      prices={[
        price({ roomType: "Sea Suite" }),
        price({
          averagePerNight: 250.5,
          date: "2026-07-05",
          stayTotal: 1252.5,
        }),
      ]}
    />
  );
  await user.click(screen.getByRole("button", { name: "Export CSV" }));

  return { blob: blobs[0], link: clicked[0], revoke };
}

describe("ExportButton", () => {
  it("downloads the prices as CSV", async () => {
    const { blob, link, revoke } = await exportCsv("july.csv");

    expect(link.download).toBe("july.csv");
    expect(link.href).toBe("blob:prices");
    expect(await blob.text()).toBe(
      [
        "Date,Day,Hotel,Room Type,Per Night,Total",
        "2026-07-04,Saturday,Cocooning Suites,Sea Suite,200.00,1000.00",
        "2026-07-05,Saturday,Cocooning Suites,Standard Room,250.50,1252.50",
      ].join("\n")
    );
    expect(revoke).toHaveBeenCalledWith("blob:prices");
  });

  it("names the file hotel-prices.csv by default", async () => {
    const { link } = await exportCsv();

    expect(link.download).toBe("hotel-prices.csv");
  });
});
