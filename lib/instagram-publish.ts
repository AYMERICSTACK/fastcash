import { getInstagramConnection } from "@/lib/instagram-oauth";

type InstagramApiError = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    error_user_title?: string;
    error_user_msg?: string;
  };
};

type InstagramCreateResponse = InstagramApiError & { id?: string };
type InstagramPublishResponse = InstagramApiError & { id?: string };

function apiMessage(payload: InstagramApiError, fallback: string) {
  return payload.error?.error_user_msg
    || payload.error?.message
    || payload.error?.error_user_title
    || fallback;
}

async function postInstagramForm<T extends InstagramApiError>(url: string, body: URLSearchParams) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as T;
  if (!response.ok || payload.error) {
    throw new Error(apiMessage(payload, `Instagram API: erreur ${response.status}.`));
  }
  return payload;
}

export async function publishInstagramImage(input: {
  imageUrl: string;
  caption?: string;
  format: "post" | "story";
}) {
  const connection = await getInstagramConnection();
  if (!connection.connected || !connection.accessToken || !connection.userId) {
    throw new Error("INSTAGRAM_NOT_CONNECTED");
  }
  if (connection.expiresAt && connection.expiresAt.getTime() <= Date.now()) {
    throw new Error("INSTAGRAM_TOKEN_EXPIRED");
  }

  const createBody = new URLSearchParams({
    image_url: input.imageUrl,
    access_token: connection.accessToken,
  });

  if (input.format === "story") {
    createBody.set("media_type", "STORIES");
  } else if (input.caption?.trim()) {
    createBody.set("caption", input.caption.trim().slice(0, 2200));
  }

  const created = await postInstagramForm<InstagramCreateResponse>(
    `https://graph.instagram.com/v26.0/${encodeURIComponent(connection.userId)}/media`,
    createBody,
  );
  if (!created.id) throw new Error("Instagram n’a pas renvoyé d’identifiant de média.");

  const published = await postInstagramForm<InstagramPublishResponse>(
    `https://graph.instagram.com/v26.0/${encodeURIComponent(connection.userId)}/media_publish`,
    new URLSearchParams({
      creation_id: created.id,
      access_token: connection.accessToken,
    }),
  );
  if (!published.id) throw new Error("Instagram n’a pas confirmé la publication.");

  let permalink: string | null = null;
  try {
    const params = new URLSearchParams({ fields: "permalink", access_token: connection.accessToken });
    const response = await fetch(`https://graph.instagram.com/v26.0/${encodeURIComponent(published.id)}?${params.toString()}`, { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { permalink?: string };
      permalink = payload.permalink || null;
    }
  } catch {
    // La publication est déjà réussie : l'URL publique est uniquement un confort d'interface.
  }

  return {
    mediaId: published.id,
    username: connection.username || "fastcash.ge",
    permalink,
  };
}
