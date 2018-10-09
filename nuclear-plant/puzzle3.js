

// constants
var HEAT_SAFETY_MARGIN = 500;
var TARGET_UPTIME = 0.80;
var TARGET_UPTIME_STR = TARGET_UPTIME * 100 + "%";
var MAX_SAFE_POWER = PUMP_MAX * PUMP_TO_POWER_COEFF * (
	FAIL_TEMPERATURE - HEAT_SAFETY_MARGIN - MIN_POWER_TEMP
);
var MIN_POWER = 100;

// globals
var onTargetCycles;
var totalCycles;
var goalReached;
var goalFailed;
var demandMin;
var demandMax;
var demandParams; // list of [amplitude, period, phase] describing sine waves
var currentDemand; // demand is cached each cycle for performance.
var savedCanary; // detects if we don't need to re-calculate expensive things, see initScenario

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
		"at which point #DMND will become 0. " +
		"When this is reached, shut down the reactor by fully inserting the control rods, " +
		"and remove all traces.\n" +
		"Hint: A lower pump rate is more efficient, allowing the reactor to operate at a lower, " +
		"more controllable geiger count. High pump rates keep the reactor cooler " +
		"(lower pressure), allowing higher power output levels to be reached."
	);
}


function initScenario() {
	onTargetCycles = 0;
	totalCycles = 0;
	goalReached = false;
	goalFailed = false;

	uptimeGoal = requireCustomGoal("Have power output within 10% of demand " + TARGET_UPTIME_STR + " of the time");
	shutdownGoal = requireCustomGoal("When you are done, shut down the reactor");

	goalWindow = createWindow("Power Output Status", 100, 38, 30, 5);

	demandReg = createRegister(controlRoom, 5, -5, "DMND");
	setRegisterReadCallback(demandReg, function() { return (goalReached) ? 0 : currentDemand });

	// initializeTestRun gets called very often, it seems.
	// We need to be fast in order to prevent lag.
	// However, the random seed should be the same unless the user changed the test run.
	// That, plus the fact that globals are preserved, lets us cache the previous call's
	// values for demandParams/demandMin/demandMax which are computationally intensive to calculate.
	// But we only want to do this if the random seed is unchanged. So we use a canary value with
	// an extremely low chance of being the same for different seeds.
	var canary = randomInt(0, 10);
	if (canary == savedCanary) return;
	savedCanary = canary;

	demandParams = [];
	// we use the i var to make early parts long and big, and later parts short and small.
	for (var i = 0; i < 5; i++) {
		demandParams[i] = {
			amp: randomFloat() / (i+2), // decreasing for each part, scale doesn't matter as we rescale later.
			period: randomInt(1600, 3200) * (10-i), // decreasing for each part, ~4000-20000 cycles.
			phase: randomFloat(), // fully random 0-1
		};
	}
	// we take max and min sampling over first 100000 cycles, normalise by those values, and clamp if they
	// are exceeded.
	demandMin = _getDemand(0, 1, 0);
	demandMax = demandMin;
	for (var t = 1; t < 100000; t += 100) {
		var value = _getDemand(t, 1, 0);
		if (value < demandMin) demandMin = value;
		if (value > demandMax) demandMax = value;
	}
	demandMax -= demandMin;

	currentDemand = getDemand();
}


function randomFloat() {
	return randomInt(0, 1073741824) / 1073741824
}


function _getDemand(t, scale, offset) {
	// calculate (curve(t) - offset) / scale.
	// when offset is curve min, and scale is curve max - curve min,
	// output is between 0 and 1.
	var value = 0;
	demandParams.forEach(function(curve) {
		value += curve.amp * Math.sin(2 * Math.PI * (t / curve.period + curve.phase))
	})
	return (value - offset) / scale;
}


function getDemand() {
	var normalised = clamp(0, _getDemand(totalCycles, demandMax, demandMin), 1);
	return Math.floor((MAX_SAFE_POWER - MIN_POWER) * normalised + MIN_POWER);
}


function onWrite(reg) {
}


function onCycle() {
	var status;

	if (goalReached) { return; }

	totalCycles++;
	currentDemand = getDemand();

	if (power < currentDemand * 0.9) {
		status = "TOO LOW";
	} else if (power > currentDemand * 1.1) {
		status = "TOO HIGH";
	} else {
		status = "ON TARGET";
		onTargetCycles++;
	}

	var uptime = onTargetCycles / totalCycles;
	if (uptime > TARGET_UPTIME) {
		status = "COMPLETE";
		goalReached = true;
		setCustomGoalCompleted(uptimeGoal);
	}

	clearWindow(goalWindow);
	printWindow(goalWindow, "Output Status: " + status);
	printWindow(goalWindow, "Uptime: " + (uptime * 100).toFixed(2) + "%");
	printWindow(goalWindow, "        (" + onTargetCycles + " of " + totalCycles + ")");
	drawGauge(goalWindow, 30, " Power", power, MAX_POWER);
	drawGauge(goalWindow, 30, "Target", currentDemand, MAX_POWER);
}


function onExplode() {
	clearWindow(goalWindow);
	printWindow(goalWindow, "Output Status: ERROR");
}


function onShutdown() {
	if (!goalReached) { return; }

	setCustomGoalCompleted(shutdownGoal);
	setCustomGoalCompleted(noExplodeGoal);
}
