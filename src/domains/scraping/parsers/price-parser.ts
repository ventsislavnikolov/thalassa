const ALL_WHITESPACE = /[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]/gu;
const HAS_WHITESPACE = /[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]/u;
const CURRENCY_PREFIX = /^(?:BGN|EUR|USD|лв|€|\$)\s*/iu;
const CURRENCY_SUFFIX = /\s*(?:BGN|EUR|USD|лв|€|\$)$/iu;
const TWO_DIGITS = /^\d{2}$/u;

function stripCurrency(raw: string): string {
  return raw.replace(CURRENCY_PREFIX, "").replace(CURRENCY_SUFFIX, "").trim();
}

export const PriceFormat = {
  detect(value: string): "us" | "eu" | "plain" {
    const cleaned = stripCurrency(value);

    const hasComma = cleaned.includes(",");
    const hasDot = cleaned.includes(".");
    const hasSpace =
      cleaned.includes(" ") ||
      cleaned.includes("\u00A0") ||
      HAS_WHITESPACE.test(cleaned);

    if (hasComma && hasDot) {
      const commaIndex = cleaned.indexOf(",");
      const dotIndex = cleaned.indexOf(".");
      return commaIndex < dotIndex ? "us" : "eu";
    }

    if (hasComma && !hasDot) {
      const commaIndex = cleaned.lastIndexOf(",");
      const afterComma = cleaned
        .slice(commaIndex + 1)
        .replace(ALL_WHITESPACE, "");

      if (afterComma.length === 2 && TWO_DIGITS.test(afterComma)) {
        return "eu";
      }
      return "plain";
    }

    if (hasDot && !hasComma) {
      return "us";
    }

    if (hasSpace) {
      return "plain";
    }

    return "plain";
  },
};

export function parsePrice(raw: string): number | null {
  if (!raw.trim()) {
    return null;
  }

  const stripped = stripCurrency(raw);
  if (!stripped) {
    return null;
  }

  const format = PriceFormat.detect(stripped);
  let normalized: string;

  switch (format) {
    case "us": {
      if (stripped.includes(",") && stripped.includes(".")) {
        const commaIndex = stripped.indexOf(",");
        const dotIndex = stripped.indexOf(".");
        if (commaIndex < dotIndex) {
          normalized = stripped.replace(/,/gu, "").replace(ALL_WHITESPACE, "");
        } else {
          normalized = stripped
            .replace(/\./gu, "")
            .replace(",", ".")
            .replace(ALL_WHITESPACE, "");
        }
      } else {
        normalized = stripped.replace(ALL_WHITESPACE, "");
      }
      break;
    }
    case "eu": {
      if (stripped.includes(".") && stripped.includes(",")) {
        normalized = stripped
          .replace(/\./gu, "")
          .replace(",", ".")
          .replace(ALL_WHITESPACE, "");
      } else {
        normalized = stripped.replace(ALL_WHITESPACE, "").replace(",", ".");
      }
      break;
    }
    // "plain": the only format left
    default: {
      normalized = stripped.replace(ALL_WHITESPACE, "").replace(/,/gu, "");
      break;
    }
  }

  const result = Number.parseFloat(normalized);
  if (Number.isNaN(result)) {
    return null;
  }

  return result;
}
