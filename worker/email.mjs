export function normalizeEmail(value) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[\x21-\x7e]+$/.test(email)) return null;
  const parts = email.split("@");
  if (parts.length !== 2) return null;
  const [local, domain] = parts;
  if (local.length > 64 || !/^[a-z0-9][a-z0-9.!#$%&'*+/=?^_`{|}~-]*$/.test(local) || local.endsWith(".") || local.includes("..")) return null;
  const labels = domain.split(".");
  if (labels.length < 2 || !labels.every((label) => label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)) || !/^[a-z]{2,63}$/.test(labels.at(-1))) return null;
  return email;
}
