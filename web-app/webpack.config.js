const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function(env, argv) {
    const config = await createExpoWebpackConfigAsync({
        ...env,
        babel: {
            dangerouslyAddModulePa thsToTranspile: ['smart-power-consumer-api']
        }
    }, argv);
    return config;
};