export type Case = {
    id: string;
    patient: {
      name: string;
      age: number;
      sex: string;
      chiefComplaint: string;
      symptoms: string[];
      smoker: boolean;
      immunocompromised: boolean;
    };
    imageFilename: string;
    predictions: {
      pneumothorax: number;
      pneumonia: number;
      nodule: number;
    } | null;
    triage: {
      level: "URGENT" | "REVIEW" | "ROUTINE";
      reason: string;
      flags: {
        pneumothorax: "low" | "review" | "urgent";
        pneumonia: "low" | "review" | "urgent";
        nodule: "low" | "review" | "urgent";
      };
    } | null;
    report: string | null;
    createdAt: string;
  };
  
  const cases = new Map<string, Case>();
  
  export function saveCase(c: Case) {
    cases.set(c.id, c);
  }
  
  export function getCase(id: string): Case | undefined {
    return cases.get(id);
  }
  
  export function getAllCases(): Case[] {
    return Array.from(cases.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }