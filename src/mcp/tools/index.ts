import { doctorTool, type McpTool } from "./doctor.js";

export const tools: McpTool[] = [doctorTool];

export function resolveDoctorTool(name: string): McpTool | undefined {
  return tools.find((tool) => tool.name === name);
}
