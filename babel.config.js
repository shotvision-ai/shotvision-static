module.exports = function (api) {
  api.cache(true);
  const plugins = [
    [
      "module-resolver",
      {
        root: ["."],
        alias: {
          "~": "./",
        },
      },
    ],
  ];

  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind", unstable_transformImportMeta: true }],
      "nativewind/babel",
    ],
    plugins,
  };
};
