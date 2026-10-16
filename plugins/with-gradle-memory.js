const { withGradleProperties } = require('expo/config-plugins');

// The release build's Kotlin symbol processing runs out of metaspace at the template's 512m
// since expo-updates was added; prebuild regenerates gradle.properties, so set it here.
const JVM_ARGS = '-Xmx4096m -XX:MaxMetaspaceSize=1024m';

module.exports = (config) =>
  withGradleProperties(config, (c) => {
    c.modResults = c.modResults.filter((p) => p.key !== 'org.gradle.jvmargs');
    c.modResults.push({ type: 'property', key: 'org.gradle.jvmargs', value: JVM_ARGS });
    return c;
  });
