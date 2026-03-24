// src/lib/piani.ts
export const PIANI = {
  free: {
    max_schede: 1,
    max_giorni_per_scheda: 3,
    progressi: false,
    checkin: false,
    alimentare: false,
    analytics: false,
    share_overlay: true,
  },
  pro: {
    max_schede: Infinity,
    max_giorni_per_scheda: Infinity,
    progressi: true,
    checkin: true,
    alimentare: true,
    analytics: true,
    share_overlay: true,
  },
}