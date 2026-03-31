import { doctorTool, type McpTool } from "./doctor.js";
import { searchTool } from "./search.js";

export const tools: McpTool[] = [doctorTool, searchTool];

export function resolveTool(name: string): McpTool | undefined {
  return tools.find((tool) => tool.name === name);
}
