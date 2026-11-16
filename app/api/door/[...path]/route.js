// The one server-side door: every /api/door/* call is forwarded to
// SAM's member door on the box. The app holds no data of its own;
// it renders what the door says. The door's own rules (a credential
// on every call, host allowlist, rate limits, kill switch) all
// apply to these calls exactly as if the app were not here.

const DOOR = (process.env.SAM_DOOR_URL || "").replace(/\/+$/, "");

export const dynamic = "force-dynamic";

async function forward(req, path) {
  if (!DOOR) {
    return Response.json({ error: "Mission Control is not connected to SAM yet." }, { status: 503 });
  }
  const url = DOOR + "/" + path + (req.nextUrl.search || "");
  const headers = { "content-type": "application/json" };
  const auth = req.headers.get("authorization");
  if (auth) headers.authorization = auth;
  const init = { method: req.method, headers, cache: "no-store" };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }
  let res;
  try {
    res = await fetch(url, init);
  } catch {
    return Response.json({ error: "SAM is unreachable right now. Try again in a moment." }, { status: 502 });
  }
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") || "application/json", "cache-control": "no-store" },
  });
}

export async function GET(req, ctx) { const p = await ctx.params; return forward(req, p.path.join("/")); }
export async function POST(req, ctx) { const p = await ctx.params; return forward(req, p.path.join("/")); }
export async function PUT(req, ctx) { const p = await ctx.params; return forward(req, p.path.join("/")); }
export async function DELETE(req, ctx) { const p = await ctx.params; return forward(req, p.path.join("/")); }
