let noble = require('noble');

const ACCEL_OFF = Buffer.from([0x00]);
const ACCEL_ON = Buffer.from([0x01]);

// MAGIC CONSTANTS FOLLOW
// these might be different for other devices, I wouldn't know
const IDENTIFIER = 'CHSLEEV_00';
const DEVICE_INFO_UUID = '180a';
const ACCEL_UUID = 'ffa0';
const TARE = 41690;
const RATIO = 14;
// MAGIC CONSTANTS END

noble.on('stateChange', function(state) {
  if(state === 'poweredOn') {
    noble.startScanning();
  }
  else {
    noble.stopScanning();
  }
});

noble.on('discover', function(peripheral) {
  if(peripheral.advertisement.localName === 'CHSLEEV_00') {
    noble.stopScanning();

    console.log('Prep Pad found with address '+peripheral.address);

    peripheral.on('disconnect', function() {
      console.log('Disconnecting from Prep Pad '+peripheral.address);
      process.exit(0);
    });

    peripheral.connect(function(error) {
      console.log('Connected to Prep Pad');
      peripheral.discoverSomeServicesAndCharacteristics([DEVICE_INFO_UUID, ACCEL_UUID], [], function(error, services) {
        if(services.length != 2) {
          console.log('Could not find the relevant services. This might not actually be a Prep Pad');
          peripheral.disconnect();
        }
        else {
          let information = services[0];
          let accelerometer = services[1];
          information.characteristics[2].read(function(error, data) {
            console.log('Serial Number: '+data);
          });
          accelerometer.characteristics[0].write(ACCEL_ON);
          accelerometer.characteristics[2].subscribe();
          accelerometer.characteristics[2].on('data', function(data, isNotification) {
            let value = data[1] * 256 + data[0];
            let grams = Math.floor((TARE - value) / RATIO);
            console.log(grams+'g');
          });
        }
      });
    });
  }
});
