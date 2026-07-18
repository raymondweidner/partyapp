const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withFirebasePodfile = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const file = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = await fs.promises.readFile(file, 'utf8');

      const postInstallBlock = `
  installer.pods_project.targets.each do |target|
    if ['RNFBApp', 'RNFBAuth', 'RNFBCrashlytics', 'RNFBFirestore', 'RNFBFunctions', 'RNFBMessaging', 'RNFBAnalytics'].include?(target.name)
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        config.build_settings['DEFINES_MODULE'] = 'NO'
      end
    end
  end
`;

      if (contents.includes('post_install do |installer|')) {
        console.log('[withFirebasePodfile] Found post_install block, injecting fix...');
        contents = contents.replace(
          'post_install do |installer|',
          `post_install do |installer|\n${postInstallBlock}`
        );
      } else {
        console.warn('[withFirebasePodfile] WARNING: Could not find post_install block in Podfile!');
      }

      await fs.promises.writeFile(file, contents, 'utf-8');
      return config;
    },
  ]);
};

module.exports = withFirebasePodfile;
