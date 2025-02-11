const express = require('express');
const { BodhiProfiler } = require('../dist'); // Use 'bodhi-node-profiler' in your project

// Create Express app
const app = express();

// Initialize profiler with one line! 
const profiler = new BodhiProfiler({
    port: 45678 // Using our unique port
});
app.use(profiler.middleware());

// Add some test routes
app.get('/api/fast', (req, res) => {
    res.json({ message: 'Fast response' });
});

app.get('/api/slow', async (req, res) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    res.json({ message: 'Slow response' });
});

app.get('/api/memory', (req, res) => {
    const bigArray = new Array(1000000).fill('test');
    res.json({ 
        message: 'Memory intensive operation',
        size: bigArray.length
    });
});

app.get('/api/cpu', (req, res) => {
    let result = 0;
    for(let i = 0; i < 1000000; i++) {
        result += Math.sqrt(i);
    }
    res.json({ result });
});

// Start server
app.listen(3000, () => {
    console.log('\n Quick Start Example Running!');
    console.log('\n Open http://localhost:45678/profiler/stats to see your metrics');
    console.log('\n Try these endpoints:');
    console.log('1. http://localhost:3000/api/fast   - Quick response');
    console.log('2. http://localhost:3000/api/slow   - Simulated delay');
    console.log('3. http://localhost:3000/api/memory - Memory usage');
    console.log('4. http://localhost:3000/api/cpu    - CPU usage');
    console.log('\n Watch the dashboard as you hit different endpoints!');
});
