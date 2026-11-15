import { getAuth } from "../../../../lib/auth/server";

async function handler(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  if (!process.env.NEON_AUTH_BASE_URL)
    return Response.json(
      { error: { message: "Accounts are not configured yet." } },
      { status: 503 },
    );
  const handlers = getAuth().handler();
  const method = request.method as keyof typeof handlers;
  return handlers[method](request, context);
}
export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};
