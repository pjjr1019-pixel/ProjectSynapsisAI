#!/usr/bin/env node
const { parseCliArgs, runTool } = require('../core/runtime');
const args = parseCliArgs(process.argv);
const result = runTool('generate_process_health_snapshot', args);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

