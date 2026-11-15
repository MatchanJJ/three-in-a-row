import { getAuth } from "../../../../lib/auth/server";

async function handler(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const handlers = getAuth().handler();
    const method = request.method as keyof typeof handlers;
    return await handlers[method](request, context);
  } catch {
    // Keep configuration and upstream failures in the auth client's JSON format.
    return Response.json(
      {
        error: {
          message: "Account service is unavailable. Please try again shortly.",
        },
      },
      { status: 503 },
    );
  }
}
export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};
