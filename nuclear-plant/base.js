// For the latest Axiom VirtualNetwork+ scripting documentation, 
// please visit: http://www.zachtronics.com/virtualnetwork/

function getSubtitle() {
    return "NUCLEAR PLANT A235X";
}

// Constants
var ROD_MAX = 1000;
var ROD_FULL_COEFF = 0.4;
var PUMP_MAX = 100;
var PASSIVE_ACTIVITY = 10;
var AVG_ACTIVITY_DECAY = 10;
var AVG_ACTIVITY_COEFF = 1.3;
var ACTIVITY_TO_TEMP_COEFF = 0.1;
var MIN_POWER_TEMP = 373;
var HEAT_LOSS_FROM_PUMP_COEFF = 0.0005;
var HEAT_LOSS_BASE = 1;
var HEAT_BASE = 300;
var PUMP_TO_POWER_COEFF = 0.05;

// Global vars
// inputs
var rodMotor = 50;
var pumpRate = 0;
// state
var rodPosition = ROD_MAX;
var temperature = HEAT_BASE;
// initial avg_activity chosen such that it's already at equalibrium
var avg_activity = PASSIVE_ACTIVITY * ROD_FULL_COEFF / (1 - AVG_ACTIVITY_COEFF * ROD_FULL_COEFF);
// outputs
var activity = avg_activity;
var power = 0;

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
	var controlRoom = createHost("control",  5,  0, 2, 11);
	var pumpRoom    = createHost("pump",     9,  9, 4,  3);
	var turbineRoom = createHost("turbine",  9, -1, 4,  3);
	var reactorRoom = createHost("reactor", 10,  4, 3,  3);
	var capRoom = createHost("cap",     15,  1, 1,  9);
	// links - note link location uncertain where many possible?
	var playerLink = createLink(getPlayerHost(), 800, controlRoom, -1);
	var controlPumpLink = createLink(controlRoom, 800, pumpRoom, -1);
	var controlTurbineLink = createLink(controlRoom, 801, turbineRoom, -1);
	var pumpCapLink = createLink(pumpRoom, 799, capRoom, -1);
	var turbineCapLink = createLink(turbineRoom, 799, capRoom, -2);
	var reactorPumpLink = createLink(reactorRoom, LINK_ID_NONE, pumpRoom, LINK_ID_NONE);
	var reactorTurbineLink = createLink(reactorRoom, LINK_ID_NONE, turbineRoom, LINK_ID_NONE);
	var reactorCapLink = createLink(reactorRoom, LINK_ID_NONE, capRoom, LINK_ID_NONE);
	// regs
	var rodReg = createRegister(controlRoom, 1, 5, "CTRL");
	var pumpReg = createRegister(pumpRoom, 0, 2, "PUMP");
	var powerReg = createRegister(turbineRoom, 2, 2, "POWR");
	var pressureReg = createRegister(capRoom, 4, 0, "PRSS"); // TODO use same pressure abbrev as centrifuge mission
	// inaccessible regs
	var reactorRodRegs = [
		createRegister(reactorRoom, 2, 2, "ROD1"),
		createRegister(reactorRoom, 0, 2, "ROD2"),
		createRegister(reactorRoom, 2, 0, "ROD3"),
		createRegister(reactorRoom, 0, 0, "ROD4")
	];
	var activityReg = createRegister(reactorRoom, 1, 1, "GEIG");
	// inaccessible files
	var fuelIcon = FILE_ICON_ARCHIVE
	var reactorFiles = [
		createLockedFile(reactorRoom, 200, fuelIcon, ["FUEL"]),
		createLockedFile(reactorRoom, 201, fuelIcon, ["FUEL"]),
		createLockedFile(reactorRoom, 202, fuelIcon, ["FUEL"]),
		createLockedFile(reactorRoom, 203, fuelIcon, ["FUEL"]),
	];
	reactorFiles.forEach(function(file) {
		setFileInitiallyCollapsed(file);
	});

	// Reg handlers

}

function onCycleFinished() {
}
