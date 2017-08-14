#!/usr/bin/env node
const SerialPort = require('serialport');
const WebSocket = require('ws');
const os = require('os');
var program = require('commander');
var wss = new WebSocket.Server({host: '127.0.0.1', port: 8080});


program
	.version('1.4.0')
	.option('-p, --port <p>', 'Specify serial port to connect to.')
	.option('-B, --baud <b>', 'Specify baud rate for serial connection. Defaults to 9600 baud.', parseInt)
	.parse(process.argv);

if (typeof program.baud === 'undefined') {
	program.baud = 9600;  //default to 9600 baud
}


wss.on('connection', function(connection) {
	console.log("WebSocket connection established.");
	connection.send(9.99);
	if (wss.clients.size === 1) {
		initArduinoConnection();
	}
});

wss.broadcast = function broadcast(data) {
	wss.clients.forEach(function sendData(client) {
		if (client.readyState === 1) {   
			try {
				client.send(data);
			} catch(err) {
				console.log(err);
			}
		} else {
			client.terminate();
		}
	});
};

var streamFromSerial = function streamFromSerial(portName) {

	var Arduino = new SerialPort(portName, {
		parser: SerialPort.parsers.readline('\r\n'), //'\r\n' is the spacing character added by Arduino's Serial.println() function, so we use it to parse data
		baudRate: program.baud
	});

	Arduino.on('open', function() {
		console.log("Port " + portName + " opened.");
	});

	Arduino.on('data', function(data) {
		wss.broadcast(data.toString());
	});

	Arduino.on('error', function(err) {
		console.log(err);
	});
}

function initArduinoConnection() {

	if(typeof program.port !== 'undefined') {
		streamFromSerial(program.port);
	} else {
		SerialPort.list(function(err, ports) {
			ports.forEach(function(port) {
				if(port.manufacturer && port.manufacturer.indexOf("Arduino") !== -1) { //connect to the first device we see that has "Arduino" in the manufacturer name
					streamFromSerial(port.comName);
				}
			});
		});
	}
}