export interface PermissionStatus {
  name: string;
  status: "manual-check";
}

export function getPermissionStatuses(): PermissionStatus[] {
  return [
    {
      name: "accessibility",
      status: "manual-check",
    },
    {
      name: "screen-recording",
      status: "manual-check",
    },
  ];
}
