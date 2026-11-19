import {
  verifyFirebaseIdToken,
  isAuthorizedAdminUser,
  AUTHORIZED_ADMIN_EMAIL,
  recordAdminAudit,
  getAdminAuditLogs,
  verifyAdminPanelPasscode,
} from "../../server/adminAuthService";
import {
  executeChatWithFallback,
  listAdminProvidersMasked,
  upsertAdminProvider,
  deleteAdminProvider,
  testAdminProviderPing,
  getPublicAiCapabilities,
} from "../../server/aiProviderService";
import {
  executeUniversalSearch,
  getUniversalSearchAdminStats,
  updateUniversalSearchConfig,
  clearUniversalSearchLogs,
} from "../../server/universalSearchService";

const CORS_HEADERS: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Cache-Control": "no-store",
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: CORS_HEADERS,
  });
}

const SAJJAT_AI_GATEWAY_SYSTEM_INSTRUCTION = `You are "Sajjat Ai" (created and owned by Sajjat Mia). Never refer to yourself as Gemini or Google.`;

async function authenticateAdmin(req: Request): Promise<
  | { authorized: true; uid: string; email: string }
  | { authorized: false; response: Response }
> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    recordAdminAudit({
      action: "NETLIFY_ADMIN_AUTH_REQUIRED",
      status: "denied",
      actorEmail: "anonymous",
      path: new URL(req.url).pathname,
      details: "Missing Bearer ID token on Netlify admin gateway.",
    });
    return {
      authorized: false,
      response: jsonResponse(
        { authorized: false, error: "Access Denied: অ্যাডমিন অথেনটিকেশন টোকেন অনুপস্থিত।" },
        401
      ),
    };
  }

  try {
    const verified = await verifyFirebaseIdToken(token);
    if (!isAuthorizedAdminUser(verified)) {
      recordAdminAudit({
        action: "NETLIFY_ADMIN_UNAUTHORIZED",
        status: "denied",
        actorEmail: verified.email || "unknown",
        actorUid: verified.uid,
        path: new URL(req.url).pathname,
        details: `Non-admin or unverified email rejected (${verified.email}).`,
      });
      return {
        authorized: false,
        response: jsonResponse(
          {
            authorized: false,
            error: `Access Denied: শুধুমাত্র অনুমোদিত অ্যাডমিন (${AUTHORIZED_ADMIN_EMAIL}) এই প্যানেলে প্রবেশ করতে পারবেন।`,
          },
          403
        ),
      };
    }
    return { authorized: true, uid: verified.uid, email: verified.email };
  } catch (err: any) {
    recordAdminAudit({
      action: "NETLIFY_ADMIN_INVALID_TOKEN",
      status: "denied",
      actorEmail: "unverified",
      path: new URL(req.url).pathname,
      details: err?.message || "Invalid token",
    });
    return {
      authorized: false,
      response: jsonResponse(
        { authorized: false, error: err?.message || "Access Denied: অবৈধ বা মেয়াদোত্তীর্ণ টোকেন।" },
        401
      ),
    };
  }
}

export default async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const url = new URL(req.url);
    const pathname = url.pathname.toLowerCase();

    // 1. Public AI capabilities endpoint (safe booleans + active model only, ZERO keys)
    if (req.method === "GET" && pathname.endsWith("/ai-capabilities")) {
      return jsonResponse(getPublicAiCapabilities(), 200);
    }

    // 2. Chat proxy endpoint (all provider keys kept strictly server-side)
    if (req.method === "POST" && pathname.endsWith("/chat")) {
      const body: any = await req.json().catch(() => ({}));
      const message = body?.message || body?.prompt || "";
      if (!message && !body?.imageBase64 && !body?.fileContent) {
        return jsonResponse({ error: "মেসেজ, ছবি অথবা ফাইল দেওয়া আবশ্যক।" }, 400);
      }

      try {
        const result = await executeChatWithFallback({
          message,
          history: Array.isArray(body?.history) ? body.history : [],
          imageBase64: body?.imageBase64,
          imageMimeType: body?.imageMimeType,
          fileContent: body?.fileContent,
          fileName: body?.fileName,
          requestedModel: body?.model,
          preferredProviderId: body?.provider,
          systemInstruction: SAJJAT_AI_GATEWAY_SYSTEM_INSTRUCTION,
        });
        return jsonResponse(result, 200);
      } catch (chatErr: any) {
        return jsonResponse(
          {
            error: chatErr?.message || "AI ইঞ্জিন থেকে উত্তর পাওয়া যায়নি।",
          },
          502
        );
      }
    }

    // 3. Universal Search endpoints
    if (req.method === "POST" && pathname.endsWith("/universal-search/query")) {
      const body: any = await req.json().catch(() => ({}));
      if (!body?.query) {
        return jsonResponse({ error: "অনুসন্ধানের জন্য প্রশ্ন দেওয়া আবশ্যক।" }, 400);
      }
      const payload = await executeUniversalSearch({
        query: String(body.query).trim(),
        forcedCategory: body.forcedCategory,
        uid: body.uid,
        userName: body.userName,
      });
      return jsonResponse({ success: true, ...payload, timestamp: new Date().toISOString() }, 200);
    }

    if (req.method === "GET" && pathname.endsWith("/universal-search/admin/stats")) {
      const authRes = await authenticateAdmin(req);
      if (authRes.authorized === false) return authRes.response;
      return jsonResponse({ success: true, ...getUniversalSearchAdminStats() }, 200);
    }

    if (req.method === "POST" && pathname.endsWith("/universal-search/admin/config")) {
      const authRes = await authenticateAdmin(req);
      if (authRes.authorized === false) return authRes.response;
      const body: any = await req.json().catch(() => ({}));
      const config = updateUniversalSearchConfig(body);
      return jsonResponse({ success: true, config }, 200);
    }

    if (req.method === "POST" && pathname.endsWith("/universal-search/admin/clear-logs")) {
      const authRes = await authenticateAdmin(req);
      if (authRes.authorized === false) return authRes.response;
      clearUniversalSearchLogs();
      return jsonResponse({ success: true }, 200);
    }

    // 4. Admin Auth Verification & Audit Logs
    if (req.method === "GET" && pathname.endsWith("/admin/verify")) {
      const authRes = await authenticateAdmin(req);
      if (authRes.authorized === false) return authRes.response;
      return jsonResponse({ authorized: true, email: authRes.email, uid: authRes.uid }, 200);
    }

    if (req.method === "POST" && pathname.endsWith("/admin/verify-passcode")) {
      const authRes = await authenticateAdmin(req);
      if (authRes.authorized === false) return authRes.response;
      const body: any = await req.json().catch(() => ({}));
      const passcode = typeof body?.passcode === "string" ? body.passcode : "";
      if (!verifyAdminPanelPasscode(passcode)) {
        recordAdminAudit({
          action: "NETLIFY_ADMIN_PASSCODE_FAILED",
          status: "denied",
          actorEmail: authRes.email,
          actorUid: authRes.uid,
          path: pathname,
          details: "Incorrect admin panel passcode entered.",
        });
        return jsonResponse(
          { authorized: false, error: "ভুল অ্যাডমিন প্যানেল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন।" },
          403
        );
      }
      recordAdminAudit({
        action: "NETLIFY_ADMIN_PASSCODE_VERIFIED",
        status: "success",
        actorEmail: authRes.email,
        actorUid: authRes.uid,
        path: pathname,
        details: "Verified admin panel passcode after Firebase ID token check.",
      });
      return jsonResponse({ authorized: true, passcodeVerified: true, email: authRes.email, uid: authRes.uid }, 200);
    }

    if (req.method === "POST" && pathname.endsWith("/admin/audit-attempt")) {
      const body: any = await req.json().catch(() => ({}));
      recordAdminAudit({
        action: `CLIENT_ADMIN_DENIED_${String(body?.trigger || "UNKNOWN").toUpperCase()}`,
        status: "denied",
        actorEmail: String(body?.email || "guest"),
        path: String(body?.path || "/admin"),
        details: String(body?.reason || "Blocked unauthorized admin access attempt."),
      });
      return jsonResponse({ authorized: false, error: "Access Denied" }, 403);
    }

    if (req.method === "GET" && pathname.endsWith("/admin/audit-logs")) {
      const authRes = await authenticateAdmin(req);
      if (authRes.authorized === false) return authRes.response;
      return jsonResponse({ success: true, logs: getAdminAuditLogs(100) }, 200);
    }

    // 5. Strict-Admin Provider CRUD & Diagnostics
    if (req.method === "GET" && pathname.endsWith("/admin/providers")) {
      const authRes = await authenticateAdmin(req);
      if (authRes.authorized === false) return authRes.response;
      return jsonResponse({ success: true, ...listAdminProvidersMasked() }, 200);
    }

    if (req.method === "POST" && (pathname.endsWith("/admin/providers") || pathname.endsWith("/admin/save-provider"))) {
      const authRes = await authenticateAdmin(req);
      if (authRes.authorized === false) return authRes.response;
      const body: any = await req.json().catch(() => ({}));
      const saved = upsertAdminProvider({
        ...body,
        id: body?.id || body?.providerId,
      });
      return jsonResponse({ success: true, provider: saved }, 200);
    }

    if (req.method === "DELETE" && pathname.includes("/admin/providers/")) {
      const authRes = await authenticateAdmin(req);
      if (authRes.authorized === false) return authRes.response;
      const id = decodeURIComponent(pathname.split("/admin/providers/")[1] || "");
      const del = deleteAdminProvider(id);
      return jsonResponse({ success: del.deleted, error: del.error }, del.deleted ? 200 : 400);
    }

    if (req.method === "POST" && pathname.endsWith("/admin/test-provider")) {
      const authRes = await authenticateAdmin(req);
      if (authRes.authorized === false) return authRes.response;
      const body: any = await req.json().catch(() => ({}));
      const ping = await testAdminProviderPing(body);
      return jsonResponse(ping, ping.success ? 200 : 500);
    }

    return jsonResponse({ error: "Unsupported endpoint in AI gateway" }, 404);
  } catch (err: any) {
    console.error("[Netlify AI Gateway Error]:", err);
    return jsonResponse({ error: err?.message || "Internal Gateway Error" }, 500);
  }
};
