
"""Model in python for testing and experimenting with balance"""

from collections import namedtuple


Inputs = namedtuple('Inputs', ['rods', 'flow'])
State = namedtuple('State', ['temp', 'avg_activity'])
Outputs = namedtuple('Outputs', ['water_temp', 'activity', 'pressure', 'power'])

PASSIVE_ACTIVITY = 1
AVG_ACTIVITY_DECAY = 10
AVG_ACTIVITY_COEFF = 1
ACTIVITY_TO_TEMP_COEFF = 1
BASE_WATER_TEMP = 100

INITIAL_STATE = State(0, 0)


def step(inputs, state):
	"""Returns state, outputs"""
	activity = (PASSIVE_ACTIVITY + AVG_ACTIVITY_COEFF * state.avg_activity) * inputs.rods
	avg_activity = (state.avg_activity * AVG_ACTIVITY_DECAY + activity) / (AVG_ACTIVITY_DECAY + 1)
	water_temp = state.temp
	temp = state.temp + ACTIVITY_TO_TEMP_COEFF * activity - inputs.flow * water_temp
	power = inputs.flow * max(0, water_temp - BASE_WATER_TEMP)
	return State(temp, avg_activity), Outputs(water_temp, activity, temp, power)


def constant_inputs(steps=1, flow=0., rods=1.):
	state = INITIAL_STATE
	inputs = Inputs(rods, flow)
	for n in xrange(steps):
		state, outputs = step(inputs, state)
		print n
		print state
		print outputs


if __name__ == '__main__':
	import argh
	argh.dispatch_commands([constant_inputs])
