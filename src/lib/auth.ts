import { supabase } from "./supabase";

// Extracts Supabase user id from Authorization header (Bearer <token>).
export async function getDoctorIdFromReq(req: Request): Promise<string | null> {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.split(" ")[1] : null;
    if (!token) return null;

    const { data, error } = await supabase.auth.getUser(token as string);
    if (error || !data?.user) return null;
    return data.user.id;
  } catch (err) {
    console.error("auth verify error", err);
    return null;
  }
}

// Returns the user's email from the Authorization header, or a fallback string.
export async function getDoctorEmailFromReq(req: Request): Promise<string> {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.split(" ")[1] : null;
    if (!token) return "anonymous";

    const { data, error } = await supabase.auth.getUser(token as string);
    if (error || !data?.user) return "anonymous";
    return data.user.email || data.user.id;
  } catch {
    return "anonymous";
  }
}
