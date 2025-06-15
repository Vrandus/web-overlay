export interface OverlayConfig {
  id: string;
  name: string;
  url: string;
  wsUri?: string;
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  opacity: number;
  clickThrough: boolean;
  alwaysOnTop: boolean;
}

export interface GlobalConfig {
  overlays: OverlayConfig[];
  globalSettings: {
    startWithSystem: boolean;
    defaultOpacity: number;
    defaultClickThrough: boolean;
  };
}

export const DEFAULT_CONFIG: GlobalConfig = {
  overlays: [],
  globalSettings: {
    startWithSystem: false,
    defaultOpacity: 0.9,
    defaultClickThrough: true
  }
}; 