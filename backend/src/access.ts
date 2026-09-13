import type { Access, PayloadRequest } from "payload";

const DEV_SECRET = "sustally-scope3-dev-secret-change-me";

function pushSecret(into: string[], value: unknown) {
  if (typeof value === "string" && value.trim()) into.push(value.trim());
  else if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) into.push(value[0].trim());
}

function headerValues(headers: unknown, name: string) {
  const values: string[] = [];
  if (!headers || typeof headers !== "object") return values;
  const record = headers as {
    get?: (key: string) => string | null;
    forEach?: (callback: (value: string, key: string) => void) => void;
  } & Record<string, unknown>;
  if (typeof record.get === "function") {
    pushSecret(values, record.get(name));
    pushSecret(values, record.get(name.toLowerCase()));
  }
  pushSecret(values, record[name]);
  pushSecret(values, record[name.toLowerCase()]);
  if (typeof record.forEach === "function") {
    record.forEach((value, key) => {
      if (key.toLowerCase() === name.toLowerCase()) pushSecret(values, value);
    });
  }
  return values;
}

function expectedSecrets(payloadSecret?: string) {
  return [...new Set([process.env.PAYLOAD_SECRET, payloadSecret, DEV_SECRET].filter((value): value is string => Boolean(value)))];
}

export function requestHasInternalSecret(headers: unknown, payloadSecret?: string) {
  const sent = [
    ...headerValues(headers, "x-payload-secret"),
    ...headerValues(headers, "authorization").flatMap((value) => {
      const match = /^Bearer\s+(.+)$/i.exec(value);
      return match?.[1] ? [match[1]] : [];
    }),
  ];
  const expected = expectedSecrets(payloadSecret);
  return sent.some((value) => expected.includes(value));
}

export function payloadRequestHasInternalSecret(req: PayloadRequest) {
  return requestHasInternalSecret(req.headers, req.payload?.secret);
}

export const isAdminOrInternal: Access = ({ req }) => {
  if (req.user) return true;
  return payloadRequestHasInternalSecret(req);
};
