#!/usr/bin/env node
const { parseCliArgs, runTool } = require('../core/runtime');
const args = parseCliArgs(process.argv);
const result = runTool('registry_startup_items', args);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

