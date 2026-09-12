import type { Access, PayloadRequest } from "payload";

function headerValue(req: PayloadRequest, name: string): string | null {
  return req.headers.get(name);
}

export const isAdminOrInternal: Access = ({ req }) => {
  if (req.user) return true;
  return headerValue(req, "x-payload-secret") === process.env.PAYLOAD_SECRET;
};
