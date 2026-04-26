import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("http://localhost/api/sample", () => HttpResponse.json({ ok: true })),
];
