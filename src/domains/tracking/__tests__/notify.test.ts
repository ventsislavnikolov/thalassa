import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "../notify";

const content = { html: "<p>Deal</p>", subject: "Deal alert", text: "Deal" };
const fetchMock = vi.fn<typeof fetch>();

function configure() {
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
  vi.stubEnv("ALERT_EMAIL_FROM", "alerts@example.com");
  vi.stubEnv("ALERT_EMAIL_TO", "me@example.com");
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("sendEmail", () => {
  it.each(["RESEND_API_KEY", "ALERT_EMAIL_FROM", "ALERT_EMAIL_TO"])(
    "skips sending when %s is unset",
    async (name) => {
      configure();
      vi.stubEnv(name, "");

      expect(await sendEmail(content)).toBe("skipped");
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );

  it("posts the email to Resend", async () => {
    configure();
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 200 }));

    expect(await sendEmail(content)).toBe("sent");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer re_test_key",
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      from: "alerts@example.com",
      html: "<p>Deal</p>",
      subject: "Deal alert",
      text: "Deal",
      to: "me@example.com",
    });
  });

  it("reports a rejected request as failed", async () => {
    configure();
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 422 }));

    expect(await sendEmail(content)).toBe("failed");
  });

  it("reports a network error as failed", async () => {
    configure();
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));

    expect(await sendEmail(content)).toBe("failed");
  });
});
