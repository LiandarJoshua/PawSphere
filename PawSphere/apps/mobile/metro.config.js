const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files within the monorepo
config.watchFolders = [monorepoRoot];

// App-local node_modules take priority; fall back to monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Treat .mjs files as source so Babel transforms them
config.resolver.sourceExts = ['mjs', ...config.resolver.sourceExts];
config.transformer.unstable_allowRequireContext = true;

// Force CJS builds for all packages — prevents Metro from loading ESM entry points
// that contain import.meta (e.g. @supabase/realtime-js), which is invalid outside modules
config.resolver.unstable_enablePackageExports = false;

// Redirect native-only packages to web stubs when bundling for web
const WEB_STUBS = {
  'react-native-maps': path.resolve(projectRoot, 'src/stubs/react-native-maps.js'),
  '@react-native-async-storage/async-storage': path.resolve(projectRoot, 'src/stubs/async-storage.js'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && WEB_STUBS[moduleName]) {
    return { filePath: WEB_STUBS[moduleName], type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './src/global.css' });
