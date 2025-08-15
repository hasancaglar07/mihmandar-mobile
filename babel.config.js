module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // Order matters: proposal plugins first, reanimated plugin last
  plugins: [
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-transform-nullish-coalescing-operator',
    'react-native-reanimated/plugin',
  ],
};
