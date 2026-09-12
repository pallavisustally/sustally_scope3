import type { Access, PayloadRequest } from "payload";

function headerValue(req: PayloadRequest, name: string): string | null {
  const headers = req.headers as { get?: (key: string) => string | null } & Record<string, string | string[] | undefined>;
  if (typeof headers.get === "function") return headers.get(name);
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value ?? null;
}

export const isAdminOrInternal: Access = ({ req }) => {
  if (req.user) return true;
  return headerValue(req, "x-payload-secret") === process.env.PAYLOAD_SECRET;
};
