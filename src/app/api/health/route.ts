import { NextResponse } from "next/server";

import { getSupabaseEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const checkedAt = new Date().toISOString();

  try {
    const { anonKey, url } = getSupabaseEnv();
    const response = await fetch(
      `${url}/rest/v1/visa_eligibility_rules?select=visa_type&limit=1`,
      {
        headers: {
          apikey: anonKey,
          authorization: `Bearer ${anonKey}`,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          checkedAt,
          service: "uniwork",
          status: "degraded",
          supabase: {
            ok: false,
            status: response.status,
          },
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      checkedAt,
      service: "uniwork",
      status: "ok",
      supabase: {
        ok: true,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        checkedAt,
        service: "uniwork",
        status: "error",
        supabase: {
          ok: false,
        },
        error:
          error instanceof Error
            ? error.message
            : "Unknown health check failure",
      },
      { status: 500 },
    );
  }
}
