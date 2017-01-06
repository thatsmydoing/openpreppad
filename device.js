let noble = require('noble');
let Rx = require('rx');

const ACCEL_OFF = Buffer.from([0x00]);
const ACCEL_ON = Buffer.from([0x01]);

// MAGIC CONSTANTS FOLLOW
// these might be different for other devices, I wouldn't know
const IDENTIFIER = 'CHSLEEV_00';
const DEVICE_INFO_UUID = '180a';
const ACCEL_UUID = 'ffa0';
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

let button$ = new Rx.Subject();

let discover$ = Rx.Observable.fromEvent(noble, 'discover');

let peripheral$ = discover$
  .filter(p => p.advertisement.localName === IDENTIFIER)
  .do(_ => noble.stopScanning())
  .take(1)
  .shareReplay(1)

let connection$ = peripheral$
  .flatMapFirst(peripheral => {
    let disconnect$ = Rx.Observable.fromEvent(peripheral, 'disconnect')
      .map(_ => { return {state: 'disconnected'}})
      .take(1);
    let connect$ = Rx.Observable.fromEvent(peripheral, 'connect')
      .map(_ => { return {state: 'connected', peripheral}})
      .take(1);
    peripheral.connect();
    return disconnect$.merge(connect$);
  })
  .repeat()
  .share()

let services$ = connection$
  .filter(s => s && s.state === 'connected')
  .flatMap(s => {
    let peripheral = s.peripheral;
    let discoverServices = Rx.Observable.fromNodeCallback(
      peripheral.discoverSomeServicesAndCharacteristics,
      peripheral
    );
    return discoverServices([DEVICE_INFO_UUID, ACCEL_UUID], []);
  })
  .filter(s => s.length == 2 && s[0].length == 2)
  .map(s => s[0])
  .share()

let serial$ = services$
  .flatMap(s => {
    let info = s[0].characteristics[2];
    return Rx.Observable.fromNodeCallback(info.read, info)();
  })

let connStatus$ = connection$.combineLatest(serial$, (conn, serial) => {
  if(conn.state == 'connected') {
    return Object.assign({serial}, conn);
  }
  else {
    return conn;
  }
}).share()

function makeAccelStream(characteristic) {
  return Rx.Observable.fromEvent(characteristic, 'data')
    .map(d => d[3] * 256 * 256 * 256 + d[2] * 256 * 256 + d[1] * 256 + d[0])
    .startWith(-1)
}

let accel$ = services$
  .do(s => {
    s[1].characteristics[0].write(ACCEL_ON);
    s[1].characteristics[2].subscribe();
    s[1].characteristics[3].subscribe();
    s[1].characteristics[4].subscribe();
  })
  .flatMap(s => {
    let characteristics = s[1].characteristics;
    return Rx.Observable.combineLatest(
      makeAccelStream(characteristics[2]),
      makeAccelStream(characteristics[3]),
      makeAccelStream(characteristics[4])
    )
  })
  .share()

let xAccel$ = accel$
  .map(r => r[0])
  .filter(v => v >= 0)

function item(type, value) {
  return { type, value }
}

let tareFromButton$ = button$
  .withLatestFrom(xAccel$, (_, accel) => item('reset', accel))

let tareFromXAccel$ = xAccel$
  .map(accel => item('value', accel))

let tare$ = tareFromButton$.merge(tareFromXAccel$)
  .scan((acc, item) => {
    if(item.type === 'reset') {
      return item.value;
    }
    else {
      return Math.max(acc, item.value);
    }
  }, 0)

let weight$ = xAccel$
  .combineLatest(tare$, (accel, tare) => {
    return (tare - accel) / RATIO;
  })
  .map(Math.floor)

module.exports = {
  button$,
  connStatus$,
  weight$,
  accel$
}
