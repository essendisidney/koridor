import { getKenyaCorridorDirectory } from "@/lib/kenya-directory";
import { KenyaView } from "./kenya-view";

export const dynamic = "force-dynamic";

export default async function KenyaCorridorPage({
  searchParams,
}: {
  searchParams: Promise<{ destination?: string }>;
}) {
  const { destination } = await searchParams;
  const dest = destination?.toUpperCase() ?? "";
  try {
    const data = await getKenyaCorridorDirectory(dest || null);
    return <KenyaView dest={dest} data={data} />;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load the corridor directory.";
    return <KenyaView dest={dest} data={null} error={message} />;
  }
}
