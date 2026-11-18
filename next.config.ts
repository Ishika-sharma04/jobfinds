import type { NextConfig } from 'next';
export default (phase: string): NextConfig => ({
  poweredByHeader: false,
  distDir: process.env.NEXT_DIST_DIR || (phase === 'phase-development-server' ? '.next-dev' : '.next')
});
