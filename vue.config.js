module.exports = {
  pluginOptions: {
    electronBuilder: {
      preload: 'src/utils/pennsieve/preload.js',
      builderOptions: {
        files: [
          "**/*",
          {
            from: "../../src/utils/pennsieve/protos",
            to: "./protos",
            filter: ["**/*"]
          }
        ]
      }
    }
  }
}
