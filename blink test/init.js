// Load Mongoose OS API
load('api_aws.js');
load('api_gpio.js');
load("api_sys.js");
load("api_timer.js");
load('api_esp8266.js');
load('api_config.js');

/*using flashBtn as the trigger
 //using builtin led as output
 //shadow {
 ledOn => led state
 counter => triggering count
 }
 //if flashBtn is triggered => led=on and keep it on (alarm simulation) untill shadow is changed
 // if shadow->ledon=false => turn off led
 */

// Constants for ESP8266
// TODO: support other platforms
let LED_GPIO = 2;
let LED_OFF = false;
let LED_ON = true;
let BUTTON_GPIO = 4;
let BUTTON_PULL = GPIO.PULL_DOWN;
let BUTTON_EDGE = GPIO.INT_EDGE_POS;

let state = {
  counter: 0,
  //bar: 0,
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
          ledOn: LED_OFF//!state.ledOn,
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
  /*if (newSt.bar !== undefined) {
   state.bar = newSt.bar;
   }*/
  if (newSt.ledOn !== undefined) {
    state.ledOn = newSt.ledOn;
  }
  //if desired.chk = 1 => update sts & chk=0
  //this should be here, since it will cause update state muliple times

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

GPIO.set_button_handler(
    BUTTON_GPIO, BUTTON_PULL, BUTTON_EDGE, 200 /*debounce ms*/,
    function(pin, ud) {
      let updRes = AWS.Shadow.update(0, {
        desired: {
          counter: state.counter + 1,
          ledOn: LED_ON//!state.ledOn,
        }
      });
      print("Click! Updated:", updRes);
    }, null
);

AWS.Shadow.setStateHandler(function(ud, ev, reported, desired, reported_md, desired_md) {
  print('Event:', ev, '('+AWS.Shadow.eventName(ev)+')');

  if (ev === AWS.Shadow.CONNECTED) {
    reportState();
    Timer.set(1*60*1000 , false /* once */, function() {
      //Sys.usleep(10e6);
      print('Deep:', "Sleep");
      let deepSleep = ffi('int mgos_system_deep_sleep_d(double)');
      deepSleep(10000000);
    }, null);
    return;
  }

  if (ev !== AWS.Shadow.GET_ACCEPTED && ev !== AWS.Shadow.UPDATE_DELTA) {
    return;
  }

  print('Reported state:', JSON.stringify(reported));
  print('Desired state :', JSON.stringify(desired));

  /*
   * Here we extract values from previosuly reported state (if any)
   * and then override it with desired state (if present).
   */
  updateState(reported);
  updateState(desired);
  updateLed();

  print('New state:', JSON.stringify(state));

  if (ev === AWS.Shadow.UPDATE_DELTA) {
    //if desired.chk = 1 => update sts.
    // this will also loop it
    /*if (desired.chk !== undefined && desired.chk==1) {
     state.chk = 0;
     state.sts = GPIO.read(BUTTON_GPIO);
     }*/
    reportState();
  }
}, null);
