/**
 * Stripe-inspired design tokens.
 *
 * Single source of truth for the inline-styled components (Onboarding, the chat
 * shell, the reports). Mirrors the CSS variables in styles/global.css so the
 * class-based and inline-styled parts of the app stay visually identical.
 *
 * Design language reference: deep-navy headings, a saturated Stripe purple as
 * the sole interactive colour, blue-tinted multi-layer shadows, conservative
 * 4–8px radii, and light (300) type for a calm, premium fintech feel.
 */

export const color = {
  // Brand / interactive
  purple: '#533afd',
  purpleHover: '#4434d4',
  purpleDeep: '#2e2b8c',
  purpleSoft: '#b9b9f9',
  purpleTint: 'rgba(83,58,253,0.06)',

  // Text
  heading: '#061b31', // deep navy - never pure black
  label: '#273951',
  body: '#64748d',

  // Surfaces
  white: '#ffffff',
  page: '#f6f9fc', // very light blue-grey canvas
  brandDark: '#1c1e54', // immersive dark sections

  // Borders
  border: '#e5edf5',
  borderSoftPurple: '#d6d9fc',

  // Status
  success: '#15be53',
  successText: '#108c3d',
  successBg: 'rgba(21,190,83,0.12)',
  successBorder: 'rgba(21,190,83,0.30)',
  danger: '#ea2261',
  dangerBg: 'rgba(234,34,97,0.10)',
  warning: '#9b6829',
  warningBg: 'rgba(155,104,41,0.10)',

  // Decorative accents (gradients only - never buttons/links)
  ruby: '#ea2261',
  magenta: '#f96bee',
} as const;

export const radius = {
  sm: '4px',
  md: '6px',
  lg: '8px',
} as const;

export const shadow = {
  // Soft ambient lift for standard cards.
  ambient: 'rgba(23,23,23,0.08) 0px 15px 35px 0px, rgba(23,23,23,0.06) 0px 5px 15px 0px',
  // Elevated - the signature blue-tinted multi-layer shadow.
  elevated: 'rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px',
  // Deep - modals and floating panels.
  deep: 'rgba(3,3,39,0.25) 0px 14px 21px -14px, rgba(0,0,0,0.1) 0px 8px 17px -8px',
} as const;

export const font = {
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
  mono: "'Source Code Pro', SFMono-Regular, Menlo, monospace",
  feature: '"ss01"' as const,
  tnum: '"tnum"' as const,
} as const;

/** Per-tier accent used for the tier badge. Purple-forward, on-brand. */
export const tierAccent: Record<string, { bg: string; fg: string }> = {
  beginner: { bg: 'rgba(83,58,253,0.10)', fg: color.purpleDeep },
  intermediate: { bg: 'rgba(21,190,83,0.12)', fg: color.successText },
  sophisticated: { bg: 'rgba(28,30,84,0.10)', fg: color.brandDark },
};
