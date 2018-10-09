

// constants
var HEAT_SAFETY_MARGIN = 500;
var TARGET_UPTIME = 0.95;
var TARGET_UPTIME_STR = TARGET_UPTIME * 100 + "%";
var MAX_SAFE_POWER = PUMP_MAX * PUMP_TO_POWER_COEFF * (
	FAIL_TEMPERATURE - HEAT_SAFETY_MARGIN - MIN_POWER_TEMP
);

// globals
var onTargetCycles;
var totalCycles;
var goalReached;
var goalFailed;

// objects
var uptimeGoal;
var shutdownGoal;
var goalWindow;
var demandReg;


function getTitle() {
	return "REACTOR 3: MANAGER";
}


function getDescription() {
	return (
		"Read the power output demand from #DMND, and use the control rods and pump flow rate " +
		"to make the reactor produce that amount of power. The demand will change over time.\n" +
		"The power plant uptime is measured as the % of cycles where the power output is within " +
		"10% of demand. Your goal is to achieve a " + TARGET_UPTIME_STR + " uptime, " +
		"at which point #DMND will read 0.\n" +
		"When this is reached, shut down the reactor by fully inserting the control rods, " +
		"and remove all traces.\n" +
		"Hint: a lower pump rate is more efficient, allowing the reactor to operate at a lower, " +
		"more controllable geiger count. However, high pump rates keep the reactor cool and thus " +
		"lower pressure, allowing higher power output levels to be reached safely."
	);
}


function initScenario() {
	onTargetCycles = 0;
	totalCycles = 0;
	goalReached = false;
	goalFailed = false;

	uptimeGoal = requireCustomGoal("Have power output within 10% of demand " + TARGET_UPTIME_STR + " of the time");
	shutdownGoal = requireCustomGoal("When you are done, shut down the reactor");

	goalWindow = createWindow("Power Output Status", 100, 40, 30, 3);

	demandReg = createRegister(controlRoom, 5, -5, "DMND");
	setRegisterReadCallback(demangReg, getDemand);

	// TODO randomise demand here
}


function getDemand() {
	return 1000; // TODO
}


function onWrite(reg) {
}


function onCycle() {
	var status;

	if (goalReached) { return; }

	totalCycles++;

	var powerTarget = getDemand();
	if (power < powerTarget * 0.9) {
		status = "TOO LOW";
	} else if (power > powerTarget * 1.1) {
		status = "TOO HIGH";
	} else {
		status = "ON TARGET";
		onTargetCycles++;
	}

	var uptime = onTargetCycles / totalCycles;
	if (uptime > TARGET_UPTIME) {
		status = "COMPLETE";
	}

	clearWindow(goalWindow);
	printWindow(goalWindow, "Output Status: " + status);
	printWindow(goalWindow, "Uptime: " + (uptime * 100).toFixed(2) + "%");
	printWindow(goalWindow, "        (" + onTargetCycles + " of " + totalCycles + ")");
}


function onExplode() {
	clearWindow(goalWindow);
	printWindow(goalWindow, "Output Status: ERROR");
	goalFailed = true;
}


function onShutdown() {
	if (goalFailed || !goalReached) { return; }

	setCustomGoalCompleted(shutdownGoal);
	setCustomGoalCompleted(noExplodeGoal);
}
