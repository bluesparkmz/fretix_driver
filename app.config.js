module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    './plugins/with-truck-marker',
  ],
});
