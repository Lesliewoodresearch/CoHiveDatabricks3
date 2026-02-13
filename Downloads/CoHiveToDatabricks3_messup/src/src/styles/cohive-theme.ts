/**
 * CoHive Design System
 * Centralized design tokens for consistent theming
 */

// ============================================================================
// COLOR PALETTE
// ============================================================================

export const colors = {
  // Primary brand colors
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
  },
  
  // Hex states
  hex: {
    completed: '#10b981', // green-500
    active: '#3b82f6',     // blue-500
    upcoming: '#94a3b8',   // gray-400
    disabled: '#e2e8f0',   // gray-200
  },
  
  // Status colors
  status: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  
  // Neutral grays
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
  },
};

// ============================================================================
// STEP COLORS - Individual hex colors for each workflow step
// ============================================================================

export const stepColors = {
  // Fixed steps
  Launch: '#3b82f6',      // blue-500 - RENAMED from Enter
  Action: '#10b981',      // green-500
  
  // Optional steps (repeatable)
  'External Experts': '#8b5cf6',     // purple-500 - RENAMED from Research
  'Panel Homes': '#ec4899',          // pink-500 - RENAMED from Panelist
  'Buyers': '#f59e0b',               // amber-500 - RENAMED from Consumers
  'Competitors': '#ef4444',          // red-500
  'Knowledge Base': '#06b6d4',       // cyan-500 - RENAMED from Wisdom
  'Test Against Segments': '#14b8a6', // teal-500 - RENAMED from Grade
  
  // Legacy names (for backward compatibility)
  Enter: '#3b82f6',
  Research: '#8b5cf6',
  Luminaries: '#6366f1',   // indigo-500
  Panelist: '#ec4899',
  Consumers: '#f59e0b',
  Colleagues: '#84cc16',   // lime-500
  'Cultural Voices': '#f97316', // orange-500
  'Social Voices': '#0ea5e9',   // sky-500
  Wisdom: '#06b6d4',
  Grade: '#14b8a6',
};

// ============================================================================
// HEXAGON DIMENSIONS
// ============================================================================

export const hexagon = {
  sizes: {
    small: {
      width: 80,
      height: 46,
      fontSize: '0.75rem',
      padding: '0.5rem',
    },
    medium: {
      width: 120,
      height: 69,
      fontSize: '0.875rem',
      padding: '0.75rem',
    },
    large: {
      width: 160,
      height: 92,
      fontSize: '1rem',
      padding: '1rem',
    },
  },
  
  // Hex shape SVG path (for consistent rendering)
  path: 'M 50,0 L 93.3,25 L 93.3,75 L 50,100 L 6.7,75 L 6.7,25 Z',
  
  // Border widths
  border: {
    default: 2,
    active: 3,
    hover: 3,
  },
  
  // Shadow styles
  shadow: {
    default: '0 2px 4px rgba(0, 0, 0, 0.1)',
    hover: '0 4px 8px rgba(0, 0, 0, 0.15)',
    active: '0 6px 12px rgba(0, 0, 0, 0.2)',
  },
};

// ============================================================================
// SPACING SCALE
// ============================================================================

export const spacing = {
  xs: '0.25rem',  // 4px
  sm: '0.5rem',   // 8px
  md: '1rem',     // 16px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
  '2xl': '3rem',  // 48px
  '3xl': '4rem',  // 64px
};

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  fontFamily: {
    sans: "'Nunito Sans', ui-sans-serif, system-ui, sans-serif",
    mono: "'Fira Code', ui-monospace, monospace",
  },
  
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },
  
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// ============================================================================
// ANIMATION
// ============================================================================

export const animation = {
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
  
  easing: {
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

// ============================================================================
// BREAKPOINTS
// ============================================================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get color for a specific step
 */
export function getStepColor(stepName: string): string {
  return stepColors[stepName as keyof typeof stepColors] || colors.hex.upcoming;
}

/**
 * Get hex state styles based on status
 */
export function getHexStateStyles(status: 'completed' | 'active' | 'upcoming' | 'disabled') {
  const stateColors = {
    completed: colors.hex.completed,
    active: colors.hex.active,
    upcoming: colors.hex.upcoming,
    disabled: colors.hex.disabled,
  };
  
  return {
    borderColor: stateColors[status],
    opacity: status === 'disabled' ? 0.5 : 1,
    cursor: status === 'disabled' ? 'not-allowed' : 'pointer',
  };
}

/**
 * Convert hex color to rgba with opacity
 */
export function hexToRgba(hex: string, alpha: number = 1): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Get responsive hex size based on viewport
 */
export function getResponsiveHexSize(viewportWidth: number): 'small' | 'medium' | 'large' {
  if (viewportWidth < 768) return 'small';
  if (viewportWidth < 1024) return 'medium';
  return 'large';
}

// ============================================================================
// Z-INDEX SCALE
// ============================================================================

export const zIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
};

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const borderRadius = {
  none: '0',
  sm: '0.125rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  full: '9999px',
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  colors,
  stepColors,
  hexagon,
  spacing,
  typography,
  animation,
  breakpoints,
  zIndex,
  borderRadius,
  getStepColor,
  getHexStateStyles,
  hexToRgba,
  getResponsiveHexSize,
};
