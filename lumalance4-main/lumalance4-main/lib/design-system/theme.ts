import { designTokens, semanticColors, componentTokens, layoutTokens, animationTokens } from './tokens';

// Helper function to flatten nested objects into CSS variables
const flattenObject = (obj: Record<string, any>, prefix = ''): Record<string, string> => {
  return Object.keys(obj).reduce((acc: Record<string, string>, k: string) => {
    const pre = prefix.length ? prefix + '-' : '';
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(acc, flattenObject(obj[k], pre + k));
    } else {
      acc[pre + k] = obj[k];
    }
    return acc;
  }, {});
};

// Generate base CSS variables from design tokens
const baseVariables = {
  ...flattenObject(designTokens.colors, 'color'),
  ...flattenObject(designTokens.typography.fontFamilies, 'font'),
  ...flattenObject(designTokens.typography.fontSizes, 'font-size'),
  ...flattenObject(designTokens.typography.fontWeights, 'font-weight'),
  ...flattenObject(designTokens.typography.lineHeights, 'line-height'),
  ...flattenObject(designTokens.typography.letterSpacing, 'letter-spacing'),
  ...flattenObject(designTokens.spacing, 'spacing'),
  ...flattenObject(designTokens.borderRadius, 'border-radius'),
  ...flattenObject(designTokens.shadows, 'shadow'),
  ...flattenObject(designTokens.zIndex, 'z-index'),
  ...flattenObject(designTokens.transitions.duration, 'transition-duration'),
  ...flattenObject(designTokens.transitions.timing, 'transition-timing'),
  ...flattenObject(designTokens.breakpoints, 'breakpoint'),
};

// Light theme semantic color variables
const lightThemeColors = {
  // Background
  'background-primary': designTokens.colors.gray[50],
  'background-secondary': designTokens.colors.gray[100],
  'background-tertiary': designTokens.colors.gray[200],
  'background-inverse': designTokens.colors.gray[900],
  
  // Text
  'text-primary': designTokens.colors.gray[900],
  'text-secondary': designTokens.colors.gray[600],
  'text-tertiary': designTokens.colors.gray[500],
  'text-inverse': designTokens.colors.gray[50],
  'text-link': designTokens.colors.primary[600],
  'text-link-hover': designTokens.colors.primary[700],
  
  // Border
  'border-primary': designTokens.colors.gray[200],
  'border-secondary': designTokens.colors.gray[300],
  'border-focus': designTokens.colors.primary[500],
  'border-error': designTokens.colors.error[500],
  
  // Status
  'status-success': designTokens.colors.success[500],
  'status-warning': designTokens.colors.warning[500],
  'status-error': designTokens.colors.error[500],
  'status-info': designTokens.colors.primary[500],
};

// Dark theme semantic color variables
const darkThemeColors = {
  // Background
  'background-primary': designTokens.colors.secondary[900],
  'background-secondary': designTokens.colors.secondary[800],
  'background-tertiary': designTokens.colors.secondary[700],
  'background-inverse': designTokens.colors.gray[50],
  
  // Text
  'text-primary': designTokens.colors.gray[50],
  'text-secondary': designTokens.colors.gray[400],
  'text-tertiary': designTokens.colors.gray[500],
  'text-inverse': designTokens.colors.secondary[900],
  'text-link': designTokens.colors.primary[400],
  'text-link-hover': designTokens.colors.primary[300],
  
  // Border
  'border-primary': designTokens.colors.secondary[700],
  'border-secondary': designTokens.colors.secondary[600],
  'border-focus': designTokens.colors.primary[500],
  'border-error': designTokens.colors.error[500],
  
  // Status
  'status-success': designTokens.colors.success[400],
  'status-warning': designTokens.colors.warning[400],
  'status-error': designTokens.colors.error[400],
  'status-info': designTokens.colors.primary[400],
};

// Function to convert a flat object to a CSS variables string
const toCssVariables = (variables: Record<string, string>): string => {
  return Object.entries(variables)
    .map(([key, value]) => `--${key}: ${value};`)
    .join('\n');
};

// Generate CSS for themes
export const themeCss = `
:root {
  /* Base structural tokens */
  ${toCssVariables(baseVariables)}

  /* Light theme (default) */
  ${toCssVariables(lightThemeColors)}
}

[data-theme='dark'] {
  ${toCssVariables(darkThemeColors)}
}
`;

// Export the themes and tokens for use in other parts of the app (e.g., Tailwind config)
export const themes = {
  light: lightThemeColors,
  dark: darkThemeColors,
};

export const allTokens = {
  ...designTokens,
  semanticColors,
  componentTokens,
  layoutTokens,
  animationTokens,
}; 