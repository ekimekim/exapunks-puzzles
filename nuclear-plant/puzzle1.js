

// globals
var scram;
var safePressure;
var inputCountdown;
var controlsFailed;
var exploded;

// objects
var noChangeControlsGoal;
var scramGoal;
var specFile;
var logWindow;


function getTitle() {
	return "REACTOR 1: MONITOR";
}


function getDescription() {
	return (
		"Monitor the chamber pressure as people adjust the controls. " +
		"If it exceeds the safe " +
		"pressure given in file 300, SCRAM the reactor by fully inserting the control rods " +
		"and setting the pumps to 100%, then remove all traces.\n" +
		"Do not modify the coolant pump rate or control rods until the maximum " +
		"safe pressure is exceeded. " +
		"Do not allow the reactor to burst.\n" +
		"Hint: Control the pumps by writing a value 0-100 to #PUMP. " +
		"Control the control rods by writing a value 0-100 to the #CTRL motor. " +
		"A value < 50 retracts rods by up to 50 units (eg. writing 40 will retract by 10), " +
		"a value > 50 inserts rods by up to 50 units. Read pressure from #PRSS."
	);
}


function initScenario() {
	scram = false;
	controlsFailed = false;
	exploded = false;
	inputCountdown = 20;

	noChangeControlsGoal = requireCustomGoal("Do not modify the pump or control rods until needed");
	scramGoal = requireCustomGoal("When pressure exceeds value given in file 300, shut down the reactor.");

	safePressure = randomInt(20, 27) * 100;
	specFile = createNormalFile(controlRoom, 300, FILE_ICON_DATA, [safePressure]);

	logWindow = createWindow("Operator Log", 90, 40, 40, 3);
}


function onWrite(reg) {
	if (!scram) {
		setCustomGoalFailed(noChangeControlsGoal);
		controlsFailed = true;
	}
}


function onCycle() {
	var change, direction, down;

	if (scram) {
		return;
	}

	if (temperature > safePressure) {
		scram = true;
		if (!controlsFailed) {
			setCustomGoalCompleted(noChangeControlsGoal);
		}
		printWindow(logWindow, "Operator ran away.");
		return;
	}

	// Random human inputs every N cycles - either change flow rate or rods
	if (inputCountdown-- < 0) {
		inputCountdown = randomInt(30, 60);
		if (randomBool(0.25)) {
			if (pumpRate == 0) {
				down = false;
			} else if (pumpRate == 100) {
				down = true;
			} else {
				down = randomBool(0.6)
			}
			if (down) {
				direction = "down";
				change = randomInt(10, 30);
				pumpRate -= change;
			} else {
				direction = "up";
				change = randomInt(10, 30);
				pumpRate += change;
			}
			pumpRate = clamp(0, pumpRate, 100);
			printWindow(logWindow, "Operator adjusted pump rate " + direction + " by " + change + "%");
		} else {
			if (rodPosition == 1000) {
				down = true;
			} else if (rodPosition == 0) {
				down = false;
			} else {
				down = randomBool(0.8)
			}
			if (down) {
				direction = "retracted";
				change = randomInt(20, 50);
				rodMotor = 50 - change;
			} else {
				direction = "inserted";
				change = randomInt(10, 30);
				rodMotor = 50 + change;
			}
			printWindow(logWindow, "Operator " + direction + " control rods " + change + " units");
		}
	}
}


function onExplode() {
}


function onShutdown() {
	if (!scram) {
		return;
	}
	setCustomGoalCompleted(scramGoal);
	setCustomGoalCompleted(noExplodeGoal);
}
