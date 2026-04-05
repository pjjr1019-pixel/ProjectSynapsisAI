#!/usr/bin/env node
const { parseCliArgs, runTool } = require('../core/runtime');
const args = parseCliArgs(process.argv);
const result = runTool('process_details_by_name', args);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

