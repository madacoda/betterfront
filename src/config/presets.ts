import { ViewportDefinition, BetterFrontConfig } from '../types/index.js';

export const STANDARD_VIEWPORTS: Record<string, ViewportDefinition> = {
  foldable: {
    name: 'Samsung Galaxy Fold (Cover)',
    width: 280,
    height: 653,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true
  },
  mobile_compact: {
    name: 'iPhone SE (Compact Mobile)',
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  },
  mobile_standard: {
    name: 'iPhone 14/15/16 (Modern Mobile)',
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true
  },
  mobile_android: {
    name: 'Pixel 8 / Galaxy S23 (Android)',
    width: 412,
    height: 915,
    deviceScaleFactor: 2.6,
    isMobile: true,
    hasTouch: true
  },
  tablet_portrait: {
    name: 'iPad Air (Tablet Portrait)',
    width: 820,
    height: 1180,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  },
  desktop_laptop: {
    name: 'Standard Laptop Display',
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false
  },
  desktop_fhd: {
    name: 'Desktop Full HD (1080p)',
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false
  }
};

export function getPresetConfig(preset: 'production-gate' | 'fast-smoke' | 'comprehensive-deep', targetUrl: string): BetterFrontConfig {
  switch (preset) {
    case 'fast-smoke':
      return {
        targetUrl,
        preset: 'fast-smoke',
        browserEngine: 'chromium',
        concurrency: 1,
        viewports: [STANDARD_VIEWPORTS.mobile_standard],
        anomalyChecks: {
          textOverlap: true,
          horizontalBleed: true,
          containerClipping: true,
          interactiveOcclusion: true,
          unsizedMedia: false,
          lowContrast: false,
          breakpointSweep: false,
          touchTargetSize: true,
          textZoom200Percent: false,
          a11yWcagViolations: false,
          layoutShifts: true,
          lighthouseCore: false,
          consoleExceptions: true,
          brokenNetworkRequests: true,
          brokenLinks: false
        },
        humanAgent: {
          enabled: true,
          persona: 'impatient-mobile',
          simulateMouseTrails: false,
          simulateTypingCadence: false,
          simulateScrollMomentum: true,
          maxInteractionsPerPage: 5
        },
        layoutEngine: {
          detectTextOverlap: true,
          detectHorizontalBleed: true,
          detectClipping: true,
          detectUnsizedMedia: false,
          detectLowContrast: false,
          minCollisionAreaPx: 12,
          enableAiVisionTriage: false,
          vlmProvider: 'mock'
        },
        recording: {
          recordVideo: false,
          recordTrace: false,
          captureScreenshots: true,
          highlightAnomalies: true,
          artifactsDir: './betterfront-artifacts'
        },
        performance: {
          trackRealtimeCls: true,
          runLighthouse: false,
          maxAllowedCls: 0.15,
          maxAllowedLcpMs: 3500,
          maxAllowedInpMs: 300
        },
        accessibility: {
          enabled: false,
          minTouchTargetPx: 44,
          test200PercentZoom: false,
          checkColorContrast: false
        },
        qualityGate: {
          minOverallScore: 75,
          failOnBlocker: true,
          blockOnConsoleErrors: true,
          blockOnHorizontalBleed: true,
          blockOnTextCollision: true,
          blockOnComponentOcclusion: true,
          blockOnBrokenLinks: false,
          blockOnUnsizedMedia: false
        },
        reporting: {
          outputHtml: './betterfront-report.html',
          outputJson: './betterfront-summary.json'
        }
      };

    case 'comprehensive-deep':
      return {
        targetUrl,
        preset: 'comprehensive-deep',
        browserEngine: 'chromium',
        concurrency: 3,
        viewports: [
          STANDARD_VIEWPORTS.foldable,
          STANDARD_VIEWPORTS.mobile_compact,
          STANDARD_VIEWPORTS.mobile_standard,
          STANDARD_VIEWPORTS.tablet_portrait,
          STANDARD_VIEWPORTS.desktop_laptop,
          STANDARD_VIEWPORTS.desktop_fhd
        ],
        anomalyChecks: {
          textOverlap: true,
          horizontalBleed: true,
          containerClipping: true,
          interactiveOcclusion: true,
          unsizedMedia: true,
          lowContrast: true,
          breakpointSweep: true,
          touchTargetSize: true,
          textZoom200Percent: true,
          a11yWcagViolations: true,
          layoutShifts: true,
          lighthouseCore: true,
          consoleExceptions: true,
          brokenNetworkRequests: true,
          brokenLinks: true
        },
        humanAgent: {
          enabled: true,
          persona: 'power-user',
          simulateMouseTrails: true,
          simulateTypingCadence: true,
          simulateScrollMomentum: true,
          maxInteractionsPerPage: 20
        },
        layoutEngine: {
          detectTextOverlap: true,
          detectHorizontalBleed: true,
          detectClipping: true,
          detectUnsizedMedia: true,
          detectLowContrast: true,
          minCollisionAreaPx: 10,
          enableAiVisionTriage: true,
          vlmProvider: 'mock'
        },
        recording: {
          recordVideo: true,
          recordTrace: true,
          captureScreenshots: true,
          highlightAnomalies: true,
          artifactsDir: './betterfront-artifacts'
        },
        performance: {
          trackRealtimeCls: true,
          runLighthouse: true,
          maxAllowedCls: 0.08,
          maxAllowedLcpMs: 2000,
          maxAllowedInpMs: 180
        },
        accessibility: {
          enabled: true,
          minTouchTargetPx: 44,
          test200PercentZoom: true,
          checkColorContrast: true
        },
        qualityGate: {
          minOverallScore: 90,
          failOnBlocker: true,
          blockOnConsoleErrors: true,
          blockOnHorizontalBleed: true,
          blockOnTextCollision: true,
          blockOnComponentOcclusion: true,
          blockOnBrokenLinks: true,
          blockOnUnsizedMedia: true
        },
        reporting: {
          outputHtml: './betterfront-report.html',
          outputJson: './betterfront-summary.json'
        }
      };

    case 'production-gate':
    default:
      return {
        targetUrl,
        preset: 'production-gate',
        browserEngine: 'chromium',
        concurrency: 3,
        viewports: [
          STANDARD_VIEWPORTS.mobile_standard,
          STANDARD_VIEWPORTS.tablet_portrait,
          STANDARD_VIEWPORTS.desktop_fhd
        ],
        anomalyChecks: {
          textOverlap: true,
          horizontalBleed: true,
          containerClipping: true,
          interactiveOcclusion: true,
          unsizedMedia: true,
          lowContrast: true,
          breakpointSweep: false,
          touchTargetSize: true,
          textZoom200Percent: false,
          a11yWcagViolations: true,
          layoutShifts: true,
          lighthouseCore: false,
          consoleExceptions: true,
          brokenNetworkRequests: true,
          brokenLinks: true
        },
        humanAgent: {
          enabled: true,
          persona: 'impatient-mobile',
          simulateMouseTrails: true,
          simulateTypingCadence: true,
          simulateScrollMomentum: true,
          maxInteractionsPerPage: 10
        },
        layoutEngine: {
          detectTextOverlap: true,
          detectHorizontalBleed: true,
          detectClipping: true,
          detectUnsizedMedia: true,
          detectLowContrast: true,
          minCollisionAreaPx: 12,
          enableAiVisionTriage: false,
          vlmProvider: 'mock'
        },
        recording: {
          recordVideo: true,
          recordTrace: true,
          captureScreenshots: true,
          highlightAnomalies: true,
          artifactsDir: './betterfront-artifacts'
        },
        performance: {
          trackRealtimeCls: true,
          runLighthouse: false,
          maxAllowedCls: 0.10,
          maxAllowedLcpMs: 2500,
          maxAllowedInpMs: 200
        },
        accessibility: {
          enabled: true,
          minTouchTargetPx: 44,
          test200PercentZoom: false,
          checkColorContrast: true
        },
        qualityGate: {
          minOverallScore: 85,
          failOnBlocker: true,
          blockOnConsoleErrors: true,
          blockOnHorizontalBleed: true,
          blockOnTextCollision: true,
          blockOnComponentOcclusion: true,
          blockOnBrokenLinks: false,
          blockOnUnsizedMedia: false
        },
        reporting: {
          outputHtml: './betterfront-report.html',
          outputJson: './betterfront-summary.json'
        }
      };
  }
}
