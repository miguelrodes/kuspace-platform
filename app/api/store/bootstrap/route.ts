import { NextResponse } from "next/server";
import { getBootstrapState } from "@/lib/db/store-repository";

export async function GET() {
  try {
    const state = await getBootstrapState();
    return NextResponse.json(state);
  } catch (error) {
    console.error("Failed to load DB bootstrap state", error);
    return NextResponse.json({ error: "Failed to load store bootstrap state" }, { status: 500 });
  }
}
