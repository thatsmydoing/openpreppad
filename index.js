let device = require('./device');
let blessed = require('blessed');

let screen = blessed.screen({
  smartCSR: true
});

screen.title = 'OpenPrepPad';

let container = blessed.box({
  top: 'center',
  left: 'center',
  width: 50,
  height: 17,
  border: {
    type: 'line'
  },
  style: {
    bg: 'cyan-bg'
  }
})

let box = blessed.BigText({
  top: 0,
  right: 0,
  width: 'shrink',
  height: 'shrink',
  tags: true,
  style: {
    fg: 'white'
  }
});

container.append(box);
screen.append(container);

let statusLine = blessed.Text({
  bottom: 0,
  width: '100%',
  height: 'shrink',
  content: 'Connecting...',
  style: {
    fg: 'white',
    bg: 'blue'
  }
});

screen.append(statusLine);

let helpBox = blessed.box({
  top: 0,
  left: 0,
  width: 'shrink',
  height: 'shrink',
  content: 'q - Quit\nz - Zero/Tare'
});

screen.append(helpBox);

screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  process.exit(0);
});
screen.key(['z'], function(ch, key) {
  device.button$.onNext('');
});

// Focus our element.
box.focus();

// Render the screen.
screen.render();

device.weight$.subscribe(w => {
  box.setContent(w+'g');
  screen.render();
})

device.connStatus$.subscribe(s => {
  if(s.state == 'connected') {
    statusLine.setContent('Connected to Prep Pad '+s.serial);
  }
  else {
    statusLine.setContent('Connecting...');
  }
  screen.render();
})
