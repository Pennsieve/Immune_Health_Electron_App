module.exports = {
  pluginOptions: {
    electronBuilder: {
      preload: 'src/utils/pennsieve/preload.js',
      protos: 'src/utils/pennsieve/protos/agent.proto'
    }
  }
}
