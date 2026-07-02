#!/usr/bin/env node

/**
 * Get deployment platform from config
 * This script reads the deployment platform from src/config.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';

function getDeploymentPlatform() {
  try {
    const configPath = join(process.cwd(), 'src', 'config.ts');
    const configContent = readFileSync(configPath, 'utf8');

    // Extract platform from the runtime config object, not the type interface.
    // The file also contains `SiteConfig` type unions that should not be used.
    const siteConfigStart = configContent.indexOf('export const siteConfig');
    const runtimeConfigContent = siteConfigStart >= 0
      ? configContent.slice(siteConfigStart)
      : configContent;

    const deploymentBlockMatch = runtimeConfigContent.match(
      /deployment:\s*\{[\s\S]*?platform:\s*["']([^"']+)["']/
    );

    if (deploymentBlockMatch) {
      return deploymentBlockMatch[1];
    }

    // Fallback: pick the last direct platform assignment if structure changes.
    const allPlatformMatches = [
      ...runtimeConfigContent.matchAll(/platform:\s*["']([^"']+)["']\s*,/g)
    ];

    if (allPlatformMatches.length > 0) {
      return allPlatformMatches[allPlatformMatches.length - 1][1];
    }
    
    // Fallback to environment variable
    return process.env.DEPLOYMENT_PLATFORM || 'netlify';
  } catch (error) {
    console.error('Error reading config:', error.message);
    return process.env.DEPLOYMENT_PLATFORM || 'netlify';
  }
}

// Export for use in other scripts
export default getDeploymentPlatform;

// If run directly, output the platform
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(getDeploymentPlatform());
}