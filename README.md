# Bodhi Node Profiler

<div align="center">

🚀 A lightweight, zero-configuration performance profiler for Node.js applications

[![npm version](https://img.shields.io/npm/v/bodhi-node-profiler.svg)](https://www.npmjs.com/package/bodhi-node-profiler)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/bodheeshvc/bodhi-node-profiler/pulls)

</div>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#features">Features</a> •
  <a href="#usage-examples">Examples</a> •
  <a href="#configuration-options">Configuration</a> •
  <a href="#support">Support</a>
</p>


## 🎯 Overview

Unlock the full potential of your Node.js applications with Bodhi Node Profiler! Monitor, debug, and optimize your application's performance in real-time with minimal setup. Whether you're debugging in development or monitoring in production, Bodhi Node Profiler provides the insights you need.

### ⚡️ Why Choose Bodhi Node Profiler?

- 🚀 **One-Line Integration**: Start profiling with minimal code changes
- 📊 **Real-Time Dashboard**: Beautiful dashboard for live monitoring
- 🔍 **Comprehensive Metrics**: CPU, Memory, Event Loop, and API performance
- ⚡ **Production Ready**: Low overhead (<50MB memory, <1% CPU)
- 🛠️ **Developer Friendly**: TypeScript support, Express.js integration

## Quick Start

### 1. Install

```bash
npm install bodhi-node-profiler
```

### 2. Basic Usage

```javascript
const express = require('express');
const { BodhiProfiler } = require('bodhi-node-profiler');

const app = express();

// Initialize profiler - That's it! 🎉
const profiler = new BodhiProfiler();
app.use(profiler.middleware());
```

Visit `http://localhost:45678/profiler/stats` to see your metrics dashboard!

## Features

### 📊 Real-time Performance Monitoring
- CPU usage tracking
- Memory leak detection
- Event loop delay monitoring
- API response time analysis
- Custom metrics support

### 🔍 Comprehensive API Profiling
- Automatic endpoint detection
- Response time tracking
- Error rate monitoring
- Request/Response logging
- Route usage analytics

### ⚡ Production-Ready
- Minimal overhead
- Safe for production use
- Configurable logging
- Alert thresholds
- No external dependencies

### 🛠️ Developer Experience
- TypeScript support
- Express.js integration
- Beautiful web dashboard
- Easy configuration
- Detailed documentation

## Usage Examples

### 1. REST API Server

```javascript
const express = require('express');
const { BodhiProfiler } = require('bodhi-node-profiler');

const app = express();

// Custom configuration
const profiler = new BodhiProfiler({
    logPath: './logs',
    sampleInterval: 1000,
    enableWebDashboard: true,
    port: 8080
});

app.use(profiler.middleware());

// Your routes will be automatically profiled!
app.get('/api/users', async (req, res) => {
    const users = await db.getUsers();
    res.json(users);
});
```

### 2. GraphQL Server

```javascript
const { ApolloServer } = require('apollo-server');
const { BodhiProfiler } = require('bodhi-node-profiler');

const profiler = new BodhiProfiler();

const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [{
        requestDidStart: () => ({
            willSendResponse: (requestContext) => {
                // Track GraphQL operation performance
                profiler.trackOperation({
                    type: 'GraphQL',
                    name: requestContext.operationName,
                    duration: requestContext.request.duration
                });
            }
        })
    }]
});
```

### 3. Microservices Architecture

```javascript
const express = require('express');
const { BodhiProfiler } = require('bodhi-node-profiler');

// Initialize with service-specific config
const profiler = new BodhiProfiler({
    serviceName: 'auth-service',
    logPath: './logs/auth-service',
    tags: ['microservice', 'auth'],
    alertThresholds: {
        memory: 1024 * 1024 * 1024, // 1GB
        cpu: 80, // 80% CPU usage
        responseTime: 1000 // 1 second
    }
});

// Get real-time metrics
app.get('/health', (req, res) => {
    const metrics = profiler.getMetrics();
    res.json({
        status: 'healthy',
        ...metrics
    });
});
```

### 4. Background Jobs

```javascript
const { BodhiProfiler } = require('bodhi-node-profiler');

const profiler = new BodhiProfiler({
    logPath: './logs/jobs'
});

async function processQueue() {
    const start = Date.now();
    
    try {
        await heavyJob();
        profiler.trackOperation({
            type: 'Job',
            name: 'processQueue',
            duration: Date.now() - start
        });
    } catch (error) {
        profiler.trackError({
            type: 'Job',
            name: 'processQueue',
            error
        });
    }
}
```

## Advanced Features

### 1. Custom Metrics

```javascript
// Track custom business metrics
profiler.trackMetric({
    name: 'activeUsers',
    value: getUserCount(),
    tags: ['business', 'users']
});
```

### 2. Performance Alerts

```javascript
const profiler = new BodhiProfiler({
    alerts: {
        onHighMemory: (usage) => notifyDevOps('High memory usage detected', usage),
        onHighCPU: (usage) => scaleService(),
        onSlowEndpoint: (data) => logPerformanceIssue(data)
    }
});
```

### 3. Memory Leak Detection

```javascript
const profiler = new BodhiProfiler({
    memoryLeakDetection: true,
    heapSnapshotInterval: 3600000 // 1 hour
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| logPath | string | './logs' | Directory for performance logs |
| port | number | 8080 | Dashboard port |
| sampleInterval | number | 1000 | Metrics collection interval (ms) |
| enableWebDashboard | boolean | true | Enable/disable web dashboard |
| serviceName | string | undefined | Service identifier for distributed systems |
| tags | string[] | [] | Tags for metric categorization |
| alertThresholds | object | {} | Performance alert thresholds |

## Why Bodhi Node Profiler?

1. **Zero Configuration**: Works out of the box with smart defaults
2. **Low Overhead**: Minimal impact on application performance
3. **Real-time Insights**: Instant visibility into performance issues
4. **No External Dependencies**: Everything you need is included
5. **TypeScript Support**: Full type definitions included

## Performance Impact

- Memory Overhead: < 50MB
- CPU Overhead: < 1%
- Response Time Impact: < 0.5ms

## Best Practices

1. **Development**:
   - Enable all features for maximum insight
   - Use lower sampling intervals for detailed data

2. **Production**:
   - Adjust sampling intervals based on traffic
   - Enable alerts for proactive monitoring
   - Use log rotation for long-running services


---

## 💭 A Note from the Developer

Hey there! I'm Bodheesh VC, a passionate Node.js developer who believes in making development easier and more efficient for everyone. I created Bodhi Node Profiler because I felt the pain of debugging performance issues in production applications and wanted a simple, lightweight solution that just works.

This project is my contribution to the amazing Node.js community that has given me so much. It's built with love, attention to detail, and a focus on developer experience. Whether you're building a small API or a large microservices architecture, I hope this tool makes your development journey a little bit easier.

I'm actively maintaining this project and would love to hear your feedback! Feel free to reach out on [Twitter](https://twitter.com/bodheeshvc) or [LinkedIn](https://linkedin.com/in/bodheeshvc) if you have questions or just want to chat about Node.js performance optimization.

Let's make the Node.js ecosystem better together! 🚀

---

## Contributing

I believe in the power of community! If you'd like to contribute, here's how you can help:

- 🐛 Report bugs and issues
- 💡 Suggest new features
- 📖 Improve documentation
- 🔧 Submit pull requests
- ⭐ Star the project if you find it useful!

Check out our [Contributing Guide](CONTRIBUTING.md) for more details.

## Support

Need help? I'm here for you!

- 📧 Email: bodheeshvc.developer@gmail.com
- 🐦 Twitter: [@bodheeshvc](https://twitter.com/bodheeshvc)
- 💼 LinkedIn: [bodheeshvc](https://linkedin.com/in/bodheeshvc)
- 💬 Discord: [Join our community](https://discord.gg/bodhi-profiler)

## License

MIT

---

<div align="center">
  Made with ❤️ by <a href="https://github.com/bodheeshvc">Bodheesh VC</a>
  <br />
  If you find this tool helpful, consider giving it a ⭐️!
</div>
