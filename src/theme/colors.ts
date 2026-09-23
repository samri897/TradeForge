/** TradingView-inspired dark theme */
export const colors = {
  bg: {
    primary: '#0B0E11',
    secondary: '#131722',
    tertiary: '#1E222D',
    elevated: '#2A2E39',
    input: '#1C2030',
  },
  border: {
    subtle: '#1E222D',
    default: '#2A2E39',
    strong: '#363A45',
    accent: '#2962FF',
  },
  text: {
    primary: '#D1D4DC',
    secondary: '#B2B5BE',
    muted: '#787B86',
    inverse: '#0B0E11',
    link: '#2962FF',
  },
  accent: {
    blue: '#2962FF',
    blueHover: '#1E53E5',
    cyan: '#00BCD4',
    purple: '#7E57C2',
  },
  candle: {
    up: '#26A69A',
    upWick: '#26A69A',
    down: '#EF5350',
    downWick: '#EF5350',
    wick: '#B2B5BE',
  },
  chart: {
    grid: '#1E222D',
    crosshair: '#758696',
    crosshairLabel: '#2962FF',
    volumeUp: 'rgba(38, 166, 154, 0.3)',
    volumeDown: 'rgba(239, 83, 80, 0.3)',
  },
  status: {
    success: '#26A69A',
    warning: '#FF9800',
    error: '#EF5350',
    info: '#2962FF',
  },
  editor: {
    bg: '#1E1E1E',
    lineHighlight: '#2A2A2A',
    selection: '#264F78',
    keyword: '#569CD6',
    string: '#CE9178',
    number: '#B5CEA8',
    comment: '#6A9955',
    function: '#DCDCAA',
  },
} as const;

export type Colors = typeof colors;
