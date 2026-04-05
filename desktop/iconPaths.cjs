"use strict";

const { existsSync } = require("node:fs");
const { resolve } = require("node:path");

const DESKTOP_ROOT = __dirname;
const APP_ICON_ICO_PATH = resolve(DESKTOP_ROOT, "app-icon.ico");
const APP_ICON_PNG_PATH = resolve(DESKTOP_ROOT, "app-icon.png");
const TRAY_ICON_PNG_PATH = resolve(DESKTOP_ROOT, "tray-icon.png");

function getWindowIconPath() {
  if (existsSync(APP_ICON_ICO_PATH)) return APP_ICON_ICO_PATH;
  if (existsSync(APP_ICON_PNG_PATH)) return APP_ICON_PNG_PATH;
  return undefined;
}

function getTrayIconPath() {
  if (existsSync(TRAY_ICON_PNG_PATH)) return TRAY_ICON_PNG_PATH;
  if (existsSync(APP_ICON_PNG_PATH)) return APP_ICON_PNG_PATH;
  return undefined;
}

module.exports = {
  APP_ICON_ICO_PATH,
  APP_ICON_PNG_PATH,
  TRAY_ICON_PNG_PATH,
  getWindowIconPath,
  getTrayIconPath,
};
