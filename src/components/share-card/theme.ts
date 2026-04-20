export function getCardTheme(tema: 'dark' | 'light') {
  const d = tema === 'dark'
  return {
    text:           d ? '#ffffff'                       : '#111111',
    textSub:        d ? 'rgba(255,255,255,0.55)'        : 'rgba(0,0,0,0.55)',
    textMuted:      d ? 'rgba(255,255,255,0.35)'        : 'rgba(0,0,0,0.35)',
    titleBorder:    d ? 'white'                         : '#111111',
    divider:        d ? 'rgba(255,255,255,0.18)'        : 'rgba(0,0,0,0.12)',
    dividerDashed:  d ? 'rgba(255,255,255,0.35)'        : 'rgba(0,0,0,0.2)',
    bgKpi:          d ? 'rgba(255,255,255,0.06)'        : 'rgba(0,0,0,0.04)',
    borderKpi:      d ? 'rgba(255,255,255,0.15)'        : 'rgba(0,0,0,0.1)',
    bgGlass:        d ? 'rgba(0,0,0,0.42)'              : 'rgba(255,255,255,0.75)',
    borderGlass:    d ? 'rgba(255,255,255,0.15)'        : 'rgba(0,0,0,0.1)',
    bgPill:         d ? 'rgba(0,0,0,0.40)'              : 'rgba(255,255,255,0.65)',
    borderPill:     d ? 'rgba(255,255,255,0.12)'        : 'rgba(0,0,0,0.08)',
    bgChip:         d ? 'rgba(255,255,255,0.14)'        : 'rgba(0,0,0,0.07)',
    borderChip:     d ? 'rgba(255,255,255,0.25)'        : 'rgba(0,0,0,0.12)',
    gradHero:       d ? 'linear-gradient(180deg,#fff 0%,#fff 50%,rgba(255,255,255,0.75) 100%)'
                      : 'linear-gradient(180deg,#111 0%,#111 50%,rgba(17,17,17,0.75) 100%)',
    ringTrack:      d ? 'rgba(255,255,255,0.12)'        : 'rgba(0,0,0,0.1)',
    borderSideStat: d ? 'rgba(255,255,255,0.18)'        : 'rgba(0,0,0,0.12)',
    borderFooter:   d ? 'rgba(255,255,255,0.15)'        : 'rgba(0,0,0,0.1)',
    hiRowBorder:    d ? 'rgba(255,255,255,0.08)'        : 'rgba(0,0,0,0.07)',
  }
}
