import { NextResponse } from "next/server";
import Anthropic, { toFile } from "@anthropic-ai/sdk";

export const runtime = "nodejs";

// Beta flag required to use the Files API (upload once, reference by file_id).
const FILES_BETA = "files-api-2025-04-14";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const uploaded = await client.beta.files.upload({
      file: await toFile(Buffer.from(arrayBuffer), file.name, {
        type: file.type || "application/octet-stream"
      }),
      betas: [FILES_BETA]
    });

    return NextResponse.json({ fileId: uploaded.id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
