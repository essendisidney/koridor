import { createClient, SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "org-documents";

let client: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Document storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server (Vercel env), then redeploy.",
    );
  }
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export function storageBucket() {
  return BUCKET;
}

export async function createSignedUploadUrl(path: string, expiresIn = 600) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);
  if (error) throw new Error(error.message);
  return { ...data, expiresIn };
}

export async function createSignedDownloadUrl(path: string, expiresIn = 300) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function uploadObject(
  path: string,
  body: Buffer | ArrayBuffer,
  contentType: string,
) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

export async function removeObject(path: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}

export function documentStoragePath(
  organisationId: string,
  documentId: string,
  fileName: string,
) {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return `${organisationId}/${documentId}/${safe}`;
}
