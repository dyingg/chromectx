import { cancel, isCancel, type SelectOptions, select } from "@clack/prompts";
import { CliCancelError } from "../errors.js";

export type SelectOption<T> = SelectOptions<T>["options"][number];

export async function selectOne<T>(options: {
  maxItems?: number;
  message: string;
  options: SelectOption<T>[];
}): Promise<T> {
  const result = await select(options);

  if (isCancel(result)) {
    cancel();
    throw new CliCancelError();
  }

  return result as T;
}
