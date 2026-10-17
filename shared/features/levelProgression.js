export const XP_PER_LEVEL = 100;
export const EARLY_LEVEL_THRESHOLDS = Object.freeze([0, 30, 75]);

export const xpThresholdForLevel = level => {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  return safeLevel <= EARLY_LEVEL_THRESHOLDS.length
    ? EARLY_LEVEL_THRESHOLDS[safeLevel - 1]
    : EARLY_LEVEL_THRESHOLDS[EARLY_LEVEL_THRESHOLDS.length - 1] + (safeLevel - EARLY_LEVEL_THRESHOLDS.length) * XP_PER_LEVEL;
};

export const levelFor = xp => {
  const total = Math.max(0, Number(xp) || 0);
  if (total < EARLY_LEVEL_THRESHOLDS[1]) return 1;
  if (total < EARLY_LEVEL_THRESHOLDS[2]) return 2;
  return EARLY_LEVEL_THRESHOLDS.length + Math.floor((total - EARLY_LEVEL_THRESHOLDS[2]) / XP_PER_LEVEL);
};

export const levelProgress = xp => {
  const level = levelFor(xp);
  const start = xpThresholdForLevel(level);
  const next = xpThresholdForLevel(level + 1);
  return { level, xp_in_level: Math.max(0, (Number(xp) || 0) - start), xp_for_level: next - start };
};
