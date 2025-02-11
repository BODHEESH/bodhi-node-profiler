#!/usr/bin/env node

const { program } = require('commander');
const BodhiProfiler = require('../src/index');

program
  .version(require('../package.json').version)
  .description('Bodhi Node Profiler - A lightweight debugging and performance profiling tool');

program
  .command('start')
  .description('Start the profiler')
  .option('-p, --port <number>', 'Port for web dashboard', '3001')
  .option('-l, --log-path <path>', 'Path for log files', './logs')
  .option('-i, --interval <ms>', 'Sampling interval in milliseconds', '5000')
  .option('-d, --dashboard', 'Enable web dashboard', false)
  .action((options) => {
    const profiler = new BodhiProfiler({
      port: parseInt(options.port),
      logPath: options.logPath,
      sampleInterval: parseInt(options.interval),
      enableWebDashboard: options.dashboard
    });

    console.log('Bodhi Node Profiler started with options:', {
      port: options.port,
      logPath: options.logPath,
      sampleInterval: options.interval,
      dashboard: options.dashboard
    });
  });

program.parse(process.argv);
