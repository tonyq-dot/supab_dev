// Base design tokens
export const designTokens = {
  // Color palette
  colors: {
    // Primary colors
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
      950: '#082f49',
    },
    
    // Secondary colors
    secondary: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617',
    },
    
    // Semantic colors
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
      950: '#052e16',
    },
    
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      950: '#451a03',
    },
    
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
      950: '#450a0a',
    },
    
    // Neutral colors
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
      950: '#030712',
    },
  },
  
  // Typography
  typography: {
    fontFamilies: {
      sans: [
        'Inter',
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'Roboto',
        'Helvetica Neue',
        'Arial',
        'sans-serif',
      ],
      mono: [
        'JetBrains Mono',
        'Fira Code',
        'Monaco',
        'Consolas',
        'Liberation Mono',
        'Courier New',
        'monospace',
      ],
    },
    
    fontSizes: {
      xs: '0.75rem',     // 12px
      sm: '0.875rem',    // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
      '5xl': '3rem',     // 48px
      '6xl': '3.75rem',  // 60px
    },
    
    fontWeights: {
      thin: '100',
      extralight: '200',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900',
    },
    
    lineHeights: {
      none: '1',
      tight: '1.25',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
      loose: '2',
    },
    
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0em',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',
    },
  },
  
  // Spacing
  spacing: {
    px: '1px',
    0: '0px',
    0.5: '0.125rem',   // 2px
    1: '0.25rem',      // 4px
    1.5: '0.375rem',   // 6px
    2: '0.5rem',       // 8px
    2.5: '0.625rem',   // 10px
    3: '0.75rem',      // 12px
    3.5: '0.875rem',   // 14px
    4: '1rem',         // 16px
    5: '1.25rem',      // 20px
    6: '1.5rem',       // 24px
    7: '1.75rem',      // 28px
    8: '2rem',         // 32px
    9: '2.25rem',      // 36px
    10: '2.5rem',      // 40px
    11: '2.75rem',     // 44px
    12: '3rem',        // 48px
    14: '3.5rem',      // 56px
    16: '4rem',        // 64px
    20: '5rem',        // 80px
    24: '6rem',        // 96px
    28: '7rem',        // 112px
    32: '8rem',        // 128px
    36: '9rem',        // 144px
    40: '10rem',       // 160px
    44: '11rem',       // 176px
    48: '12rem',       // 192px
    52: '13rem',       // 208px
    56: '14rem',       // 224px
    60: '15rem',       // 240px
    64: '16rem',       // 256px
    72: '18rem',       // 288px
    80: '20rem',       // 320px
    96: '24rem',       // 384px
  },
  
  // Border radius
  borderRadius: {
    none: '0px',
    sm: '0.125rem',    // 2px
    DEFAULT: '0.25rem', // 4px
    md: '0.375rem',    // 6px
    lg: '0.5rem',      // 8px
    xl: '0.75rem',     // 12px
    '2xl': '1rem',     // 16px
    '3xl': '1.5rem',   // 24px
    full: '9999px',
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    none: '0 0 #0000',
  },
  
  // Z-index
  zIndex: {
    auto: 'auto',
    0: '0',
    10: '10',
    20: '20',
    30: '30',
    40: '40',
    50: '50',
    dropdown: '1000',
    sticky: '1020',
    fixed: '1030',
    modal: '1040',
    popover: '1050',
    tooltip: '1060',
    toast: '1070',
  },
  
  // Transitions
  transitions: {
    duration: {
      75: '75ms',
      100: '100ms',
      150: '150ms',
      200: '200ms',
      300: '300ms',
      500: '500ms',
      700: '700ms',
      1000: '1000ms',
    },
    
    timing: {
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
  
  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
};

// Semantic color mappings
export const semanticColors = {
  // Background colors
  background: {
    primary: 'var(--color-gray-50)',
    secondary: 'var(--color-gray-100)',
    tertiary: 'var(--color-gray-200)',
    inverse: 'var(--color-gray-900)',
  },
  
  // Text colors
  text: {
    primary: 'var(--color-gray-900)',
    secondary: 'var(--color-gray-600)',
    tertiary: 'var(--color-gray-500)',
    inverse: 'var(--color-gray-50)',
    link: 'var(--color-primary-600)',
    linkHover: 'var(--color-primary-700)',
  },
  
  // Border colors
  border: {
    primary: 'var(--color-gray-200)',
    secondary: 'var(--color-gray-300)',
    focus: 'var(--color-primary-500)',
    error: 'var(--color-error-500)',
  },
  
  // Status colors
  status: {
    success: 'var(--color-success-500)',
    warning: 'var(--color-warning-500)',
    error: 'var(--color-error-500)',
    info: 'var(--color-primary-500)',
  },
};

// Component-specific tokens
export const componentTokens = {
  // Button tokens
  button: {
    borderRadius: designTokens.borderRadius.md,
    fontWeight: designTokens.typography.fontWeights.medium,
    transition: `all ${designTokens.transitions.duration[150]} ${designTokens.transitions.timing.out}`,
    
    sizes: {
      sm: {
        fontSize: designTokens.typography.fontSizes.sm,
        padding: `${designTokens.spacing[2]} ${designTokens.spacing[3]}`,
        height: designTokens.spacing[9],
      },
      md: {
        fontSize: designTokens.typography.fontSizes.sm,
        padding: `${designTokens.spacing[2.5]} ${designTokens.spacing[4]}`,
        height: designTokens.spacing[10],
      },
      lg: {
        fontSize: designTokens.typography.fontSizes.base,
        padding: `${designTokens.spacing[3]} ${designTokens.spacing[6]}`,
        height: designTokens.spacing[11],
      },
    },
  },
  
  // Input tokens
  input: {
    borderRadius: designTokens.borderRadius.md,
    fontSize: designTokens.typography.fontSizes.sm,
    fontWeight: designTokens.typography.fontWeights.normal,
    padding: `${designTokens.spacing[2.5]} ${designTokens.spacing[3]}`,
    height: designTokens.spacing[10],
    transition: `all ${designTokens.transitions.duration[150]} ${designTokens.transitions.timing.out}`,
    
    states: {
      default: {
        borderColor: semanticColors.border.primary,
        backgroundColor: semanticColors.background.primary,
      },
      focus: {
        borderColor: semanticColors.border.focus,
        boxShadow: `0 0 0 3px ${designTokens.colors.primary[100]}`,
      },
      error: {
        borderColor: semanticColors.border.error,
        boxShadow: `0 0 0 3px ${designTokens.colors.error[100]}`,
      },
    },
  },
  
  // Card tokens
  card: {
    borderRadius: designTokens.borderRadius.lg,
    padding: designTokens.spacing[6],
    backgroundColor: semanticColors.background.primary,
    borderColor: semanticColors.border.primary,
    boxShadow: designTokens.shadows.sm,
    
    variants: {
      elevated: {
        boxShadow: designTokens.shadows.md,
      },
      outline: {
        borderWidth: '2px',
      },
    },
  },
  
  // Badge tokens
  badge: {
    borderRadius: designTokens.borderRadius.full,
    fontSize: designTokens.typography.fontSizes.xs,
    fontWeight: designTokens.typography.fontWeights.semibold,
    padding: `${designTokens.spacing[1]} ${designTokens.spacing[2.5]}`,
    
    variants: {
      default: {
        backgroundColor: designTokens.colors.primary[500],
        color: designTokens.colors.primary[50],
      },
      secondary: {
        backgroundColor: designTokens.colors.secondary[500],
        color: designTokens.colors.secondary[50],
      },
      success: {
        backgroundColor: designTokens.colors.success[500],
        color: designTokens.colors.success[50],
      },
      warning: {
        backgroundColor: designTokens.colors.warning[500],
        color: designTokens.colors.warning[50],
      },
      error: {
        backgroundColor: designTokens.colors.error[500],
        color: designTokens.colors.error[50],
      },
    },
  },
  
  // Navigation tokens
  navigation: {
    height: designTokens.spacing[16],
    padding: `${designTokens.spacing[4]} ${designTokens.spacing[6]}`,
    backgroundColor: semanticColors.background.primary,
    borderColor: semanticColors.border.primary,
    boxShadow: designTokens.shadows.sm,
    
    mobile: {
      height: designTokens.spacing[14],
      padding: `${designTokens.spacing[3]} ${designTokens.spacing[4]}`,
    },
  },
  
  // Modal tokens
  modal: {
    borderRadius: designTokens.borderRadius.xl,
    padding: designTokens.spacing[6],
    backgroundColor: semanticColors.background.primary,
    boxShadow: designTokens.shadows.xl,
    backdropColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: designTokens.zIndex.modal,
  },
  
  // Dropdown tokens
  dropdown: {
    borderRadius: designTokens.borderRadius.md,
    padding: designTokens.spacing[1],
    backgroundColor: semanticColors.background.primary,
    borderColor: semanticColors.border.primary,
    boxShadow: designTokens.shadows.lg,
    zIndex: designTokens.zIndex.dropdown,
    
    item: {
      padding: `${designTokens.spacing[2]} ${designTokens.spacing[3]}`,
      borderRadius: designTokens.borderRadius.sm,
      fontSize: designTokens.typography.fontSizes.sm,
      transition: `all ${designTokens.transitions.duration[150]} ${designTokens.transitions.timing.out}`,
    },
  },
  
  // Toast tokens
  toast: {
    borderRadius: designTokens.borderRadius.md,
    padding: designTokens.spacing[4],
    backgroundColor: semanticColors.background.primary,
    borderColor: semanticColors.border.primary,
    boxShadow: designTokens.shadows.lg,
    zIndex: designTokens.zIndex.toast,
    
    variants: {
      success: {
        backgroundColor: designTokens.colors.success[50],
        borderColor: designTokens.colors.success[200],
        color: designTokens.colors.success[800],
      },
      warning: {
        backgroundColor: designTokens.colors.warning[50],
        borderColor: designTokens.colors.warning[200],
        color: designTokens.colors.warning[800],
      },
      error: {
        backgroundColor: designTokens.colors.error[50],
        borderColor: designTokens.colors.error[200],
        color: designTokens.colors.error[800],
      },
    },
  },
};

// Layout tokens
export const layoutTokens = {
  // Container sizes
  container: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  
  // Grid system
  grid: {
    columns: 12,
    gutter: designTokens.spacing[6],
    
    breakpoints: {
      sm: {
        columns: 12,
        gutter: designTokens.spacing[4],
      },
      md: {
        columns: 12,
        gutter: designTokens.spacing[6],
      },
      lg: {
        columns: 12,
        gutter: designTokens.spacing[8],
      },
    },
  },
  
  // Common layout patterns
  section: {
    padding: `${designTokens.spacing[8]} ${designTokens.spacing[4]}`,
    
    lg: {
      padding: `${designTokens.spacing[12]} ${designTokens.spacing[6]}`,
    },
  },
  
  // Sidebar
  sidebar: {
    width: '256px',
    backgroundColor: semanticColors.background.primary,
    borderColor: semanticColors.border.primary,
    
    collapsed: {
      width: '64px',
    },
  },
  
  // Header
  header: {
    height: designTokens.spacing[16],
    backgroundColor: semanticColors.background.primary,
    borderColor: semanticColors.border.primary,
    zIndex: designTokens.zIndex.sticky,
  },
  
  // Footer
  footer: {
    backgroundColor: semanticColors.background.secondary,
    borderColor: semanticColors.border.primary,
    padding: `${designTokens.spacing[8]} ${designTokens.spacing[4]}`,
  },
};

// Animation tokens
export const animationTokens = {
  // Common animations
  fadeIn: {
    keyframes: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    duration: designTokens.transitions.duration[200],
    timing: designTokens.transitions.timing.out,
  },
  
  slideInUp: {
    keyframes: {
      from: { transform: 'translateY(20px)', opacity: 0 },
      to: { transform: 'translateY(0)', opacity: 1 },
    },
    duration: designTokens.transitions.duration[300],
    timing: designTokens.transitions.timing.out,
  },
  
  slideInDown: {
    keyframes: {
      from: { transform: 'translateY(-20px)', opacity: 0 },
      to: { transform: 'translateY(0)', opacity: 1 },
    },
    duration: designTokens.transitions.duration[300],
    timing: designTokens.transitions.timing.out,
  },
  
  scaleIn: {
    keyframes: {
      from: { transform: 'scale(0.95)', opacity: 0 },
      to: { transform: 'scale(1)', opacity: 1 },
    },
    duration: designTokens.transitions.duration[200],
    timing: designTokens.transitions.timing.out,
  },
  
  spin: {
    keyframes: {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
    },
    duration: designTokens.transitions.duration[1000],
    timing: designTokens.transitions.timing.linear,
    iterationCount: 'infinite',
  },
  
  pulse: {
    keyframes: {
      '0%, 100%': { opacity: 1 },
      '50%': { opacity: 0.5 },
    },
    duration: designTokens.transitions.duration[1000],
    timing: designTokens.transitions.timing['in-out'],
    iterationCount: 'infinite',
  },
  
  bounce: {
    keyframes: {
      '0%, 100%': { transform: 'translateY(-25%)', animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)' },
      '50%': { transform: 'translateY(0)', animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)' },
    },
    duration: designTokens.transitions.duration[1000],
    timing: designTokens.transitions.timing['in-out'],
    iterationCount: 'infinite',
  },
};

const allTokens = {
  designTokens,
  semanticColors,
  componentTokens,
  layoutTokens,
  animationTokens,
};

export default allTokens;