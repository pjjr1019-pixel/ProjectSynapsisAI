#!/usr/bin/env node
const { parseCliArgs, runTool } = require('../core/runtime');
const args = parseCliArgs(process.argv);
const result = runTool('startup_folder_items', args);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

