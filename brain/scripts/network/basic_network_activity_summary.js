#!/usr/bin/env node
const { parseCliArgs, runTool } = require('../core/runtime');
const args = parseCliArgs(process.argv);
const result = runTool('basic_network_activity_summary', args);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

