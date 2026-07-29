import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init);
}

export function fail(message: string, status = 400, code?: string) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: (code ?? "ERROR").toUpperCase().replace(/\s+/g, "_"),
        message,
      },
    },
    { status },
  );
}
