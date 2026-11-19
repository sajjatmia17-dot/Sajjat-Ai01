import {
  getPhoneControlStatus,
  analyzeScreenWithGemini,
  processPhoneVoiceCommand,
} from "../../server/phoneControlService";

const CORS_HEADERS: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Cache-Control": "no-store",
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: CORS_HEADERS,
  });
}

export default async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const url = new URL(req.url);
    const pathname = url.pathname.toLowerCase();
    const queryAction = (url.searchParams.get("action") || "").toLowerCase();

    if (req.method === "GET") {
      if (pathname.endsWith("/status") || queryAction === "status" || queryAction === "") {
        return jsonResponse(getPhoneControlStatus("netlify-function"), 200);
      }
      return jsonResponse({ success: false, error: "Unsupported GET action" }, 400);
    }

    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ success: false, error: "Invalid JSON payload" }, 400);
    }

    const action = (body?.action || queryAction || "").toLowerCase();

    if (pathname.endsWith("/status") || action === "status") {
      return jsonResponse(getPhoneControlStatus("netlify-function"), 200);
    }

    if (pathname.endsWith("/analyze") || action === "analyze") {
      const result = await analyzeScreenWithGemini({
        imageBase64: body?.imageBase64 || "",
        mimeType: body?.mimeType || "image/jpeg",
        question: body?.question || "",
        language: body?.language === "en" ? "en" : "bn",
      });

      const status =
        result.success ? 200 : result.errorCode === "INVALID_INPUT" ? 400 : result.errorCode === "MISSING_API_KEY" ? 503 : 500;
      return jsonResponse(result, status);
    }

    if (pathname.endsWith("/voice") || action === "voice") {
      const result = await processPhoneVoiceCommand({
        text: body?.text || "",
        language: body?.language === "en" ? "en" : "bn",
        hasScreenShare: Boolean(body?.hasScreenShare),
        history: Array.isArray(body?.history) ? body.history : [],
      });

      const status =
        result.success ? 200 : result.errorCode === "INVALID_INPUT" ? 400 : result.errorCode === "MISSING_API_KEY" ? 503 : 500;
      return jsonResponse(result, status);
    }

    return jsonResponse({ success: false, error: "Unknown Phone Control action" }, 400);
  } catch (err: any) {
    console.error("[Netlify Phone Control Function Error]:", err);
    return jsonResponse(
      {
        success: false,
        errorCode: "API_ERROR",
        error: err?.message || "Internal server error in Phone Control function",
      },
      500
    );
  }
};
