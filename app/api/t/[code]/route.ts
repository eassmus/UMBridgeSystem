import { getView } from "@/lib/view";

export async function GET(_req: Request, ctx: RouteContext<"/api/t/[code]">) {
  const { code } = await ctx.params;
  const view = await getView(code);
  if (!view) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(view, { headers: { "Cache-Control": "no-store" } });
}
