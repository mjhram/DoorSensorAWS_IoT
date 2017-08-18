load('api_aws.js');
load('api_gpio.js');
load("api_sys.js");
load("api_timer.js");
load('api_esp8266.js');
load('api_config.js');

// TODO: support other platforms
let LED_GPIO = 2;
let LED_OFF = false;
let LED_ON = true;
let BUTTON_GPIO = 4;

let state = {
  counter: 0,
  ledOn: LED_OFF,
  sts: 0//sensor state
};
let timerid = -1;

function updateLed() {
  GPIO.write(LED_GPIO, state.ledOn ? 0 : 1);
  if(state.ledOn === LED_ON) {
    //turn off after some time
    timerid = Timer.set(2*60*1000 , false /* once */, function() {
      let updRes = AWS.Shadow.update(0, {
        desired: {
          counter: state.counter + 1,
          ledOn: LED_OFF
        }
      });
      timerid = -1;
      print("Click! Updated:", updRes);
    }, null);
  }
}

function updateState(newSt) {
  if (newSt.counter !== undefined) {
    state.counter = newSt.counter;
  }

  if (newSt.ledOn !== undefined) {
    state.ledOn = newSt.ledOn;
  }
}

function reportState() {
  state.sts = GPIO.read(BUTTON_GPIO);
  print('Reporting state:', JSON.stringify(state));
  AWS.Shadow.update(0, {
    reported: state,
  });
}

GPIO.set_mode(LED_GPIO, GPIO.MODE_OUTPUT);
updateLed();

AWS.Shadow.setStateHandler(function(ud, ev, reported, desired, reported_md, desired_md) {
  print('Event:', ev, '('+AWS.Shadow.eventName(ev)+')');

  if (ev === AWS.Shadow.CONNECTED) {
    reportState();
    Timer.set(1*60*1000 , false /* once */, function() {
      print('Deep:', "Sleep");
      let deepSleep = ffi('int mgos_system_deep_sleep_d(double)');
      deepSleep(60*60e6);
    }, null);
    return;
  }

  if (ev !== AWS.Shadow.GET_ACCEPTED && ev !== AWS.Shadow.UPDATE_DELTA) {
    return;
  }

  print('Reported state:', JSON.stringify(reported));
  print('Desired state :', JSON.stringify(desired));

  updateState(reported);
  updateState(desired);
  updateLed();

  print('New state:', JSON.stringify(state));

  if (ev === AWS.Shadow.UPDATE_DELTA) {
    reportState();
  }
}, null);
