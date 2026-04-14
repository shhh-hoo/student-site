export function resolvePreferredBlankId(blankOrder = [], candidateBlankIds = []) {
  const normalizedBlankOrder = Array.isArray(blankOrder) ? blankOrder.filter(Boolean) : [];

  if (!normalizedBlankOrder.length) {
    return "";
  }

  const normalizedCandidates = Array.isArray(candidateBlankIds)
    ? candidateBlankIds
    : [candidateBlankIds];

  for (const candidateBlankId of normalizedCandidates) {
    if (normalizedBlankOrder.includes(candidateBlankId)) {
      return candidateBlankId;
    }
  }

  return normalizedBlankOrder[0];
}

export function resolveActiveBlankId(
  blankOrder = [],
  pendingFocusBlankId = "",
  currentBlankId = "",
) {
  return resolvePreferredBlankId(blankOrder, [pendingFocusBlankId, currentBlankId]);
}
