2017Aug8:
---------
V.1 is over. Working on battery is not feasable since it will last for less than a week.


features:
- AWS shadow state:
	{
	  "desired": {
	    "ledOn": false,
	    "counter": 0
	  },
	  "reported": {
	    "sts": 0,
	    "ledOn": false,
	    "counter": 0
	  }
	}
	
	description:
	ledOn: indicates wheter the led is on or off. it is turned on once alarm is triggered
	counter: number of triggers (number of door is opened and closed)
	sts: indicates current state of door: 0=closed, 1=open. this state will be reported to AWS shadow on
		- connecting the device to AWS
		- update_delta event: when changing state from AWS shadow.

Additional:
-led flashing:
	-alarm: on=.2sec, off=1sec
	 
-state.arm: true,	
	=false, don't trigger alarm.
	=true, trigger alarm
	-the state.arm can only be modified on shadow, updated to device once it is connected.
	-server side: arm:false, dont send push notification
	-device side: if arm:false, turn led off
-state.bat: false,
	=true trigger battery low alarm
	=false normal operation
-to reserve power, deepsleep until alarm is triggered. return to deep sleep in the following cases:
	-clear alarm remotely, by ledOn:false
	-clear alarm after 30min passed
 

	

	
