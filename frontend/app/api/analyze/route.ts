import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const response = await fetch(
      "http://127.0.0.1:8000/api/analyze",
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.text();

    return new NextResponse(data, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") ||
          "application/json",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        detail: "Unable to connect to FastAPI backend.",
      },
      { status: 500 }
    );
  }
}