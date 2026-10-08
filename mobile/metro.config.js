const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, '..', 'frontend', 'src', 'utils'), path.resolve(__dirname, '..', 'frontend', 'src', 'components')];
// Shared SVG JSX must use the app's React, not the web project's separate copy.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react' || moduleName.startsWith('react/')) {
    return context.resolveRequest(context, path.resolve(__dirname, 'node_modules', moduleName), platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};
module.exports = config;
