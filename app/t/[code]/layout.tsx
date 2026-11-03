import { notFound } from "next/navigation";
import { Shell } from "@/components/Shell";
import { TournamentProvider } from "@/components/tournament";
import { getView } from "@/lib/view";

export default async function TournamentLayout({ children, params }: LayoutProps<"/t/[code]">) {
  const { code } = await params;
  const view = await getView(code);
  if (!view) notFound();
  return (
    <TournamentProvider initial={view}>
      <Shell>{children}</Shell>
    </TournamentProvider>
  );
}
