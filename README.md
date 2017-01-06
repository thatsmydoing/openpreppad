# OpenPrepPad

This allows use of the Orange Chef Prep Pad on Linux (and maybe OSX) machines.

Make sure bluetooth is powered on when running. You can run it by

```
npm install
npm start
```

## Protocol Details

The Prep Pad is a standard Bluetooth LE device and exposes all functionality via
GATT. The relevant service is `ffa0` which is the Accelerometer service. You
then need to write `0x01` to characteristic `ffa1` which is "Accel Enable".
After this, you should be able to listen to characteristic `ffa3` which is
"Accel X-Coordinate". This should give you a stream of little endian 32-bit
integers.  Heavier is less while lighter is greater. To convert the value to
grams, you can divide the value by 14 and that should be it. Writing `0x00` to
"Accel Enable" will cause the device to disconnect and turn off.

The other available characteristics are `ffa2` which is "Accel Range". It's
read/write but I don't know what the values are supposed to mean. `ffa4` and
`ffa5` are "Accel Y-Coordinate" and "Accel Z-Coordinate" but I didn't find those
values changing often.

There is another service `f000ffc0-0451-4000-b000-000000000000` which contains
characteristics `f000ffc1-...` and `f000ffc2-...` for "Img Block" and "Img
Identify", but I don't know what those are.

## Light Indicator

When it's off and you press the button, the light constantly flashes which means
it's waiting for a connection. Once something connects, the light will remain
steady. After writing `0x01` to "Accel Range", the light will turn off but the
device is still on and sending data. If you disconnect during this, the device
will remain on but the light will remain off. Even when you reconnect, the light
will not turn on again but that's normal.

When it's on, and you press the button, the light will flash twice for a longer
interval than when it's waiting for connections. After that, it will turn off.

## Device Quirks

Normally the device continuously sends data but I've found that it will
sometimes enter a weird state where it will send 8-10 values and then
disconnect. Even after reconnecting, it will still just send 8-10 values and
disconnect. Restarting the device seems to fix the problem.

Another issue I've found is that the data received from the device is delayed.
I'm not sure if this is a problem with bluetooth or if the device itself is
sending it with lag.

I have experienced some occasions where the device itself hangs. Pressing the
button doesn't do anything, the light doesn't respond. I had to physically
remove the batteries to get it responding again. I'm not sure if this is just
because I'm not connecting/disconnecting properly.

This might be obvious but the device's 4 stubby legs must be on a firm surface
for it to work correctly since those are the things that are actually connected
to the sensor. The entire top body is just one solid piece and the legs are the
things that actually "move".

## Reference

I found this [book preview][1] pretty handy for understanding Bluetooth LE /
GATT. Besides that, playing with bluetoothctl is pretty handy for exploring
what's on the device itself.

[1]: https://www.safaribooksonline.com/library/view/getting-started-with/9781491900550/ch04.html
