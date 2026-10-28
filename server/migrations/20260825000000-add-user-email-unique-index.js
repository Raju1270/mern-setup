/**
 * MAKES EXPLICIT THE UNIQUE users.email INDEX MONGOOSE OTHERWISE BUILDS IMPLICITLY VIA
 * autoIndex — NOW DISABLED OUTSIDE DEV, SO INDEX CHANGES GO THROUGH MIGRATIONS INSTEAD.
 * NAMED "email_1" TO MATCH MONGOOSE'S OWN {field}_{direction} DEFAULT — SO THIS IS A NO-OP
 * ON A DEV DATABASE WHERE autoIndex ALREADY BUILT IT, AND CREATES IT FRESH ELSEWHERE.
 * @param db {import('mongodb').Db}
 * @param client {import('mongodb').MongoClient}
 * @returns {Promise<void>}
 */
export const up = async (db, client) => {
  await db.collection("users").createIndex({ email: 1 }, { unique: true, name: "email_1" });
};

/**
 * @param db {import('mongodb').Db}
 * @param client {import('mongodb').MongoClient}
 * @returns {Promise<void>}
 */
export const down = async (db, client) => {
  await db.collection("users").dropIndex("email_1");
};
