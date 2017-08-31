// Load Mongoose OS API
load('api_aws.js');
load('api_gpio.js');
load("api_sys.js");
load("api_timer.js");
load('api_esp8266.js');
load('api_config.js');

// Constants for ESP8266
// TODO: support other platforms
let led = 2;
let SENSOR = 5;

let state = {
  counter: 0,
  sts: 0//sensor state
};

GPIO.set_mode(led, GPIO.MODE_OUTPUT);
Timer.set(1000 , true , function() {
  let value = GPIO.toggle(led);
  print(value ? 'Tick' : 'Tock', 'uptime:');
}, null);

GPIO.set_mode(SENSOR, GPIO.MODE_INPUT);
GPIO.set_int_handler(SENSOR, GPIO.INT_EDGE_ANY, function(pin) {
  state.sts = GPIO.read(SENSOR);
  AWS.Shadow.update(0, {
    desired: {
      counter: state.counter + 1,
      sts: state.sts
      //ledOn: LED_ON//!state.ledOn,
    }
  });
  if(state.sts == 1) {
    print("Door Opened");
  } else {
    print("Door Closed");
  }

}, null);
GPIO.enable_int(pin);

/*GPIO.set_button_handler(
    SENSOR, GPIO.PULL_DOWN, GPIO.INT_EDGE_POS, 200 ,
    function(pin, ud) {
      let updRes = AWS.Shadow.update(0, {
        desired: {
          counter: state.counter + 1,
          //ledOn: LED_ON//!state.ledOn,
        }
      });
      print("Click! Updated:", updRes);
    }, null
);*/

function updateState(newSt) {
  if (newSt.counter !== undefined) {
    state.counter = newSt.counter;
  }
  if (newSt.sts !== undefined) {
    state.sts = newSt.sts;
  }
}

function reportState() {
  state.sts = GPIO.read(SENSOR);
  print('Reporting state:', JSON.stringify(state));
  AWS.Shadow.update(0, {
    reported: state,
  });
}

MQTT.setEventHandler(function(conn, ev, edata) {
  if (ev !== 0)  {
    if(ev === MQTT.EV_CLOSE) {
      print('MQTT closed');
    }
    print('MQTT event handler: got', ev);
  }

}, null);

AWS.Shadow.setStateHandler(function(ud, ev, reported, desired, reported_md, desired_md) {
  print('Event:', ev, '('+AWS.Shadow.eventName(ev)+')');

  if (ev === AWS.Shadow.CONNECTED) {
    reportState();
    //remove deep sleep
    Timer.set(30*60*1000 , false , function() {//heart beat
     /*print('Deep:', "Sleep");
      let deepSleep = ffi('int mgos_system_deep_sleep_d(double)');
      deepSleep(60*60e6);*/
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
  //updateLed();

  if(ev === AWS.Shadow.GET_ACCEPTED) {
    state.counter = 0;
  }
  print('New state:', JSON.stringify(state));

  if (ev === AWS.Shadow.UPDATE_DELTA) {
    reportState();
  }
}, null);
