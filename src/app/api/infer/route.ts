import { NextResponse } from "next/server";

export async function POST() {
  // Mock predictions — replace with real model proxy later
  const predictions = {
    pneumothorax: parseFloat((Math.random() * 0.9 + 0.05).toFixed(3)),
    pneumonia: parseFloat((Math.random() * 0.9 + 0.05).toFixed(3)),
    nodule: parseFloat((Math.random() * 0.9 + 0.05).toFixed(3)),
  };

  return NextResponse.json({ predictions });
}