const fs = require('fs');
const path = require('path');

const { withDangerousMod } = require('@expo/config-plugins');

const ANDROID_DRAWABLES = [
  ['assets/truck_marker_map.png', 'drawable-mdpi'],
  ['assets/truck_marker_map@2x.png', 'drawable-xhdpi'],
  ['assets/truck_marker_map@3x.png', 'drawable-xxhdpi'],
];

/**
 * Instala o camião como drawable Android nativo.
 *
 * O Google Maps recebe o bitmap directamente pelo nome
 * `truck_marker_map`, sem rasterizar uma View React/Fabric.
 */
module.exports = function withTruckMarker(config) {
  return withDangerousMod(config, [
    'android',
    async (androidConfig) => {
      const projectRoot = androidConfig.modRequest.projectRoot;
      const resourcesRoot = path.join(
        androidConfig.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
      );

      for (const [sourcePath, densityFolder] of ANDROID_DRAWABLES) {
        const source = path.join(projectRoot, sourcePath);
        const destinationFolder = path.join(resourcesRoot, densityFolder);
        const destination = path.join(destinationFolder, 'truck_marker_map.png');

        if (!fs.existsSync(source)) {
          throw new Error(`Recurso do camião não encontrado: ${source}`);
        }

        fs.mkdirSync(destinationFolder, { recursive: true });
        fs.copyFileSync(source, destination);
      }

      return androidConfig;
    },
  ]);
};
