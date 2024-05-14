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
			default: 'latest/latest_environment.txt',
		},
		blueGatewayUrl: {
			type: 'string',
			default: 'http://gateway-blue:3000',
		},
		greenGatewayUrl: {
			type: 'string',
			default: 'http://gateway-green:3000',
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

let currentGateway = blueGatewayUrl; // Initial gateway
let healthCheckTimeout = null;
let switchScheduled = false;

// Function to check the health of a gateway
async function checkHealth(gatewayUrl) {
	try {
		const response = await fetch(`${gatewayUrl}/health`, {
			signal: AbortSignal.timeout(4_000),
		});
		return response.ok;
	} catch (error) {
		console.error(`Health check error for ${gatewayUrl}:`, error);
		return false;
	}
}

// Function to update the current gateway based on the latestEnvFilename
function updateCurrentGateway() {
	try {
		const data = fs.readFileSync(latestEnvFilename, 'utf-8').trim();
		if (data === 'blue') {
			currentGateway = blueGatewayUrl;
		} else if (data === 'green') {
			currentGateway = greenGatewayUrl;
		} else {
			console.error(`Invalid environment in ${latestEnvFilename}`);
		}
	} catch (error) {
		console.error(`Error reading ${latestEnvFilename}:`, error);
	}
}

if (checkHealth(currentGateway)) {
	console.log('Initial gateway is healthy.');
} else {
	console.log('Initial gateway is unhealthy.');
}

// Health check loop
setInterval(async () => {
	const desiredGateway = getDesiredGateway();
	const isCurrentHealthy = await checkHealth(currentGateway);

	if (desiredGateway === currentGateway) {
		// Currently on the desired gateway

		if (!isCurrentHealthy) {
			// Current gateway is not healthy, check other immediately
			console.log('Current gateway is unhealthy, checking the other gateway...');
			const isOtherHealthy = await checkHealth(getOtherGateway(currentGateway));
			if (isOtherHealthy) {
				// Other gateway is healthy, switch immediately
				console.log('Other gateway is healthy, switching...');
				currentGateway = getOtherGateway(currentGateway);
			} else {
				// Other gateway is also unhealthy, wait and retry
				console.log(
					'Other gateway is also unhealthy, waiting and retrying...'
				);
			}
		} else {
			// Current gateway is healthy, do nothing (wait and recheck)
		}
	} else {
		// Currently on the wrong gateway

		const isOtherHealthy = await checkHealth(getOtherGateway(currentGateway));
		if (isOtherHealthy) {
			// Other gateway is healthy, schedule a switchover
			if (!switchScheduled) {
				console.log(
					`Other gateway is healthy, scheduling a switchover in ${switchoverDelay} seconds...`
				);
				switchScheduled = true;
				healthCheckTimeout = setTimeout(() => {
					currentGateway = getOtherGateway(currentGateway);
					switchScheduled = false;
					console.log('Switched to the desired gateway.');
				}, switchoverDelay * 1000);
			}
		} else {
			// Other gateway is unhealthy, do not switch
			console.log(
				'Other gateway is unhealthy, not switching (waiting for it to become healthy)'
			);
			if (switchScheduled) {
				clearTimeout(healthCheckTimeout);
				switchScheduled = false;
			}
		}
	}
}, 5000); // Check every 5 seconds

function getDesiredGateway() {
	try {
		const data = fs.readFileSync(latestEnvFilename, 'utf-8').trim();
		return data === 'blue' ? blueGatewayUrl : greenGatewayUrl;
	} catch (error) {
		console.error(`Error reading ${latestEnvFilename}:`, error);
		return currentGateway; // Stay on the current gateway if there is an error
	}
}

function getOtherGateway(currentGateway) {
	return currentGateway === blueGatewayUrl ? greenGatewayUrl : blueGatewayUrl;
}

const app = express();

// Proxy all other requests to the current gateway
app.use('/', expressHttpProxy(currentGateway, { limit: "200mb" }));

app.listen(proxyPort, () => {
	console.log(`Proxy server listening on port ${proxyPort}`);
});