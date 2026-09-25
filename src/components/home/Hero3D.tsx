import React, { Component, type ReactNode } from "react";
import DynamicSmartFarmHero from "./DynamicSmartFarmHero";
import HeroFallback from "./hero-fallback";

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class HeroErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("[HeroVisual] Visual rendering issue caught silently:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export interface Hero3DProps {
  mousePos?: { x: number; y: number };
  weatherCondition?: string;
  cropLabel?: string;
}

/**
 * Hero3D / DynamicSmartFarmHero Component.
 *
 * Renders a cinematic, photorealistic Indian agricultural smart-farming visual
 * that dynamically adapts to local time of day (morning/day/evening/night),
 * real-time weather conditions (clear/rain/thunderstorm/fog/hot), and selected crop
 * (soybean/wheat/paddy). Zero blocky 3D, zero empty boxes.
 */
export const Hero3D: React.FC<Hero3DProps> = ({ mousePos, weatherCondition, cropLabel }) => {
  return (
    <HeroErrorBoundary fallback={<HeroFallback weatherCondition={weatherCondition} />}>
      <DynamicSmartFarmHero
        mousePos={mousePos}
        weatherCondition={weatherCondition}
        cropLabel={cropLabel}
      />
    </HeroErrorBoundary>
  );
};

export default Hero3D;