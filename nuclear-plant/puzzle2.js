

// constants
var HEAT_SAFETY_MARGIN = 500;
var STEADY_TIME = 500;

// globals
var powerTarget;
var onTargetCycles;
var goalReached;
var goalFailed;

// objects
var noChangePumpGoal;
var powerTargetGoal;
var shutdownGoal;
var deleteFileGoal;
var specFile;
var goalWindow;


function getTitle() {
	return "REACTOR REGULATOR 2";
}


function getDescription() {
	return (
		"Read the power level in file 300. Using the control rods only, have the reactor " +
		"output that approximate power level (up to 10% higher or lower) for at least " +
		STEADY_TIME.toString() + " cycles. " +
		"You may not adjust the pumping rate for this mission.\n" +
		"When your task is complete, shut down the reactor by fully inserting the control rods, " +
		"and remove all traces.\n" +
		"Hint: Retracting the control rods will drive more geiger counter activity, which will cause " +
		"pressure and power output to rise. But be careful! Geiger activity can be slow to respond " +
		"and you may find yourself unable to adjust before the pressure reaches breaking point."
	);
}


function initScenario() {
	onTargetCycles = 0;
	goalReached = false;
	goalFailed = false;

	noChangePumpGoal = requireCustomGoal("Do not modify pump rate");
	mergeRequirements(2, "Do not modify pump rate or allow reactor to burst");
	powerTargetGoal = requireCustomGoal("Maintain power within 10% of the given level for " + STEADY_TIME.toString() + " cycles");
	shutdownGoal = requireCustomGoal("When you're done, shut down the reactor");

	goalWindow = createWindow("Power Output Status", 100, 40, 30, 3);

	// Randomise targets
	fixedPumpRate = randomInt(10, 100);
	maxSafeTemperature = FAIL_TEMPERATURE - 500
	maxSafePower = fixedPumpRate * PUMP_TO_POWER_COEFF * (maxSafeTemperature - MIN_POWER_TEMP)
	// Note 100 min power will always be < maxSafePower and hopefully far enough from 0 to avoid
	// doing weird things to players' code due to clipping.
	powerTarget = randomInt(100, maxSafePower);

	// Set initial conditions and add specifying file
	specFile = createNormalFile(controlRoom, 300, FILE_ICON_DATA, [powerTarget]);
	// Cannot add delete file goal: too many goals
	// deleteFileGoal = requireDeleteFile(specFile, "Delete the file containing the power level");
	pumpRate = fixedPumpRate;
}


function onWrite(reg) {
	if (reg === pumpReg) {
		setCustomGoalFailed(noChangePumpGoal);
		goalFailed = true;
	}
}


function onCycle() {
	var status;

	if (goalReached) { return; }

	if (power < powerTarget * 0.9) {
		status = "TOO LOW";
		onTargetCycles = 0;
	} else if (power > powerTarget * 1.1) {
		status = "TOO HIGH";
		onTargetCycles = 0;
	} else {
		status = "PASSING";
		onTargetCycles++;
		if (onTargetCycles >= STEADY_TIME) {
			onTargetCycles = 0;
			goalReached = true;
			setCustomGoalCompleted(powerTargetGoal);
			status = "COMPLETE";
		}
	}

	clearWindow(goalWindow);
	printWindow(goalWindow, "Output Status: " + status);
	if (status === "PASSING") {
		drawGauge(goalWindow, 30, "Time", onTargetCycles, 1000);
	}

}


function onExplode() {
	clearWindow(goalWindow);
	printWindow(goalWindow, "Output Status: ERROR");
	goalFailed = true;
}


function onShutdown() {
	if (goalFailed || !goalReached) { return; }

	setCustomGoalCompleted(shutdownGoal);
	setCustomGoalCompleted(noChangePumpGoal);
	setCustomGoalCompleted(noExplodeGoal);
}
