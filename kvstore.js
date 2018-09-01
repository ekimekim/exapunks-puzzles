// For the latest Axiom VirtualNetwork+ scripting documentation, 
// please visit: http://www.zachtronics.com/virtualnetwork/

function getTitle() {
    return "KEY VALUE STORE";
}

function getSubtitle() {
    return "DATABASE SOFTWARE";
}

function getDescription() {
    return (
		"Create a simple key-value datastore that remembers values that are set " +
		"and returns them on demand.\n" +
		"The CLIENT host contains a file 200. Read commands " +
		"in the format 1, KEY, VALUE to set a value, or 0, KEY to return a previously set value. " +
		"Keys will be any single value, and may be a number from -999 to 999 or a keyword. " +
		"Values may be any number or keyword. " +
		"Values must be written in the order they were requested to an output file in the CLIENT host.\n" +
		"If a GET specifies a key that has never been set, 0 should be returned."
	);
}

function initializeTestRun(testRun) {
	var bridgeHost = createHost("bridge", 5, 0, 1, 6);
    var clientHost = createHost("client", 8, 4, 1, 3);
	createLink(getPlayerHost(), 800, bridgeHost, -1);
	createLink(clientHost, 800, bridgeHost, -2);

	var numKeys = randomInt(4, 12);
	var keys = [];
	for (var i = 0; i < numKeys; i++) {
		if (randomBool(0.75)) {
			keys.push(randomInt(-999, 999));
		} else {
			keys.push(
				convertTextToKeywords(randomName())[0]
			);
		}
	}

	pickValue = function() {
		if (randomBool(0.75)) {
			return randomInt(1, 999);
		} else {
			return convertTextToKeywords(randomName())[0];
		}
	};

	// create commands and set goals
	var inputs = [];
	var outputs = [];
	var state = {};
	for (var i = 0; i < 50; i++) {
		// set chance starts at 0.5 and goes to 0 as time goes on
		if (randomBool(0.5 - i/98)) {
			var key = randomChoice(keys);
			var value = pickValue();
			state[key.toString()] = value;
			inputs.push(1);
			inputs.push(key);
			inputs.push(value);
		} else {
			var key = randomChoice(keys);
			inputs.push(0);
			inputs.push(key);
			if (state.hasOwnProperty(key.toString())) {
				var value = state[key.toString()];
			} else {
				var value = 0;
			}
			outputs.push(value);
		}
	}

	var inputFile = createLockedFile(clientHost, 200, FILE_ICON_DATA, inputs);

	requireCreateFile(clientHost, outputs, "Create the results file as specified");

}

function onCycleFinished() {
}
