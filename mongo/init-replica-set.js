// RUN ONCE BY THE ONE-SHOT `mongo-init` COMPOSE SERVICE AGAINST mongo1, AFTER ALL THREE NODES
// REPORT HEALTHY. USES SERVICE NAMES (NOT THE ${MONGOn_CONTAINER_NAME} ENV VARS) FOR THE
// MEMBER HOSTS — THIS FILE IS MOUNTED AS-IS, NOT ENVSUBST-TEMPLATED (SAME REASONING AS
// nginx/nginx.conf), AND COMPOSE ALWAYS RESOLVES THE SERVICE NAME REGARDLESS OF ANY
// container_name OVERRIDE, SO HARDCODING IT HERE IS SAFE EVEN IF THOSE VARS CHANGE.
const config = {
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1:27017" },
    { _id: 1, host: "mongo2:27017" },
    { _id: 2, host: "mongo3:27017" },
  ],
};

try {
  rs.status();
  print("Replica set rs0 already initialized, skipping.");
} catch (err) {
  rs.initiate(config);
  print("Replica set rs0 initiated.");
}
