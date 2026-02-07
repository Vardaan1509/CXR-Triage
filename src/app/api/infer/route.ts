import { NextRequest, NextResponse } from "next/server";

const MODEL_SERVER = process.env.MODEL_SERVER_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const imageBuffer = await req.arrayBuffer();
    const blob = new Blob([imageBuffer]);

    const form = new FormData();
    form.append("file", blob, "xray.png");

    const res = await fetch(`${MODEL_SERVER}/predict`, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Model server error" }));
      return NextResponse.json(err, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to reach model server: ${message}` },
      { status: 502 }
    );
  }
}