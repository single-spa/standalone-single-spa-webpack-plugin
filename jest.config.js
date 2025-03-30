/** @type {import('jest').Config} */
const config = {
  snapshotSerializers: ["jest-serializer-html"],
  extensionsToTreatAsEsm: [".ts"],
};

export default config;
