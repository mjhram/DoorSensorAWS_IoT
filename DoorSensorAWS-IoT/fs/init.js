load('api_aws.js');
load('api_gpio.js');
load("api_sys.js");
load("api_timer.js");
load('api_esp8266.js');
load('api_config.js');
let LED = 2;
let SENSOR = 4;
let state = {
  counter: 0,
  sts: 0//sensor state
};
GPIO.set_mode(LED, GPIO.MODE_OUTPUT);
Timer.set(500 , true , function() {
  GPIO.toggle(LED);
}, null);
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
  AWS.Shadow.update(0, {
    reported: state,
  });
}
AWS.Shadow.setStateHandler(function(ud, ev, reported, desired, reported_md, desired_md) {
  if (ev === AWS.Shadow.CONNECTED) {
    reportState();
    Timer.set(1*60*1000 , false , function() {
      print('Deep:', "Sleep");
      let deepSleep = ffi('int mgos_system_deep_sleep_d(double)');
      deepSleep(60*60e6);
    }, null);
    return;
  }
  if (ev !== AWS.Shadow.GET_ACCEPTED && ev !== AWS.Shadow.UPDATE_DELTA) {
    return;
  }
  updateState(reported);
  updateState(desired);
  if (ev === AWS.Shadow.UPDATE_DELTA) {
    reportState();
  }
}, null);
