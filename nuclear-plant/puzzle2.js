

// constants
var HEAT_SAFETY_MARGIN = 500;
var STEADY_TIME = 1000;

// globals
var powerTarget;
var onTargetCycles = 0;
var goalReached = false;

// objects
var noChangePumpGoal;
var powerTargetGoal;
var shutdownGoal;
var deleteFileGoal;
var specFile;


function getTitle() {
	return "REACTOR REGULATOR 2";
}


function getDescription() {
	return "TODO";
}


function initScenario() {
	noChangePumpGoal = requireCustomGoal("Do not modify pump rate");
	powerTargetGoal = requireCustomGoal("Maintain power within 10% of the given level for " + STEADY_TIME.toString() + " cycles");
	shutdownGoal = requireCustomGoal("When you're done, shut down the reactor");

	// Randomise targets
	fixedPumpRate = randomInt(10, 100);
	maxSafeTemperature = FAIL_TEMPERATURE - 500
	maxSafePower = fixedPumpRate * PUMP_TO_POWER_COEFF * (maxSafeTemperature - MIN_POWER_TEMP)
	// Note 100 min power will always be < maxSafePower and hopefully far enough from 0 to avoid
	// doing weird things to players' code due to clipping.
	powerTarget = randomInt(100, maxSafePower);

	// Set initial conditions and add specifying file
	specFile = createNormalFile(controlRoom, 200, FILE_ICON_DATA);
	deleteFileGoal = requireDeleteFile(specFile, "Delete the file containing the power level");
	pumpRate = fixedPumpRate;
}


function onWrite(reg) {
	if (reg === pumpReg) {
		setCustomGoalFailed(noChangePumpGoal);
	}
}


function onCycle() {
	if (goalReached) { return; }

	if (clamp(powerTarget * 0.9, power, powerTarget * 1.1) === power) {
		onTargetCycles++;
		if (onTargetCycles >= STEADY_TIME) {
			onTargetCycles = 0;
			goalReached = true;
			setCustomGoalCompleted(powerTargetGoal)
		}
	} else {
		onTargetCycles = 0;
	}
}


function onShutdown() {
	if (!goalReached) { return; }

	setCustomGoalCompleted(shutdownGoal);
	setCustomGoalCompleted(noChangePumpGoal);
	setCustomGoalCompleted(noExplodeGoal);
}
