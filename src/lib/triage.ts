type Flag = "low" | "review" | "urgent";

type Predictions = {
  pneumothorax: number;
  pneumonia: number;
  nodule: number;
};

type TriageResult = {
  level: "URGENT" | "REVIEW" | "ROUTINE";
  reason: string;
  flags: {
    pneumothorax: Flag;
    pneumonia: Flag;
    nodule: Flag;
  };
};

function getFlag(probability: number): Flag {
  if (probability >= 0.6) return "urgent";
  if (probability >= 0.3) return "review";
  return "low";
}

export function computeTriage(predictions: Predictions): TriageResult {
  const flags = {
    pneumothorax: getFlag(predictions.pneumothorax),
    pneumonia: getFlag(predictions.pneumonia),
    nodule: getFlag(predictions.nodule),
  };

  const urgentConditions = Object.entries(flags)
    .filter(([, flag]) => flag === "urgent")
    .map(([name]) => name);

  const reviewConditions = Object.entries(flags)
    .filter(([, flag]) => flag === "review")
    .map(([name]) => name);

  if (urgentConditions.length > 0) {
    return {
      level: "URGENT",
      reason: `High probability detected for: ${urgentConditions.join(", ")}`,
      flags,
    };
  }

  if (reviewConditions.length > 0) {
    return {
      level: "REVIEW",
      reason: `Moderate probability detected for: ${reviewConditions.join(", ")}`,
      flags,
    };
  }

  return {
    level: "ROUTINE",
    reason: "All conditions below review threshold",
    flags,
  };
}