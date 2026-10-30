import { siteConfig } from "./config";

const money = new Intl.NumberFormat(siteConfig.locale, {
  style: "currency",
  currency: siteConfig.currency,
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatMoney(cents: number) {
  return money.format(cents / 100);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString(siteConfig.locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function pad(n: number, size = 2) {
  return String(n).padStart(size, "0");
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}
