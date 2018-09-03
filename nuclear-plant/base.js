// For the latest Axiom VirtualNetwork+ scripting documentation, 
// please visit: http://www.zachtronics.com/virtualnetwork/

function getSubtitle() {
    return "NUCLEAR PLANT A235X";
}


/*
	Scenario is constructed from a base file + a scenario file that is added to the end.
	Scenarios must implement these callbacks to set goals succeeded/failed, etc:
		getTitle()
			As per standard puzzle API
		getDescription()
			As per standard puzzle API
		initScenario()
			Called during initializeTestRun, after all common objects are set up.
		onWrite(reg)
			Called when any writable register is written to.
			Reg will be one of rodReg or pumpReg.
		onCycle()
			Called during onCycleFinished(), unless reactor has exploded.
		onShutdown()
			Called each cycle the reactor is counted as "shut down", with activity
			and heat below thresholds for 50 cycles in a row.
*/


// Constants
var ROD_MAX = 1000;
var ROD_FULL_COEFF = 0.4;
var PUMP_MAX = 100;
var PASSIVE_ACTIVITY = 10;
var AVG_ACTIVITY_DECAY = 10;
var AVG_ACTIVITY_COEFF = 1.3;
// this is the value that activity will trend towards at full rods
var ACTIVITY_FULL_ROD_EQUALIBRIUM = PASSIVE_ACTIVITY * ROD_FULL_COEFF / (1 - AVG_ACTIVITY_COEFF * ROD_FULL_COEFF);
var ACTIVITY_TO_TEMP_COEFF = 0.1;
var MIN_POWER_TEMP = 373;
var HEAT_LOSS_FROM_PUMP_COEFF = 0.0005;
var HEAT_LOSS_BASE = 1;
var HEAT_BASE = 300;
var PUMP_TO_POWER_COEFF = 0.03; // scaled so max possible power < 9999
var FAIL_TEMPERATURE = 3000;
var SHUTDOWN_TEMPERATURE = 350;
var SHUTDOWN_ACTIVITY = 5 * ACTIVITY_FULL_ROD_EQUALIBRIUM;
var SHUTDOWN_TIME = 50; // cycles we must be under thresholds for


// Global vars
// inputs
var rodMotor = 50;
var pumpRate = 0;
// state
var rodPosition = ROD_MAX;
var temperature = HEAT_BASE;
var hasExploded = false;
var shutdownCycles = 0;
// initial avg_activity chosen such that it's already at equalibrium
var avg_activity = ACTIVITY_FULL_ROD_EQUALIBRIUM;
// outputs
var activity = avg_activity;
var power = 0;

// objects
var controlRoom, pumpRoom, turbineRoom, reactorRoom, capRoom;
var playerLink, controlPumpLink, controlTurbineLink, pumpCapLink, turbineCapLink;
var reactorPumpLink, reactorTurbineLink, reactorCapLink;
var rodReg, pumpReg, powerReg, pressureReg;
var reactorRodRegs, activityReg, reactorFiles;
var noExplodeGoal;


function initializeTestRun(testRun) {
	/*
	Layout:
		  ::::#::::
		  |   |   |
		  |   |   |
		:::  #f#  :::
		::#--f#f--#::
		:::  #f#  :::
		:::       :::
		 |         |
		 |         |
		 :::::#:::::
		 :::::::::::
		          |
		         :::
		         :::
		         :::
		           0
	*/
	// rooms
	controlRoom = createHost("control",  5,  0, 2, 11);
	pumpRoom    = createHost("pump",     9,  9, 4,  3);
	turbineRoom = createHost("turbine",  9, -1, 4,  3);
	reactorRoom = createHost("reactor", 10,  4, 3,  3);
	capRoom     = createHost("cap",     15,  1, 1,  9);
	// links - note link location uncertain where many possible?
	playerLink = createLink(getPlayerHost(), 800, controlRoom, -1);
	controlPumpLink = createLink(controlRoom, 800, pumpRoom, -1);
	controlTurbineLink = createLink(controlRoom, 801, turbineRoom, -1);
	pumpCapLink = createLink(pumpRoom, 799, capRoom, -1);
	turbineCapLink = createLink(turbineRoom, 799, capRoom, -2);
	reactorPumpLink = createLink(reactorRoom, LINK_ID_NONE, pumpRoom, LINK_ID_NONE);
	reactorTurbineLink = createLink(reactorRoom, LINK_ID_NONE, turbineRoom, LINK_ID_NONE);
	reactorCapLink = createLink(reactorRoom, LINK_ID_NONE, capRoom, LINK_ID_NONE);
	// regs
	rodReg = createRegister(controlRoom, 6, 5, "CTRL");
	pumpReg = createRegister(pumpRoom, 9, 11, "PUMP");
	powerReg = createRegister(turbineRoom, 11, 1, "POWR");
	pressureReg = createRegister(capRoom, 15, 5, "PRSS");
	// inaccessible regs
	reactorRodRegs = [
		createRegister(reactorRoom, 12, 6, "ROD1"),
		createRegister(reactorRoom, 10, 6, "ROD2"),
		createRegister(reactorRoom, 12, 4, "ROD3"),
		createRegister(reactorRoom, 10, 4, "ROD4")
	];
	activityReg = createRegister(reactorRoom, 11, 5, "GEIG");
	// inaccessible files
	var fuelIcon = FILE_ICON_ARCHIVE;
	reactorFiles = [
		createLockedFile(reactorRoom, 200, fuelIcon, ["FUEL"]),
		createLockedFile(reactorRoom, 201, fuelIcon, ["FUEL"]),
		createLockedFile(reactorRoom, 202, fuelIcon, ["FUEL"]),
		createLockedFile(reactorRoom, 203, fuelIcon, ["FUEL"]),
	];
	reactorFiles.forEach(function(file) {
		setFileInitiallyCollapsed(file);
	});

	// Reg handlers
	setRegisterReadCallback(rodReg, function() { return rodPosition; });
	setRegisterWriteCallback(rodReg, function(v) { rodMotor = clamp(0, v, 100); onWrite(rodReg); });
	setRegisterReadCallback(pumpReg, function() { return pumpRate; });
	setRegisterWriteCallback(pumpReg, function(v) { pumpRate = clamp(0, v, PUMP_MAX); onWrite(pumpReg); });
	setRegisterReadCallback(powerReg, function() { return power; });
	setRegisterReadCallback(pressureReg, function() { return ifExplode(-9999, temperature); });
	// These regs can't be read, they're there so the in-game display shows the value
	setRegisterReadCallback(activityReg, function() { return ifExplode(-9999, activity); });
	reactorRodRegs.forEach(function(reg) {
		setRegisterReadCallback(reg, function() { return ifExplode(-9999, rodPosition); });
	});

	noExplodeGoal = requireCustomGoal("Do not allow the reactor to burst (pressure > " + FAIL_TEMPERATURE.toString() + ")");

	// scenario-specific init of values, set goals, etc.
	initScenario();

}


function clamp(min, v, max) {
	if (min !== undefined && v < min) { return min; }
	if (max !== undefined && v > max) { return max; }
	return v;
}


function ifExplode(alt, value) {
	return (hasExploded) ? alt : value;
}


function onCycleFinished() {

	// Move rods according to motor, and reset motor
	rodPosition = clamp(0, rodPosition + rodMotor - 50, MAX_RODS);
	rodMotor = 50;

	// If we've exploded, freeze values at their final values
	if (hasExploded) { return; }

	// Calculate activity. Note rod damping coefficient ranges linearly with rod setting
	// from ROD_FULL_COEFF at fully inserted to 1 at fully retracted.
	rodCoeff = 1 - (1 - ROD_FULL_COEFF) * rodPosition / MAX_RODS;
	activity = rodCoeff * (PASSIVE_ACTIVITY + avg_activity * AVG_ACTIVITY_COEFF);

	// Update average activity for later ticks
	avg_activity = (avg_activity * AVG_ACTIVITY_DECAY + activity) / (AVG_ACTIVITY_DECAY + 1);

	// Calculate power using old temperature
	power = pumpRate * PUMP_TO_POWER_COEFF * clamp(0, temperature - MIN_POWER_TEMP);

	// Calculate new temperature: add heat from activity, remove heat from cooling and base loss
	temperature = clamp(HEAT_BASE,
		temperature + activity * ACTIVITY_TO_TEMP_COEFF
		- pumpRate * HEAT_LOSS_FROM_PUMP_COEFF * (temperature - HEAT_BASE)
		- HEAT_LOSS_BASE
	);

	// Check if the reactor has exploded
	if (temperature > FAIL_TEMPERATURE) {
		hasExploded = true;
		setCustomGoalFailed(noExplodeGoal);
		power = 0;
		// Disable links
		[pumpCapLink, turbineCapLink].forEach(function(link) {
			modifyLink(link, LINK_ID_NONE, LINK_ID_NONE);
		});
	}

	onCycle();

	// check if shutdown
	if (temperature <= SHUTDOWN_TEMPERATURE && activity <= SHUTDOWN_ACTIVITY) {
		shutdownCycles++;
		if (shutdownCycles >= SHUTDOWN_TIME) {
			onShutdown();
		}
	} else {
		shutdownCycles = 0;
	}

}


// Base file ends here.
