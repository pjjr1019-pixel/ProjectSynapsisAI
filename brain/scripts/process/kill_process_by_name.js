#!/usr/bin/env node
const { parseCliArgs, runTool } = require('../core/runtime');
const args = parseCliArgs(process.argv);
const result = runTool('kill_process_by_name', args);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

