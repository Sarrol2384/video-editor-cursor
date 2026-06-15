import { NextRequest } from "next/server";
import { withAuth, jsonOk } from "@/lib/api-utils";
import {
  routeModel,
  getModelsForKind,
  type GenerationKind,
  type VideoMode,
} from "@/lib/models";

export async function GET(req: NextRequest) {
  return withAuth(async () => {
    const { searchParams } = new URL(req.url);
    const kind = (searchParams.get("kind") || "video") as GenerationKind;
    const aspectRatio = searchParams.get("aspectRatio") || undefined;
    const duration = parseInt(searchParams.get("duration") || "6", 10);
    const resolution = searchParams.get("resolution") || undefined;
    const priority = (searchParams.get("priority") || "balanced") as
      | "cost"
      | "speed"
      | "quality"
      | "balanced";
    const videoMode = (searchParams.get("videoMode") || undefined) as
      | VideoMode
      | undefined;

    const models = getModelsForKind(kind, videoMode);
    const routing = routeModel({
      kind,
      aspectRatio: aspectRatio as never,
      duration,
      resolution: resolution as never,
      priority,
      videoMode,
    });

    return jsonOk({ models, routing });
  });
}
