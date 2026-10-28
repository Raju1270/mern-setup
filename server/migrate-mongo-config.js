// CONFIG FOR THE migrate-mongo CLI. RUN VIA THE npm SCRIPTS SO .env IS LOADED FIRST.
// PLAIN JS (NOT tsx) ON PURPOSE — KEEPS THIS OPS TOOL RUNNABLE WITH JUST NODE, NO TS TOOLCHAIN.
// DEFAULTS MIRROR config/constants.ts; UPDATE BOTH IF THEY EVER CHANGE.
const DEFAULT_MONGO_URI = "mongodb://127.0.0.1:27017";
const DEFAULT_DB_NAME = "mern_app";

const config = {
  mongodb: {
    url: process.env.MONGO_URI || DEFAULT_MONGO_URI,
    databaseName: process.env.MONGO_DB_NAME || DEFAULT_DB_NAME,
    // NO directConnection — SAME RATIONALE AS server/config/connectDB.ts: IT WOULD THROW
    // AGAINST THE MULTI-HOST replicaSet=rs0 URI USED IN DOCKER.
    options: {},
  },
  migrationsDir: "migrations",
  changelogCollectionName: "changelog",
  lockCollectionName: "changelog_lock",
  // NONZERO SO CONCURRENT `migrate up` RUNS (E.G. A MULTI-INSTANCE DEPLOY) ACTUALLY SERIALIZE
  // INSTEAD OF RACING — 0 DISABLES THE LOCK ENTIRELY.
  lockTtl: 60,
  migrationFileExtension: ".js",
  useFileHash: false,
  moduleSystem: "esm",
};

export default config;
