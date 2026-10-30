// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getHotel } from "@/domains/hotels/registry";
import { DatePicker } from "../date-picker";
import { GuestSelector } from "../guest-selector";
import { HotelSelector } from "../hotel-selector";

const JUNE_9 = /June 9th, 2026/u;
const JUNE_25 = /June 25th, 2026/u;

afterEach(() => {
  vi.useRealTimers();
});

describe("GuestSelector", () => {
  it("reports adults and children as numbers", () => {
    const onChange = vi.fn();
    render(<GuestSelector adults={2} childCount={1} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Adults"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("Children"), {
      target: { value: "2" },
    });

    expect(onChange.mock.calls).toEqual([
      [3, 1],
      [2, 2],
    ]);
  });

  it("reports a cleared field as zero and shows zero as empty", () => {
    const onChange = vi.fn();
    render(<GuestSelector adults={2} childCount={0} onChange={onChange} />);

    expect(screen.getByLabelText<HTMLInputElement>("Children").value).toBe("");
    fireEvent.change(screen.getByLabelText("Adults"), {
      target: { value: "" },
    });

    expect(onChange).toHaveBeenCalledWith(0, 0);
  });
});

describe("HotelSelector", () => {
  const hotels = [
    getHotel("bluecarpet"),
    getHotel("cocooning"),
    getHotel("excelsior"),
  ];

  it("hides hotels kept out of search and marks the selected ones", () => {
    render(
      <HotelSelector
        hotels={hotels}
        onChange={vi.fn()}
        selected={["cocooning"]}
      />
    );

    expect(screen.queryByRole("button", { name: "The Excelsior" })).toBeNull();
    const cocooning = screen.getByRole("button", { name: "Cocooning Suites" });
    expect(cocooning.querySelector(".lucide-check")).not.toBeNull();
    const blueCarpet = screen.getByRole("button", {
      name: "Blue Carpet Suites",
    });
    expect(blueCarpet.querySelector(".lucide-check")).toBeNull();
  });

  it("toggles a hotel in and out of the selection", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <HotelSelector
        hotels={hotels}
        onChange={onChange}
        selected={["cocooning"]}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Blue Carpet Suites" })
    );
    await user.click(screen.getByRole("button", { name: "Cocooning Suites" }));

    expect(onChange.mock.calls).toEqual([[["cocooning", "bluecarpet"]], [[]]]);
  });

  it("selects every visible hotel, then clears them all", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <HotelSelector hotels={hotels} onChange={onChange} selected={[]} />
    );

    await user.click(screen.getByRole("button", { name: "Select All" }));
    expect(onChange).toHaveBeenLastCalledWith(["bluecarpet", "cocooning"]);

    rerender(
      <HotelSelector
        hotels={hotels}
        onChange={onChange}
        selected={["bluecarpet", "cocooning"]}
      />
    );
    await user.click(screen.getByRole("button", { name: "Deselect All" }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("offers Select All while the hotel list is still empty", () => {
    render(<HotelSelector hotels={[]} onChange={vi.fn()} selected={[]} />);

    expect(screen.getByRole("button", { name: "Select All" })).toBeTruthy();
  });
});

describe("DatePicker", () => {
  it("shows the chosen date and offers only future days", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 5, 10, 12));
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<DatePicker date={new Date(2026, 5, 20)} onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: "June 20th, 2026" }));
    const yesterday = screen.getByRole("button", { name: JUNE_9 });
    expect(yesterday).toHaveProperty("disabled", true);
    await user.click(screen.getByRole("button", { name: JUNE_25 }));

    expect(onSelect).toHaveBeenCalledWith(
      new Date(2026, 5, 25),
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
  });

  it("asks for a date when none is chosen", () => {
    render(<DatePicker date={undefined} onSelect={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Pick a date" })).toBeTruthy();
  });
});
