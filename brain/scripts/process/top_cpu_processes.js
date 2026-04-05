#!/usr/bin/env node
const { parseCliArgs, runTool } = require('../core/runtime');
const args = parseCliArgs(process.argv);
const result = runTool('top_cpu_processes', args);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

