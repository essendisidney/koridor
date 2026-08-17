import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import { getKenyaCorridorDirectory } from "@/lib/kenya-directory";

export const runtime = "nodejs";

/** Public Kenya → GCC / West Asia directory (listed orgs only). */
export async function GET(req: NextRequest) {
  try {
    const dest = req.nextUrl.searchParams.get("destination");
    const data = await getKenyaCorridorDirectory(dest);
    return ok(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message.startsWith("Unknown destination") ? 400 : 500;
    return fail(message, status);
  }
}
