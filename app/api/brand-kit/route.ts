// Brand Kit API.
//
// GET  → returns the signed-in user's brand kit (or null if unset).
// PUT  → updates it. Pro-only: free users can read but not write.
// DELETE → clears it.
//
// All endpoints require a session cookie. Free users hitting PUT get a
// 403 with a structured error so the client can surface a Pro upgrade
// prompt instead of a generic failure.

import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth";
import { sql } from "@/lib/db";
import { sanitizeBrandKit, type BrandKit } from "@/lib/brand-kit";

export const runtime = "nodejs";

type Row = { brand_kit: BrandKit | null; is_pro: boolean };

async function loadRow(userId: string): Promise<Row | null> {
  const rows = (await sql`
    SELECT brand_kit, is_pro
    FROM users
    WHERE id = ${userId}
  `) as Row[];
  return rows[0] ?? null;
}

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const row = await loadRow(session.userId);
    return NextResponse.json({ kit: row?.brand_kit ?? null });
  } catch (err) {
    console.error("/api/brand-kit GET failed", err);
    return NextResponse.json(
      { error: "server_error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const row = await loadRow(session.userId);
    if (!row?.is_pro) {
      return NextResponse.json(
        { error: "pro_required" },
        { status: 403 }
      );
    }

    const kit = sanitizeBrandKit(body);
    await sql`
      UPDATE users
      SET brand_kit = ${JSON.stringify(kit)}::jsonb,
          updated_at = now()
      WHERE id = ${session.userId}
    `;
    return NextResponse.json({ kit });
  } catch (err) {
    console.error("/api/brand-kit PUT failed", err);
    return NextResponse.json(
      { error: "server_error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    await sql`
      UPDATE users
      SET brand_kit = NULL,
          updated_at = now()
      WHERE id = ${session.userId}
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("/api/brand-kit DELETE failed", err);
    return NextResponse.json(
      { error: "server_error" },
      { status: 500 }
    );
  }
}
