import { parseArgs } from 'util';
import express from 'express';
import expressHttpProxy from 'express-http-proxy';
import fs from 'fs';

const { values } = parseArgs({
	args: process.argv,
	options: {
		port: {
			type: 'string',
			default: '8080',
		},
		switchoverDelay: {
			type: 'string',
			default: '30', // Seconds
		},
		latestEnvFilename: {
			type: 'string',
			default: 'latest/latest_environment.txt', // Seconds
		},
		blueGatewayUrl: {
			type: 'string',
			default: 'http://gateway-blue:3000', // Seconds
		},
		greenGatewayUrl: {
			type: 'string',
			default: 'http://gateway-green:3000', // Seconds
		},
	},
	strict: true,
	allowPositionals: true,
});

const proxyPort = parseInt(values.port);
const switchoverDelay = parseInt(values.switchoverDelay);
const latestEnvFilename = values.latestEnvFilename;
const blueGatewayUrl = values.blueGatewayUrl;
const greenGatewayUrl = values.greenGatewayUrl;

let currentGateway = blueGatewayUrl;
let nextGateway = greenGatewayUrl;
let healthCheckSuccessCount = 0;
let switchoverTimeout = null;
let lastHealthyGateway = currentGateway; // Keep track of the last known healthy gateway

// Function to check the health of a gateway
async function checkHealth(gatewayUrl) {
	try {
		const response = await fetch(`${gatewayUrl}/health`, {
			signal: AbortSignal.timeout(4_000)
		});
		return response.ok;
	} catch (error) {
		console.error(`Health check error for ${gatewayUrl}:`, error);
		return false;
	}
}

function switchGateways() {
	lastHealthyGateway = currentGateway; // Update the last healthy gateway
	console.log(`Switching from ${currentGateway} to ${nextGateway}`);
	currentGateway = nextGateway;
	healthCheckSuccessCount = 0;
	switchoverTimeout = null;
}

function rollbackToLastHealthy() {
	console.log(`Rolling back from ${currentGateway} to ${lastHealthyGateway}`);
	currentGateway = lastHealthyGateway;
	healthCheckSuccessCount = 0;
	switchoverTimeout = null;
}

// Function to update gateways based on current_environment.txt
function updateGateways() {
	try {
		const data = fs.readFileSync(latestEnvFilename, 'utf-8').trim();
		if (data === 'blue') {
			currentGateway = blueGatewayUrl;
			nextGateway = greenGatewayUrl;
		} else if (data === 'green') {
			currentGateway = greenGatewayUrl;
			nextGateway = blueGatewayUrl;
		} else {
			console.error(`Invalid environment in ${latestEnvFilename}`);
		}
	} catch (error) {
		console.error(`Error reading ${latestEnvFilename}:`, error);
	}
}

updateGateways(); // Initialize gateways on startup

// Health check loop
setInterval(async () => {
	const isNextGatewayHealthy = await checkHealth(nextGateway);

	if (isNextGatewayHealthy) {
		healthCheckSuccessCount++;
		console.log(
			`Next gateway healthy (${healthCheckSuccessCount} consecutive successes)`
		);

		if (healthCheckSuccessCount >= 2 && !switchoverTimeout) {
			switchoverTimeout = setTimeout(
				switchGateways,
				switchoverDelay * 1000
			);
			console.log(`Switch scheduled in ${switchoverDelay} seconds`);
		}
	} else {
		healthCheckSuccessCount = 0;
		console.log('Next gateway unhealthy');
		if (switchoverTimeout) {
			clearTimeout(switchoverTimeout);
			switchoverTimeout = null;
			console.log('Switch canceled');
		}
	}
}, 5000);

const app = express();

// Proxy all other requests to the current gateway
app.use('/', expressHttpProxy(currentGateway));

app.listen(proxyPort, () => {
	console.log(`Proxy server listening on port ${proxyPort}`);
});