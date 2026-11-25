import { config } from "../config.js";

const GRAPH = "https://graph.facebook.com/v21.0";

async function graph(path: string, params: Record<string, string>) {
  const res = await fetch(`${GRAPH}/${path}`, { method: "POST", body: new URLSearchParams(params) });
  const data: any = await res.json();
  if (!res.ok || data.error) throw new Error(`Graph ${path}: ${JSON.stringify(data.error ?? data)}`);
  return data;
}

/** Facebook Page photo post (first image) or multi-photo post. */
export async function postFacebook(caption: string, imageUrls: string[]) {
  if (!config.social.pageToken) return { dev: true, network: "facebook" };
  const token = config.social.pageToken;
  if (imageUrls.length <= 1) {
    return graph(`${config.social.pageId}/photos`, { url: imageUrls[0], caption, access_token: token });
  }
  const ids = [];
  for (const url of imageUrls) {
    const r = await graph(`${config.social.pageId}/photos`, { url, published: "false", access_token: token });
    ids.push(r.id);
  }
  const attached: Record<string, string> = {};
  ids.forEach((id, i) => (attached[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id })));
  return graph(`${config.social.pageId}/feed`, { message: caption, ...attached, access_token: token });
}

/** Instagram Business account: single image or carousel (2-10). Images must be public HTTPS URLs. */
export async function postInstagram(caption: string, imageUrls: string[]) {
  if (!config.social.pageToken || !config.social.igId) return { dev: true, network: "instagram" };
  const token = config.social.pageToken, ig = config.social.igId;
  let creationId: string;
  if (imageUrls.length === 1) {
    creationId = (await graph(`${ig}/media`, { image_url: imageUrls[0], caption, access_token: token })).id;
  } else {
    const children = [];
    for (const url of imageUrls.slice(0, 10)) {
      children.push((await graph(`${ig}/media`, { image_url: url, is_carousel_item: "true", access_token: token })).id);
    }
    creationId = (await graph(`${ig}/media`, { media_type: "CAROUSEL", children: children.join(","), caption, access_token: token })).id;
  }
  return graph(`${ig}/media_publish`, { creation_id: creationId, access_token: token });
}

/**
 * TikTok Content Posting API: photo carousel post pulled from our (verified) media domain.
 * Note: until the app passes TikTok's audit, posts are restricted to SELF_ONLY visibility.
 */
export async function postTikTok(title: string, description: string, imageUrls: string[], privacy = "PUBLIC_TO_EVERYONE") {
  if (!config.social.tiktokToken) return { dev: true, network: "tiktok" };
  const res = await fetch("https://open.tiktokapis.com/v2/post/publish/content/init/", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.social.tiktokToken}`, "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify({
      post_info: { title: title.slice(0, 90), description: description.slice(0, 4000), privacy_level: privacy, disable_comment: false, auto_add_music: true },
      source_info: { source: "PULL_FROM_URL", photo_cover_index: 0, photo_images: imageUrls.slice(0, 35) },
      post_mode: "DIRECT_POST",
      media_type: "PHOTO",
    }),
  });
  const data: any = await res.json();
  if (!res.ok || (data.error && data.error.code !== "ok")) throw new Error(`TikTok: ${JSON.stringify(data.error ?? data)}`);
  return data;
}
