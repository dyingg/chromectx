import { doctorTool, type McpTool } from "./doctor.js";
import { ragTool } from "./search.js";

export const tools: McpTool[] = [doctorTool, ragTool];

export function resolveTool(name: string): McpTool | undefined {
  return tools.find((tool) => tool.name === name);
}
