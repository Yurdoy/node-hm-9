import { Sequelize } from "sequelize";
import fs from "fs";

const configData = JSON.parse(
  fs.readFileSync(new URL("./config.json", import.meta.url))
);

const env = "development";
const config = configData[env];
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    dialect: config.dialect,
  }
);

export default sequelize;
