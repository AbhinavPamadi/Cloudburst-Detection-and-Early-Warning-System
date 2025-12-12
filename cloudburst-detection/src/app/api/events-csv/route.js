import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "labeled_events.csv");
    const fileContent = fs.readFileSync(filePath, "utf-8");
    
    return new NextResponse(fileContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=labeled_events.csv",
      },
    });
  } catch (error) {
    console.error("Error reading CSV file:", error);
    return NextResponse.json(
      { error: "Failed to read CSV file" },
      { status: 500 }
    );
  }
}

