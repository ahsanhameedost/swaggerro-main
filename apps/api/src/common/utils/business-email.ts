const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "protonmail.com",
  "pm.me",
  "gmx.com",
  "mail.com",
  "yandex.com",
  "yandex.ru",
  "mail.ru",
  "qq.com",
  "163.com",
  "126.com",
  "rediffmail.com",
  "rocketmail.com",
  "fastmail.com",
  "hey.com",
  "hushmail.com"
]);

export function isBusinessEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const domain = normalized.split("@")[1] ?? "";
  return !!domain && !PUBLIC_EMAIL_DOMAINS.has(domain);
}
