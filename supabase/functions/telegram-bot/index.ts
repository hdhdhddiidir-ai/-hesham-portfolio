const U = "https://cdyrtfixvghjjptkuzxg.supabase.co";
const A = 7456305589;
const B = "portfolio-works";
const MAINTENANCE_CHAT_ID = -7456305589;

const T = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const S = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";
const K = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const H = {
  apikey: K,
  Authorization: "Bearer " + K,
  "Content-Type": "application/json",
};

const tg = async (method: string, body: any) => {
  const r = await fetch(
    "https://api.telegram.org/bot" + T + "/" + method,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return r.json();
};

const db = (path: string, options: any = {}) =>
  fetch(U + "/rest/v1/" + path, {
    ...options,
    headers: { ...H, ...(options.headers || {}) },
  });

const menu = (
  chat: number,
  message = "🎛️ لوحة تحكم Hesham Portfolio",
) =>
  tg("sendMessage", {
    chat_id: chat,
    text: message,
    reply_markup: {
      keyboard: [
        [{ text: "➕ إضافة عمل" }, { text: "📋 عرض الأعمال" }],
        [{ text: "✏️ تعديل عمل" }, { text: "🗑️ حذف عمل" }],
        [{ text: "🕒 تعليقات قيد المراجعة" }],
        [{ text: "✅ تعليقات الموقع" }],
        [{ text: "📊 الإحصائيات" }],
        [{ text: "🛠️ وضع الصيانة" }],
        [{ text: "🛒 طلبات العملاء" }],
      ],
      resize_keyboard: true,
    },
  });

async function sess(chat: number) {
  const r = await db(
    "bot_sessions?chat_id=eq." + chat + "&select=state,payload&limit=1",
  );
  const a = await r.json();
  return a[0] ?? { state: "idle", payload: {} };
}

const set = async (chat: number, state: string, payload: any = {}) =>
  db("bot_sessions", {
    method: "POST",
    headers: {
      ...H,
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      chat_id: chat,
      state,
      payload,
      updated_at: new Date().toISOString(),
    }),
  });

const clear = (chat: number) =>
  db("bot_sessions?chat_id=eq." + chat, { method: "DELETE" });

async function upload(fileId: string) {
  const f = await tg("getFile", { file_id: fileId });

  if (!f.ok || !f.result?.file_path) {
    throw new Error("تعذر الحصول على الصورة من Telegram");
  }

  const path = f.result.file_path;
  const response = await fetch(
    "https://api.telegram.org/file/bot" + T + "/" + path,
  );

  if (!response.ok) {
    throw new Error("تعذر تحميل الصورة");
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const isPng = path.toLowerCase().endsWith(".png");
  const filename = crypto.randomUUID() + (isPng ? ".png" : ".jpg");

  const uploaded = await fetch(
    U + "/storage/v1/object/" + B + "/" + filename,
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + K,
        apikey: K,
        "Content-Type": isPng ? "image/png" : "image/jpeg",
      },
      body: bytes,
    },
  );

  if (!uploaded.ok) {
    throw new Error(await uploaded.text());
  }

  return U + "/storage/v1/object/public/" + B + "/" + filename;
}

const cats = [
  "🎨 Logo & Visual Identity",
  "💳 Business Card",
  "📢 Advertisement",
  "🍽️ Restaurant Menu",
  "💌 Invitations",
  "📱 Social Media Ads",
  "🖼️ Graphic Design",
  "🖨️ Print Design",
  "📄 Flyer",
  "📚 Brochure",
  "🏷️ Stickers & Labels",
  "🪧 Posters & Banners",
  "📦 Packaging Design",
  "🏢 Business & Company Designs",
  "📱 Social Media Posts & Stories",
  "✨ Digital Designs",
];

const catKeyboard = {
  keyboard: [
    [cats[0], cats[1]],
    [cats[2], cats[3]],
    [cats[4], cats[5]],
    [cats[6], cats[7]],
    [cats[8], cats[9]],
    [cats[10], cats[11]],
    [cats[12], cats[13]],
    [cats[14], cats[15]],
  ].map((row) => row.map((text) => ({ text }))),
  resize_keyboard: true,
  one_time_keyboard: true,
};

const orderStatuses: Record<string, string> = {
  new: "🆕 جديد",
  in_progress: "🛠️ قيد التنفيذ",
  completed: "✅ مكتمل",
};

const orderFilters: Record<string, string> = {
  all: "📥 كل الطلبات",
  new: "🆕 الطلبات الجديدة",
  accepted: "✅ الطلبات المقبولة",
  in_progress: "🛠️ قيد التنفيذ",
  completed: "🏁 الطلبات المكتملة",
};

async function showOrderMenu(chat: number) {
  await tg("sendMessage", {
    chat_id: chat,
    text: "🛒 إدارة طلبات العملاء\n\nاختار القسم اللي عايز تشوفه:",
    reply_markup: {
      inline_keyboard: [
        [{ text: orderFilters.all, callback_data: "orderlist:all" }],
        [
          { text: orderFilters.new, callback_data: "orderlist:new" },
          { text: orderFilters.accepted, callback_data: "orderlist:accepted" },
        ],
        [
          { text: orderFilters.in_progress, callback_data: "orderlist:in_progress" },
          { text: orderFilters.completed, callback_data: "orderlist:completed" },
        ],
        [{ text: "🏠 القائمة الرئيسية", callback_data: "ordermenu:home" }],
      ],
    },
  });
}


function attachmentPath(value: any): { bucket: string; path: string; name: string } | null {
  const raw = typeof value === "string"
    ? value.trim()
    : String(value?.path || value?.url || value?.name || "");
  if (!raw || raw.startsWith("[not uploaded]")) return null;

  let bucket = B;
  let path = raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const marker = "/storage/v1/object/";
      const at = url.pathname.indexOf(marker);
      if (at < 0) return null;
      path = decodeURIComponent(url.pathname.slice(at + marker.length));
      path = path.replace(/^(public|authenticated|sign)\//, "");
    } catch {
      return null;
    }
  }

  path = path.replace(/^\/+/, "");
  if (path.startsWith(B + "/")) {
    path = path.slice(B.length + 1);
  } else if (path.includes("/")) {
    const first = path.split("/")[0];
    if (first && first !== "orders" && first !== "order-attachments") {
      bucket = first;
      path = path.slice(first.length + 1);
    }
  }
  if (!path) return null;
  const name = path.split("/").pop() || "attachment";
  return { bucket, path, name };
}

async function sendOrderAttachment(chat: number, value: any, orderId: number) {
  const parsed = attachmentPath(value);
  if (!parsed) return false;

  const downloaded = await fetch(
    U + "/storage/v1/object/authenticated/" + parsed.bucket + "/" +
      parsed.path.split("/").map(encodeURIComponent).join("/"),
    { headers: { apikey: K, Authorization: "Bearer " + K } },
  );
  if (!downloaded.ok) {
    throw new Error("تعذر تنزيل مرفق الطلب #" + orderId + ": " + downloaded.status);
  }

  const blob = await downloaded.blob();
  const contentType = downloaded.headers.get("content-type") ||
    (/\.pdf$/i.test(parsed.name) ? "application/pdf" : "application/octet-stream");
  const file = new File([blob], parsed.name, { type: contentType });
  const isImage = contentType.startsWith("image/") &&
    !/\.svg$/i.test(parsed.name);
  const method = isImage ? "sendPhoto" : "sendDocument";
  const form = new FormData();
  form.append("chat_id", String(chat));
  form.append(isImage ? "photo" : "document", file, parsed.name);
  form.append("caption", "📎 مرفق من طلب العميل #" + orderId + "\n" + parsed.name);

  const response = await fetch("https://api.telegram.org/bot" + T + "/" + method, {
    method: "POST",
    body: form,
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error("Telegram رفض إرسال مرفق الطلب #" + orderId);
  }
  return true;
}

function attachmentName(value: any): string {
  const parsed = attachmentPath(value);
  if (parsed) return parsed.name;
  const raw = typeof value === "string" ? value : String(value?.name || "مرفق");
  return raw.startsWith("[not uploaded]") ? raw : "مرفق";
}

async function showOrders(chat: number, status: string) {
  const filter = status === "all" ? "" : "&status=eq." + encodeURIComponent(status);
  const response = await db(
    "customer_orders?select=id,customer_name,service,details,whatsapp,status,created_at,attachments&order=created_at.desc&limit=100" + filter,
  );
  const rows = await response.json();

  if (!response.ok || !Array.isArray(rows)) {
    await tg("sendMessage", {
      chat_id: chat,
      text: "⚠️ مش قادر أجيب الطلبات. راجع جدول customer_orders وصلاحيات قاعدة البيانات.",
    });
    return;
  }

  if (rows.length === 0) {
    await tg("sendMessage", {
      chat_id: chat,
      text: "📭 مفيش طلبات في قسم: " + (orderFilters[status] || "الطلبات"),
      reply_markup: {
        inline_keyboard: [[{ text: "↩️ رجوع لأقسام الطلبات", callback_data: "ordermenu:list" }]],
      },
    });
    return;
  }

  await tg("sendMessage", {
    chat_id: chat,
    text: (orderFilters[status] || "📥 الطلبات") + " — عدد الطلبات: " + rows.length,
    reply_markup: {
      inline_keyboard: [[{ text: "↩️ رجوع لأقسام الطلبات", callback_data: "ordermenu:list" }]],
    },
  });

  for (const order of rows) {
    const attachmentItems = Array.isArray(order.attachments) ? order.attachments : [];
    const attachments = attachmentItems.length
      ? attachmentItems.map((item: any, index: number) =>
        (index + 1) + ". " + attachmentName(item)
      ).join("\n")
      : "لا يوجد";
    const createdAt = order.created_at
      ? new Date(order.created_at).toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })
      : "غير متوفر";
    const statusLabel = order.status === "accepted"
      ? orderFilters.accepted
      : (orderStatuses[order.status] || String(order.status || "جديد"));
    const details =
      "🛒 طلب رقم #" + order.id +
      "\n\n👤 الاسم: " + String(order.customer_name || "—") +
      "\n🎨 الخدمة: " + String(order.service || "—") +
      "\n📱 واتساب: " + String(order.whatsapp || "—") +
      "\n📝 التفاصيل: " + String(order.details || "—") +
      "\n📎 المرفقات: " + attachments +
      "\n\n📌 الحالة: " + statusLabel +
      "\n🕒 التاريخ: " + createdAt;

    await tg("sendMessage", {
      chat_id: chat,
      text: details,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🆕 جديد", callback_data: "orderstatus:" + order.id + ":new" },
            { text: "✅ مقبول", callback_data: "orderstatus:" + order.id + ":accepted" },
          ],
          [
            { text: "🛠️ قيد التنفيذ", callback_data: "orderstatus:" + order.id + ":in_progress" },
            { text: "🏁 مكتمل", callback_data: "orderstatus:" + order.id + ":completed" },
          ],
          [{ text: "🗑️ حذف الطلب", callback_data: "orderdel:" + order.id }],
          [{ text: "↩️ أقسام الطلبات", callback_data: "ordermenu:list" }],
        ],
      },
    });

    for (const item of attachmentItems) {
      try {
        const sent = await sendOrderAttachment(chat, item, Number(order.id));
        if (!sent && typeof item === "string" && item.startsWith("[not uploaded]")) {
          await tg("sendMessage", {
            chat_id: chat,
            text: "⚠️ الملف ده لم يتم رفعه من الموقع: " + item.replace("[not uploaded]", "").trim(),
          });
        }
      } catch (error) {
        console.error("Order attachment delivery failed:", error);
        await tg("sendMessage", {
          chat_id: chat,
          text: "⚠️ مقدرتش أفتح مرفقًا في الطلب #" + order.id + ". راجع صلاحيات Storage أو الملف نفسه.",
        });
      }
    }
  }
}


async function handleOrderAttachmentUpload(req: Request): Promise<Response> {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "apikey, authorization, content-type",
    "Cache-Control": "no-store",
  };
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...cors, "Content-Type": "application/json" } });
  if (!K) return new Response(JSON.stringify({ error: "Storage service is not configured" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return new Response(JSON.stringify({ error: "Missing file" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    if (!allowed.includes(file.type)) return new Response(JSON.stringify({ error: "Only JPG, PNG, WEBP, GIF, and PDF files are allowed" }), { status: 415, headers: { ...cors, "Content-Type": "application/json" } });
    if (file.size < 1 || file.size > 10 * 1024 * 1024) return new Response(JSON.stringify({ error: "File must be smaller than 10 MB" }), { status: 413, headers: { ...cors, "Content-Type": "application/json" } });

    const bucket = "order-attachments";
    const bucketCheck = await fetch(U + "/storage/v1/bucket/" + bucket, { headers: { apikey: K, Authorization: "Bearer " + K } });
    if (bucketCheck.status === 404) {
      const created = await fetch(U + "/storage/v1/bucket", {
        method: "POST",
        headers: { apikey: K, Authorization: "Bearer " + K, "Content-Type": "application/json" },
        body: JSON.stringify({ id: bucket, name: bucket, public: false, file_size_limit: 10485760, allowed_mime_types: allowed }),
      });
      if (!created.ok && created.status !== 409) {
        const detail = await created.text();
        throw new Error("Could not initialize attachment storage: " + detail.slice(0, 300));
      }
    } else if (!bucketCheck.ok) {
      throw new Error("Could not check attachment storage: " + bucketCheck.status);
    }

    const safeName = file.name.replace(/[^\\w.\\-]+/g, "_").slice(-80) || "attachment";
    const path = "orders/" + Date.now() + "-" + crypto.randomUUID().slice(0, 8) + "/" + safeName;
    const uploaded = await fetch(U + "/storage/v1/object/" + bucket + "/" + path.split("/").map(encodeURIComponent).join("/"), {
      method: "POST",
      headers: { apikey: K, Authorization: "Bearer " + K, "Content-Type": file.type, "x-upsert": "false" },
      body: file,
    });
    if (!uploaded.ok) {
      const detail = await uploaded.text();
      throw new Error("Storage upload failed (" + uploaded.status + "): " + detail.slice(0, 300));
    }
    return new Response(JSON.stringify({ path: bucket + "/" + path, name: safeName }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Order attachment upload failed:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Upload failed" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
}


async function handleSubmissionNotification(req: Request): Promise<Response> {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "apikey, authorization, content-type",
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
  };
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors });
  if (!T || !K) return new Response(JSON.stringify({ error: "Notification service is not configured" }), { status: 500, headers: cors });

  try {
    const input = await req.json();
    const type = String(input?.type || "");
    if (!["order", "review"].includes(type)) {
      return new Response(JSON.stringify({ error: "Invalid submission type" }), { status: 400, headers: cors });
    }

    const payload = input?.payload || {};
    const table = type === "order" ? "customer_orders" : "customer_reviews";
    const fields = type === "order"
      ? "id,customer_name,service,details,whatsapp,created_at"
      : "id,name,review,rating,status,created_at";
    const query = new URLSearchParams();
    query.set("select", fields);
    query.set("order", "created_at.desc");
    query.set("limit", "1");
    query.set("created_at", "gte." + new Date(Date.now() - 10 * 60 * 1000).toISOString());
    if (type === "order") {
      const customerName = String(payload.customer_name || "").trim();
      const service = String(payload.service || "").trim();
      const details = String(payload.details || "").trim();
      const whatsapp = String(payload.whatsapp || "").trim();
      if (customerName.length < 2 || service.length < 1 || details.length < 10 || whatsapp.length < 8) {
        return new Response(JSON.stringify({ error: "Invalid order payload" }), { status: 400, headers: cors });
      }
      query.set("customer_name", "eq." + customerName);
      query.set("service", "eq." + service);
      query.set("details", "eq." + details);
      query.set("whatsapp", "eq." + whatsapp);
      query.set("status", "eq.new");
    } else {
      const name = String(payload.name || "").trim();
      const review = String(payload.review || "").trim();
      const rating = Number(payload.rating);
      if (!name || name.length > 80 || review.length < 3 || review.length > 1000 || rating < 1 || rating > 5) {
        return new Response(JSON.stringify({ error: "Invalid review payload" }), { status: 400, headers: cors });
      }
      query.set("name", "eq." + name);
      query.set("review", "eq." + review);
      query.set("rating", "eq." + rating);
      query.set("status", "eq.pending");
    }
    const fetched = await db(table + "?" + query.toString());
    const rows = await fetched.json();
    if (!fetched.ok || !Array.isArray(rows) || !rows[0]) {
      return new Response(JSON.stringify({ error: "Submission not found in recent records" }), { status: 404, headers: cors });
    }
    const item = rows[0];
    const id = Number(item.id);
    const created = Date.parse(item.created_at || "");
    if (!Number.isFinite(created) || Date.now() - created > 10 * 60 * 1000 || created > Date.now() + 60 * 1000) {
      return new Response(JSON.stringify({ error: "Submission is outside the notification window" }), { status: 403, headers: cors });
    }

    // Reuse the existing sessions table as a one-time delivery guard for each new row.
    const guardId = -6000000000 - id - (type === "review" ? 1000000000 : 0);
    const guard = await db("bot_sessions", {
      method: "POST",
      headers: { ...H, Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify({ chat_id: guardId, state: "notification_sent", payload: { type, id }, updated_at: new Date().toISOString() }),
    });
    const guardRows = await guard.json().catch(() => []);
    if (!guard.ok) throw new Error("Could not reserve notification: " + JSON.stringify(guardRows));
    if (!Array.isArray(guardRows) || guardRows.length === 0) {
      return new Response(JSON.stringify({ ok: true, duplicate: true }), { status: 200, headers: cors });
    }

    const createdAt = new Date(item.created_at).toLocaleString("ar-EG", { timeZone: "Africa/Cairo" });
    let message = "";
    if (type === "order") {
      message = "🛎️ طلب تصميم جديد وصل للموقع!\n\n" +
        "🆔 رقم الطلب: #" + item.id + "\n" +
        "👤 الاسم: " + String(item.customer_name || "—").slice(0, 100) + "\n" +
        "🎨 الخدمة: " + String(item.service || "—").slice(0, 120) + "\n" +
        "📱 واتساب: " + String(item.whatsapp || "—").slice(0, 30) + "\n" +
        "📝 التفاصيل: " + String(item.details || "—").slice(0, 1800) + "\n\n" +
        "🕒 الوقت: " + createdAt;
    } else {
      const rating = Math.max(0, Math.min(5, Number(item.rating) || 0));
      const stars = "⭐".repeat(rating) + "☆".repeat(5 - rating);
      message = "💬 تعليق جديد محتاج مراجعة!\\n\\n" +
        "🆔 رقم التعليق: #" + item.id + "\\n" +
        "👤 الاسم: " + String(item.name || "—").slice(0, 100) + "\\n" +
        stars + " (" + rating + "/5)\\n" +
        "📝 التعليق: " + String(item.review || "—").slice(0, 2500) + "\\n" +
        "📌 الحالة: " + String(item.status || "pending") + "\\n\\n" +
        "🕒 الوقت: " + createdAt;
    }
    const reviewMarkup = type === "review"
      ? {
        inline_keyboard: [
          [
            { text: "✅ موافقة ونشر", callback_data: "reviewapprove:" + item.id },
            { text: "🚫 رفض", callback_data: "reviewreject:" + item.id },
          ],
          [{ text: "🗑️ حذف نهائي", callback_data: "reviewdel:" + item.id }],
          [{ text: "🕒 فتح قائمة المراجعة", callback_data: "reviewlist:pending" }],
        ],
      }
      : undefined;
    const sent = await tg("sendMessage", {
      chat_id: A,
      text: message,
      ...(reviewMarkup ? { reply_markup: reviewMarkup } : {}),
    });
    if (!sent?.ok) {
      await db("bot_sessions?chat_id=eq." + guardId, { method: "DELETE" });
      throw new Error("Telegram notification failed");
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
  } catch (error) {
    console.error("Submission notification failed:", error);
    return new Response(JSON.stringify({ error: "Notification failed" }), { status: 500, headers: cors });
  }
}

Deno.serve(async (req) => {
  const requestUrl = new URL(req.url);
  if (requestUrl.searchParams.get("action") === "upload-order-attachment") return handleOrderAttachmentUpload(req);
  if (requestUrl.searchParams.get("action") === "notify-submission") return handleSubmissionNotification(req);
  if (req.method === "GET") {
    const requestUrl = new URL(req.url);
    if (requestUrl.searchParams.get("maintenance-status") === "1") {
      try {
        const response = await db("bot_sessions?chat_id=eq." + MAINTENANCE_CHAT_ID + "&select=state&limit=1");
        const rows = await response.json();
        const enabled = response.ok && Array.isArray(rows) && rows[0]?.state === "maintenance_on";
        return new Response(JSON.stringify({ enabled }), {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store, max-age=0" },
        });
      } catch {
        return new Response(JSON.stringify({ enabled: false }), {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store, max-age=0" },
        });
      }
    }
    const result = await tg("setWebhook", {
      url: U + "/functions/v1/telegram-bot",
      drop_pending_updates: false,
    });

    return new Response(JSON.stringify({ ok: true, webhook: result }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let update: any;

  try {
    update = await req.json();
  } catch {
    return new Response("OK");
  }

  const message = update.message;
  const callback = update.callback_query;

  const chat = Number(
    message?.chat?.id ?? callback?.message?.chat?.id ?? 0,
  );

  if (chat !== A) {
    return new Response("OK");
  }

  try {
    // =========================
    // التعامل مع أزرار التفاعل
    // =========================

    if (callback) {
      await tg("answerCallbackQuery", {
        callback_query_id: callback.id,
      });

      const data = String(callback.data || "");

      if (data === "maintenance:menu") {
        const response = await db("bot_sessions?chat_id=eq." + MAINTENANCE_CHAT_ID + "&select=state&limit=1");
        const rows = await response.json();
        const enabled = response.ok && Array.isArray(rows) && rows[0]?.state === "maintenance_on";
        await tg("sendMessage", {
          chat_id: chat,
          text: "🛠️ إعدادات وضع الصيانة\n\nالحالة الحالية: " + (enabled ? "🔴 مفعّل — الموقع مخفي عن الزوار" : "🟢 متوقف — الموقع يعمل بشكل طبيعي") + "\n\nاختار الإجراء:",
          reply_markup: { inline_keyboard: [
            [{ text: "🔴 تفعيل وضع الصيانة", callback_data: "maintenance:on" }],
            [{ text: "🟢 إيقاف وضع الصيانة", callback_data: "maintenance:off" }],
            [{ text: "🔄 تحديث الحالة", callback_data: "maintenance:menu" }],
          ] },
        });
        return new Response("OK");
      }

      if (data === "maintenance:on" || data === "maintenance:off") {
        const enabled = data === "maintenance:on";
        const response = await set(MAINTENANCE_CHAT_ID, enabled ? "maintenance_on" : "maintenance_off", { enabled });
        if (!response.ok) throw new Error(await response.text());
        await tg("sendMessage", {
          chat_id: chat,
          text: enabled
            ? "🔴 تم تفعيل وضع الصيانة. الموقع هيعرض صفحة الصيانة للزوار خلال ثواني."
            : "🟢 تم إيقاف وضع الصيانة. الموقع رجع متاح للزوار خلال ثواني.",
          reply_markup: { inline_keyboard: [[{ text: "⚙️ إدارة وضع الصيانة", callback_data: "maintenance:menu" }]] },
        });
        return new Response("OK");
      }

      // فتح قائمة تعديل العمل
      if (data.startsWith("edit:")) {
        const id = Number(data.slice(5));

        const response = await db(
          "works?id=eq." + id + "&select=id,title,is_visible",
        );
        const rows = await response.json();

        if (!rows[0]) {
          await menu(chat, "❌ العمل غير موجود.");
          return new Response("OK");
        }

        const work = rows[0];

        await tg("sendMessage", {
          chat_id: chat,
          text: "✏️ #" + id + " — " + work.title +
            "\n\nاختار التعديل:",
          reply_markup: {
            inline_keyboard: [
              [{
                text: "📝 تعديل الاسم",
                callback_data: "ef:title:" + id,
              }],
              [
                {
                  text: "🖼️ تغيير الصورة",
                  callback_data: "ef:image:" + id,
                },
                {
                  text: "🗑️ إزالة الصورة",
                  callback_data: "ef:remove:" + id,
                },
              ],
              [{
                text: "🏷️ تعديل التصنيف",
                callback_data: "ef:category:" + id,
              }],
              [{
                text: "📄 تعديل الوصف",
                callback_data: "ef:description:" + id,
              }],
              [{
                text: work.is_visible ? "🔴 إخفاء" : "🟢 إظهار",
                callback_data: "ef:visibility:" + id,
              }],
            ],
          },
        });

        return new Response("OK");
      }

      // تنفيذ تعديل العمل
      if (data.startsWith("ef:")) {
        const parts = data.split(":");
        const field = parts[1];
        const id = Number(parts[2]);

        if (field === "remove" || field === "visibility") {
          const response = await db(
            "works?id=eq." + id + "&select=is_visible",
          );
          const rows = await response.json();

          if (!rows[0]) {
            return new Response("OK");
          }

          const body = field === "remove"
            ? { image_url: "" }
            : { is_visible: !rows[0].is_visible };

          const result = await db("works?id=eq." + id, {
            method: "PATCH",
            headers: { ...H, Prefer: "return=minimal" },
            body: JSON.stringify(body),
          });

          if (!result.ok) {
            throw new Error(await result.text());
          }

          await menu(chat, "✅ تم تنفيذ التعديل على العمل #" + id);
          return new Response("OK");
        }

        await set(chat, "edit_" + field, { id });

        const prompts: Record<string, string> = {
          image: "📸 ابعت الصورة الجديدة.",
          title: "📝 ابعت الاسم الجديد.",
          category: "🏷️ اختار التصنيف الجديد.",
          description: "📄 ابعت الوصف الجديد، أو اكتب لا لمسحه.",
        };

        await tg("sendMessage", {
          chat_id: chat,
          text: prompts[field] || "ابعت التعديل الجديد.",
          reply_markup: field === "category" ? catKeyboard : undefined,
        });

        return new Response("OK");
      }

      // حذف عمل
      if (data.startsWith("del:")) {
        const id = Number(data.slice(4));

        const result = await db("works?id=eq." + id, {
          method: "DELETE",
        });

        if (!result.ok) {
          throw new Error(await result.text());
        }

        await menu(chat, "🗑️ تم حذف العمل #" + id + " بنجاح.");
      }

      // التنقل داخل أقسام طلبات العملاء
      if (data === "ordermenu:list") {
        await showOrderMenu(chat);
        return new Response("OK");
      } else if (data === "ordermenu:home") {
        await menu(chat);
        return new Response("OK");
      } else if (data.startsWith("orderlist:")) {
        const status = data.slice("orderlist:".length);
        if (!(status in orderFilters)) return new Response("OK");
        await showOrders(chat, status);
        return new Response("OK");
      }

      // تحديث حالة طلب عميل
      else if (data.startsWith("orderstatus:")) {
        const parts = data.split(":");
        const id = Number(parts[1]);
        const status = parts[2];

        if (!(status in orderStatuses) && status !== "accepted") {
          return new Response("OK");
        }

        const result = await db("customer_orders?id=eq." + id, {
          method: "PATCH",
          headers: { ...H, Prefer: "return=minimal" },
          body: JSON.stringify({
            status,
            updated_at: new Date().toISOString(),
          }),
        });

        if (!result.ok) {
          throw new Error(await result.text());
        }

        await tg("sendMessage", {
          chat_id: chat,
          text: "✅ تم تحديث حالة الطلب #" + id + " إلى " +
            (status === "accepted" ? orderFilters.accepted : orderStatuses[status]),
          reply_markup: {
            inline_keyboard: [[{ text: "↩️ أقسام الطلبات", callback_data: "ordermenu:list" }]],
          },
        });
      }

      // حذف طلب عميل
      else if (data.startsWith("orderdel:")) {
        const id = Number(data.slice("orderdel:".length));

        const result = await db("customer_orders?id=eq." + id, {
          method: "DELETE",
        });

        if (!result.ok) {
          throw new Error(await result.text());
        }

        await menu(chat, "🗑️ تم حذف طلب العميل #" + id + ".");
      }

      // الموافقة على تعليق
      else if (data.startsWith("reviewapprove:")) {
        const id = Number(data.slice("reviewapprove:".length));

        const result = await db("customer_reviews?id=eq." + id, {
          method: "PATCH",
          headers: { ...H, Prefer: "return=minimal" },
          body: JSON.stringify({ status: "approved" }),
        });

        if (!result.ok) {
          throw new Error(await result.text());
        }

        await menu(
          chat,
          "✅ تمت الموافقة على التعليق #" + id + "، وسيظهر للزوار.",
        );
      }

      // رفض تعليق
      else if (data.startsWith("reviewreject:")) {
        const id = Number(data.slice("reviewreject:".length));

        const result = await db("customer_reviews?id=eq." + id, {
          method: "PATCH",
          headers: { ...H, Prefer: "return=minimal" },
          body: JSON.stringify({ status: "rejected" }),
        });

        if (!result.ok) {
          throw new Error(await result.text());
        }

        await menu(chat, "🚫 تم رفض التعليق #" + id + ".");
      }

      // إرجاع تعليق للمراجعة
      else if (data.startsWith("reviewpending:")) {
        const id = Number(data.slice("reviewpending:".length));

        const result = await db("customer_reviews?id=eq." + id, {
          method: "PATCH",
          headers: { ...H, Prefer: "return=minimal" },
          body: JSON.stringify({ status: "pending" }),
        });

        if (!result.ok) {
          throw new Error(await result.text());
        }

        await menu(
          chat,
          "🔄 تم إرجاع التعليق #" + id + " إلى قائمة المراجعة.",
        );
      }

      // حذف تعليق
      else if (data.startsWith("reviewdel:")) {
        const id = Number(data.slice("reviewdel:".length));

        const result = await db("customer_reviews?id=eq." + id, {
          method: "DELETE",
        });

        if (!result.ok) {
          throw new Error(await result.text());
        }

        await menu(chat, "🗑️ تم حذف التعليق #" + id + " بنجاح.");
      }

      return new Response("OK");
    }

    const text = String(message?.text || "").trim();

    // =========================
    // القائمة الرئيسية
    // =========================

    if (text === "/start" || text === "/menu") {
      await clear(chat);
      await menu(chat);
      return new Response("OK");
    }

    // =========================
    // وضع الصيانة
    // =========================

    if (text === "🛠️ وضع الصيانة") {
      const response = await db("bot_sessions?chat_id=eq." + MAINTENANCE_CHAT_ID + "&select=state&limit=1");
      const rows = await response.json();
      const enabled = response.ok && Array.isArray(rows) && rows[0]?.state === "maintenance_on";
      await tg("sendMessage", {
        chat_id: chat,
        text: "🛠️ إعدادات وضع الصيانة\n\nالحالة الحالية: " + (enabled ? "🔴 مفعّل — الموقع مخفي عن الزوار" : "🟢 متوقف — الموقع يعمل بشكل طبيعي") + "\n\nاختار الإجراء:",
        reply_markup: { inline_keyboard: [
          [{ text: "🔴 تفعيل وضع الصيانة", callback_data: "maintenance:on" }],
          [{ text: "🟢 إيقاف وضع الصيانة", callback_data: "maintenance:off" }],
          [{ text: "🔄 تحديث الحالة", callback_data: "maintenance:menu" }],
        ] },
      });
      return new Response("OK");
    }

    // =========================
    // طلبات العملاء
    // =========================

    if (text === "🛒 طلبات العملاء") {
      await showOrderMenu(chat);
      return new Response("OK");
    }

    // =========================
    // الإحصائيات
    // =========================

    if (text === "📊 الإحصائيات") {
      const worksResponse = await db(
        "works?select=id,title,category,is_visible,created_at&order=created_at.desc",
      );

      const reviewsResponse = await db(
        "customer_reviews?select=id,name,review,rating,status,created_at&order=created_at.desc",
      );

      const worksData = await worksResponse.json();
      const reviewsData = await reviewsResponse.json();

      const works = Array.isArray(worksData) ? worksData : [];
      const reviews = Array.isArray(reviewsData) ? reviewsData : [];

      const visible = works.filter((work: any) => work.is_visible).length;
      const pending = reviews.filter(
        (review: any) => review.status === "pending",
      ).length;
      const approved = reviews.filter(
        (review: any) => review.status === "approved",
      ).length;

      const ratings = reviews.filter(
        (review: any) =>
          review.status === "approved" &&
          Number(review.rating) >= 1 &&
          Number(review.rating) <= 5,
      );

      const average = ratings.length
        ? (
          ratings.reduce(
            (sum: number, review: any) => sum + Number(review.rating),
            0,
          ) / ratings.length
        ).toFixed(1)
        : "—";

      const categories: Record<string, number> = {};

      for (const work of works) {
        const category = work.category || "بدون تصنيف";
        categories[category] = (categories[category] || 0) + 1;
      }

      const categoryText = Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .map(([category, count]) => "• " + category + ": " + count)
        .join("\n") || "• مفيش أعمال";

      const latestWork = works[0];
      const latestReview = reviews[0];

      const report =
        "📊 إحصائيات Hesham Portfolio\n\n" +
        "🎨 إجمالي الأعمال: " + works.length +
        "\n🟢 الأعمال الظاهرة: " + visible +
        "\n💬 إجمالي التعليقات: " + reviews.length +
        "\n🕒 قيد المراجعة: " + pending +
        "\n✅ تعليقات معتمدة: " + approved +
        "\n⭐ متوسط التقييم المعتمد: " + average + "/5 (" +
        ratings.length + " تقييم)" +
        "\n\n🏷️ توزيع الأعمال حسب التصنيف:\n" + categoryText +
        "\n\n🆕 آخر عمل: " +
        (latestWork ? latestWork.title : "مفيش أعمال") +
        "\n💬 آخر تعليق: " +
        (latestReview
          ? latestReview.name + " — " +
            String(latestReview.review || "").slice(0, 120)
          : "مفيش تعليقات");

      await menu(chat, report);
      return new Response("OK");
    }

    // =========================
    // تعديل عمل
    // =========================

    if (text === "✏️ تعديل عمل") {
      const response = await db("works?select=id,title&order=id.desc");
      const rows = await response.json();

      if (!Array.isArray(rows) || rows.length === 0) {
        await menu(chat, "✏️ مفيش أعمال لتعديلها.");
        return new Response("OK");
      }

      await tg("sendMessage", {
        chat_id: chat,
        text: "✏️ اختار العمل اللي عايز تعدله:",
        reply_markup: {
          inline_keyboard: rows.map((work: any) => [{
            text: "✏️ #" + work.id + " — " + work.title,
            callback_data: "edit:" + work.id,
          }]),
        },
      });

      return new Response("OK");
    }

    // =========================
    // إضافة عمل
    // =========================

    if (text === "➕ إضافة عمل") {
      await set(chat, "image");
      await tg("sendMessage", {
        chat_id: chat,
        text: "📸 ابعت صورة العمل دلوقتي.",
      });
      return new Response("OK");
    }

    // =========================
    // عرض الأعمال
    // =========================

    if (text === "📋 عرض الأعمال") {
      const response = await db(
        "works?select=id,title,category,is_visible&order=id.desc",
      );

      const rows = await response.json();

      if (!Array.isArray(rows)) {
        await menu(chat, "⚠️ مقدرتش أجيب الأعمال من قاعدة البيانات.");
        return new Response("OK");
      }

      const report = rows.length
        ? "📋 أعمالك:\n\n" + rows.map((work: any) =>
          "#" + work.id + " — " + work.title +
          "\n🏷️ " + (work.category || "بدون تصنيف") +
          " | " + (work.is_visible ? "🟢 ظاهر" : "🔴 مخفي")
        ).join("\n\n")
        : "📋 مفيش أعمال مضافة لسه.";

      await menu(chat, report);
      return new Response("OK");
    }

    // =========================
    // حذف عمل
    // =========================

    if (text === "🗑️ حذف عمل") {
      const response = await db("works?select=id,title&order=id.desc");
      const rows = await response.json();

      if (!Array.isArray(rows) || rows.length === 0) {
        await menu(chat, "🗑️ مفيش أعمال لحذفها.");
      } else {
        await tg("sendMessage", {
          chat_id: chat,
          text: "🗑️ اختار العمل اللي عايز تحذفه:",
          reply_markup: {
            inline_keyboard: rows.map((work: any) => [{
              text: "🗑️ #" + work.id + " — " + work.title,
              callback_data: "del:" + work.id,
            }]),
          },
        });
      }

      return new Response("OK");
    }

    // =========================
    // التعليقات قيد المراجعة
    // =========================

    if (text === "🕒 تعليقات قيد المراجعة") {
      const response = await db(
        "customer_reviews?select=id,name,review,rating,status,created_at&status=eq.pending&order=created_at.asc",
      );

      const rows = await response.json();

      if (!response.ok || !Array.isArray(rows)) {
        await menu(
          chat,
          "⚠️ مقدرتش أجيب التعليقات. راجع إعدادات قاعدة البيانات.",
        );
        return new Response("OK");
      }

      if (rows.length === 0) {
        await menu(chat, "✅ مفيش تعليقات قيد المراجعة حاليًا.");
        return new Response("OK");
      }

      await tg("sendMessage", {
        chat_id: chat,
        text: "💬 التعليقات قيد المراجعة (" + rows.length + ")",
      });

      for (const review of rows) {
        await tg("sendMessage", {
          chat_id: chat,
          text:
            "💬 تعليق #" + review.id +
            "\n\n👤 الاسم: " + String(review.name ?? "") +
            "\n⭐ التقييم: " + String(review.rating ?? 5) + "/5" +
            "\n\n📝 التعليق:\n" + String(review.review ?? "") +
            "\n\n🕒 الحالة: قيد المراجعة",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "✅ موافقة ونشر",
                  callback_data: "reviewapprove:" + review.id,
                },
                {
                  text: "🚫 رفض",
                  callback_data: "reviewreject:" + review.id,
                },
              ],
              [{
                text: "🗑️ حذف نهائي",
                callback_data: "reviewdel:" + review.id,
              }],
            ],
          },
        });
      }

      return new Response("OK");
    }

    // =========================
    // التعليقات المنشورة
    // =========================

    if (text === "✅ تعليقات الموقع") {
      const response = await db(
        "customer_reviews?select=id,name,review,rating,status,created_at&status=eq.approved&order=created_at.desc",
      );

      const rows = await response.json();

      if (!response.ok || !Array.isArray(rows)) {
        await menu(
          chat,
          "⚠️ مقدرتش أجيب التعليقات المنشورة. راجع إعدادات قاعدة البيانات.",
        );
        return new Response("OK");
      }

      if (rows.length === 0) {
        await menu(chat, "📭 مفيش تعليقات معتمدة على الموقع حاليًا.");
        return new Response("OK");
      }

      await tg("sendMessage", {
        chat_id: chat,
        text: "✅ التعليقات المنشورة على الموقع (" + rows.length + ")",
      });

      for (const review of rows) {
        await tg("sendMessage", {
          chat_id: chat,
          text:
            "✅ تعليق منشور #" + review.id +
            "\n\n👤 الاسم: " + String(review.name ?? "") +
            "\n⭐ التقييم: " + String(review.rating ?? 5) + "/5" +
            "\n\n📝 التعليق:\n" + String(review.review ?? "") +
            "\n\n📢 الحالة: منشور على الموقع",
          reply_markup: {
            inline_keyboard: [
              [{
                text: "🔄 إرجاع للمراجعة وإخفاء",
                callback_data: "reviewpending:" + review.id,
              }],
              [{
                text: "🗑️ حذف نهائي",
                callback_data: "reviewdel:" + review.id,
              }],
            ],
          },
        });
      }

      return new Response("OK");
    }

    // =========================
    // متابعة جلسات إضافة/تعديل الأعمال
    // =========================

    const session = await sess(chat);

    if (String(session.state).startsWith("edit_")) {
      const field = session.state.slice(5);
      const id = Number(session.payload.id);

      if (field === "image" && message?.photo?.length) {
        const imageUrl = await upload(
          message.photo[message.photo.length - 1].file_id,
        );

        const result = await db("works?id=eq." + id, {
          method: "PATCH",
          headers: { ...H, Prefer: "return=minimal" },
          body: JSON.stringify({ image_url: imageUrl }),
        });

        if (!result.ok) {
          throw new Error(await result.text());
        }

        await clear(chat);
        await menu(chat, "✅ تم تغيير الصورة بنجاح.");
        return new Response("OK");
      }

      if (text) {
        if (field === "category" && !cats.includes(text)) {
          await tg("sendMessage", {
            chat_id: chat,
            text: "⚠️ اختار تصنيف من الأزرار الموجودة.",
            reply_markup: catKeyboard,
          });
          return new Response("OK");
        }

        const key = field === "title"
          ? "title"
          : field === "category"
          ? "category"
          : "description";

        const value = field === "description" && text === "لا" ? "" : text;
        const body: Record<string, string> = { [key]: value };

        const result = await db("works?id=eq." + id, {
          method: "PATCH",
          headers: { ...H, Prefer: "return=minimal" },
          body: JSON.stringify(body),
        });

        if (!result.ok) {
          throw new Error(await result.text());
        }

        await clear(chat);
        await menu(chat, "✅ تم تعديل العمل #" + id + " بنجاح.");
        return new Response("OK");
      }
    }

    if (session.state === "image" && message?.photo?.length) {
      const imageUrl = await upload(
        message.photo[message.photo.length - 1].file_id,
      );

      await set(chat, "title", { image_url: imageUrl });

      await tg("sendMessage", {
        chat_id: chat,
        text: "📝 تمام! الصورة وصلت. ابعت اسم العمل.",
      });

      return new Response("OK");
    }

    if (session.state === "title" && text) {
      await set(chat, "category", {
        ...session.payload,
        title: text,
      });

      await tg("sendMessage", {
        chat_id: chat,
        text: "🏷️ اختار تصنيف العمل من الـ16 خدمة:",
        reply_markup: catKeyboard,
      });

      return new Response("OK");
    }

    if (session.state === "category" && text) {
      if (!cats.includes(text)) {
        await tg("sendMessage", {
          chat_id: chat,
          text: "⚠️ اختار تصنيف من الأزرار الموجودة.",
          reply_markup: catKeyboard,
        });
        return new Response("OK");
      }

      await set(chat, "description", {
        ...session.payload,
        category: text,
      });

      await tg("sendMessage", {
        chat_id: chat,
        text: "✍️ اكتب وصف قصير، أو اكتب لا.",
      });

      return new Response("OK");
    }

    if (session.state === "description" && text) {
      const payload = {
        ...session.payload,
        description: text === "لا" ? "" : text,
      };

      await set(chat, "confirm", payload);

      await tg("sendMessage", {
        chat_id: chat,
        text:
          "✅ البيانات جاهزة.\n" +
          "الاسم: " + payload.title + "\n" +
          "التصنيف: " + payload.category + "\n" +
          "الوصف: " + (payload.description || "بدون وصف") +
          "\n\nاكتب حفظ أو إلغاء.",
      });

      return new Response("OK");
    }

    if (session.state === "confirm" && text === "حفظ") {
      const payload = session.payload;

      const result = await db("works", {
        method: "POST",
        headers: { ...H, Prefer: "return=minimal" },
        body: JSON.stringify({
          title: payload.title,
          category: payload.category,
          description: payload.description || "",
          image_url: payload.image_url,
          is_visible: true,
          is_featured: false,
          sort_order: 0,
        }),
      });

      if (!result.ok) {
        throw new Error(await result.text());
      }

      await clear(chat);
      await menu(chat, "🎉 تمت إضافة العمل بنجاح!");
      return new Response("OK");
    }

    if (text === "إلغاء") {
      await clear(chat);
      await menu(chat, "❌ تم الإلغاء.");
      return new Response("OK");
    }
  } catch (error) {
    console.error("Telegram bot error:", error);

    await tg("sendMessage", {
      chat_id: chat,
      text: "⚠️ حصل خطأ في البوت. جرّب تاني.",
    }).catch(() => {});
  }

  return new Response("OK");
});
