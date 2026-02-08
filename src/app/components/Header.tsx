"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import supabaseClient from "@/lib/supabaseClient";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  // Hide the nav bar on the login page
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    let sub: any = null;
    (async () => {
      try {
        const { data: { session } = {} } = await (supabaseClient as any).auth.getSession();
        setEmail(session?.user?.email || null);
      } catch {
        setEmail(null);
      }

      try {
        const { data } = (supabaseClient as any).auth.onAuthStateChange((event: any, session: any) => {
          setEmail(session?.user?.email || null);
          if (event === "SIGNED_OUT") {
            try { router.replace("/login"); } catch {}
          }
        });
        sub = data?.subscription;
      } catch {}
    })();

    return () => {
      try { if (sub?.unsubscribe) sub.unsubscribe(); } catch {}
    };
  }, [router]);

  async function handleSignOut() {
    try {
      await (supabaseClient as any).auth.signOut();
    } catch (e) {
      console.error("sign out error", e);
    }
  }

  if (isLoginPage) return null;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-lg">CXR Triage</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/audit"
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Audit Log
          </Link>
          {email ? (
            <>
              <span className="text-sm text-gray-500 hidden sm:inline">
                {email.split("@")[0]}
              </span>
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
