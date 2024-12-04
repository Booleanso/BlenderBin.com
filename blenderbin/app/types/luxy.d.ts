declare interface Window {
    luxy?: {
      init: (options: {
        wrapper: string;
        wrapperSpeed: number;
      }) => void;
    };
  }