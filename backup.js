#!/usr/bin/env node
/**
 * 全量导出本地 Docker MySQL 中的 iam 库（UTF-8 / utf8mb4）。
 *
 *   node backup
 *   node backup.js
 *   pnpm backup
 *
 * 读取 .env / .env.docker，输出 backups/YYYYMMDD-HHmmss-local-backup.sql
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = __dirname;
const OUT_DIR = path.join(ROOT, "backups");

function loadEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text.startsWith("#")) continue;
    const index = text.indexOf("=");
    if (index < 0) continue;
    const key = text.slice(0, index).trim();
    let value = text.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function timestampName() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());
  const get = type => parts.find(item => item.type === type)?.value ?? "00";
  return `${get("year")}${get("month")}${get("day")}-${get("hour")}${get("minute")}${get("second")}-local-backup.sql`;
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: options.encoding,
    windowsHide: true,
    maxBuffer: 1024 * 1024 * 512,
    ...options
  });
}

function firstExisting(files) {
  return files.find(file => file && fs.existsSync(file)) ?? null;
}

function findMysqldump() {
  const fromPath = run(process.platform === "win32" ? "where" : "which", [
    "mysqldump"
  ]);
  if (fromPath.status === 0) {
    const found = String(fromPath.stdout || "")
      .split(/\r?\n/)
      .map(item => item.trim())
      .find(item => item && !item.toLowerCase().includes("windowsapps"));
    if (found) return found;
  }

  const home = os.homedir();
  return firstExisting([
    "C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysqldump.exe",
    "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe",
    "C:\\Program Files\\MariaDB 11.4\\bin\\mysqldump.exe",
    "C:\\xampp\\mysql\\bin\\mysqldump.exe",
    path.join(home, "AppData", "Local", "MySQL", "mysqldump.exe")
  ]);
}

function dockerMysqlContainer(config) {
  const ps = run("docker", ["ps", "--format", "{{.Names}}\t{{.Ports}}"]);
  if (ps.status !== 0) return null;
  const rows = String(ps.stdout || "")
    .split(/\r?\n/)
    .map(item => item.trim())
    .filter(Boolean)
    .map(line => {
      const [name, ports = ""] = line.split("\t");
      return { name, ports };
    })
    .filter(item => /mysql/i.test(item.name));
  if (!rows.length) return null;
  const port = String(config.port);
  return (
    rows.find(item => item.name === "mysql8") ||
    rows.find(item => item.name === "iam-platform-mysql") ||
    rows.find(item => item.ports.includes(`:${port}->3306`)) ||
    rows[0]
  ).name;
}

function dockerMysqldump(config, outfile) {
  const name = dockerMysqlContainer(config);
  if (!name) return false;

  const dump = run(
    "docker",
    [
      "exec",
      "-e",
      `MYSQL_PWD=${config.password}`,
      name,
      "mysqldump",
      `-u${config.username}`,
      "--default-character-set=utf8mb4",
      "--set-charset",
      "--single-transaction",
      "--routines",
      "--triggers",
      "--events",
      "--hex-blob",
      "--set-gtid-purged=OFF",
      config.database
    ],
    { encoding: "buffer" }
  );
  if (dump.status !== 0) {
    const err = dump.stderr?.toString("utf8") || dump.error?.message || "";
    throw new Error(`docker mysqldump 失败：${err.trim() || dump.status}`);
  }
  fs.writeFileSync(outfile, dump.stdout);
  return name;
}

function dumpArgs(config, outfile) {
  return [
    `-h${config.host}`,
    `-P${config.port}`,
    `-u${config.username}`,
    "--default-character-set=utf8mb4",
    "--set-charset",
    "--single-transaction",
    "--routines",
    "--triggers",
    "--events",
    "--hex-blob",
    "--set-gtid-purged=OFF",
    `--result-file=${outfile}`,
    config.database
  ];
}

function main() {
  const fileEnv = {
    ...loadEnv(path.join(ROOT, ".env")),
    ...loadEnv(path.join(ROOT, ".env.development")),
    ...loadEnv(path.join(ROOT, ".env.docker"))
  };
  const config = {
    host: process.env.DB_HOST || fileEnv.DB_HOST || "127.0.0.1",
    port: String(process.env.DB_PORT || fileEnv.DB_PORT || "3306"),
    username:
      process.env.DB_USER ||
      process.env.DB_USERNAME ||
      fileEnv.DB_USER ||
      fileEnv.DB_USERNAME ||
      "root",
    password:
      process.env.DB_PASSWORD ||
      process.env.MYSQL_PWD ||
      fileEnv.DB_PASSWORD ||
      fileEnv.MYSQL_ROOT_PASSWORD ||
      "",
    database:
      process.env.DB_DATABASE ||
      fileEnv.DB_DATABASE ||
      fileEnv.MYSQL_DATABASE ||
      "iam"
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const filename = timestampName();
  const outfile = path.join(OUT_DIR, filename);

  let via = "";
  const container = dockerMysqldump(config, outfile);
  if (container) {
    via = `docker exec ${container}`;
  } else {
    const mysqldump = findMysqldump();
    if (!mysqldump) {
      throw new Error(
        "未找到正在运行的 MySQL 容器，也未找到 mysqldump。请先启动数据库容器或安装 MySQL 客户端。"
      );
    }
    via = `mysqldump (${mysqldump})`;
    const result = run(mysqldump, dumpArgs(config, outfile), {
      env: { ...process.env, MYSQL_PWD: config.password }
    });
    if (result.status !== 0) {
      const err =
        result.stderr?.toString?.("utf8") ||
        result.error?.message ||
        String(result.status);
      throw new Error(`mysqldump 失败：${err.trim()}`);
    }
  }

  const size = fs.statSync(outfile).size;
  if (!size) {
    fs.unlinkSync(outfile);
    throw new Error("导出文件为空，请检查数据库连接与库名。");
  }

  const header = Buffer.alloc(Math.min(size, 400));
  const fd = fs.openSync(outfile, "r");
  fs.readSync(fd, header, 0, header.length, 0);
  fs.closeSync(fd);
  if (!/utf8/i.test(header.toString("utf8")) && !/SET NAMES/i.test(header.toString("utf8"))) {
    console.warn("警告：导出文件未检测到 utf8 字符集声明，请人工确认。");
  }

  console.log(`已导出 UTF-8 全量备份：${path.relative(ROOT, outfile)}`);
  console.log(`数据库 ${config.database} @ ${config.host}:${config.port}（${via}）`);
  console.log(`大小 ${(size / 1024).toFixed(1)} KB`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
