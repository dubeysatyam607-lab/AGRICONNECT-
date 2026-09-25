import React, { Component, type ReactNode } from "react";
import SmartFarmHeroVisual from "./SmartFarmHeroVisual";
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
}

/**
 * Hero3D / SmartFarmHeroVisual Component.
 *
 * Renders a cinematic, photorealistic Indian agricultural smart-farming visual
 * with seamless ambient looping animations, AI field scanning beams, and
 * integrated crop telemetry data points. Zero blocky 3D, zero empty boxes.
 */
export const Hero3D: React.FC<Hero3DProps> = ({ mousePos, weatherCondition }) => {
  return (
    <HeroErrorBoundary fallback={<HeroFallback weatherCondition={weatherCondition} />}>
      <SmartFarmHeroVisual mousePos={mousePos} weatherCondition={weatherCondition} />
    </HeroErrorBoundary>
  );
};

export default Hero3D;