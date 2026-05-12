export type HostelType = "BOYS" | "GIRLS";

export interface WardenHostelSummary {
  id: string;
  name: string;
  type: HostelType;
}
