
"""Model in python for testing and experimenting with balance"""

from collections import namedtuple
import math

import textgraph


Inputs = namedtuple('Inputs', ['rods', 'flow'])
State = namedtuple('State', ['temp', 'avg_activity'])
Outputs = namedtuple('Outputs', ['water_temp', 'activity', 'pressure', 'power'])

PASSIVE_ACTIVITY = 1
AVG_ACTIVITY_DECAY = 10
AVG_ACTIVITY_COEFF = 1.3
ACTIVITY_TO_TEMP_COEFF = 1
BASE_WATER_TEMP = 100
HEAT_FLOW_COEFF = 0.01
HEAT_LOSS = 1

INITIAL_STATE = State(0, 0)

# note max and min is switched here, as full rods = lowest activity coefficient
MAX_RODS = 0.4
MIN_RODS = 1

MAX_FLOW = 5

"""
Notes

Max rods should allow a 'shut down' state where activity stays low enough
that temperature goes down without flow
	0.4 seems a sweet spot here, at least with HEAT_LOSS = 1

Min rods should cause rapid growth.
	Increased activity coeff until rods = 1 causes crazy growth in a few 10s of cycles
	(200 or so from cold start)

Max flow rate should not be able to combat out of control activity
	5 seems about right. It has a ton of trouble once activity exceeds 100-150 range.

Max rods and flow rate should be able to effectively SCRAM the reactor
"""


def step(inputs, state):
	"""Returns state, outputs"""
	activity = (PASSIVE_ACTIVITY + AVG_ACTIVITY_COEFF * state.avg_activity) * inputs.rods
	avg_activity = (state.avg_activity * AVG_ACTIVITY_DECAY + activity) / (AVG_ACTIVITY_DECAY + 1)
	water_temp = state.temp
	temp = max(0,
		state.temp
		+ ACTIVITY_TO_TEMP_COEFF * activity
		- HEAT_FLOW_COEFF * inputs.flow * water_temp
		- HEAT_LOSS
	)
	power = inputs.flow * max(0, water_temp - BASE_WATER_TEMP)
	return State(temp, avg_activity), Outputs(water_temp, activity, temp, power)


def constant(rods=1., flow=0.):
	flow, rods = map(float, (flow, rods))
	inputs = Inputs(rods, flow)
	yield inputs
	while True:
		state, outputs = yield inputs


def scram(scram_at, rods=1., flow=0.):
	"""An input test where, after temperature hits scram_at, rods are fully inserted
	and flow is set to max.
	"""
	flow, rods, scram_at = map(float, (flow, rods, scram_at))
	inputs = Inputs(rods, flow)
	yield inputs
	while True:
		state, outputs = yield inputs
		if state.temp > scram_at:
			inputs = Inputs(MAX_RODS, MAX_FLOW)


def table():
	COLS = [
		('rods', 'rods'),
		('flow', 'flow'),
		('act', 'activity'),
		('actav', 'avg_activity'),
		('temp', 'temp'),
		('wtemp', 'water_temp'),
		('power', 'power'),
	]
	print "\t{}".format('\t'.join(n for n, _ in COLS))
	while True:
		i, inputs, state, outputs = yield
		if i is None:
			return
		values = inputs._asdict()
		values.update(state._asdict())
		values.update(outputs._asdict())
		print '\t'.join([str(i)] + ['{:.2f}'.format(values[k]) for _, k in COLS])


def graph(width=97):
	HEIGHT = 4
	ITEMS = [
		'rods', 'flow', 'activity', 'avg_activity', 'temp', 'water_temp', 'power'
	]
	values = {}
	while True:
		i, inputs, state, outputs = yield
		if i is None:
			break
		for obj in (inputs, state, outputs):
			for k, v in obj._asdict().items():
				values.setdefault(k, []).append(v)
	for name in ITEMS:
		print name
		vs = values[name]
		compress = int(math.ceil(float(len(vs)) / width))
		vs = [sum(vs[i:i+compress]) / len(vs[i:i+compress]) for i in range(0, len(vs), compress)]
		assert len(vs) <= width
		ceiling = max(vs)
		if ceiling == 0:
			ceiling = 1
		scale = '{:.2f}'.format(ceiling)
		lines = textgraph.bars_vertical(vs, height=HEIGHT, ceiling=ceiling)
		print '{}\t{}'.format(scale, lines[0])
		for line in lines[1:]:
			print '\t{}'.format(line)
		print


def main(displayfn, inputfn, steps, *args):
	displaycoro = globals()[displayfn]()
	displaycoro.next()
	inputcoro = globals()[inputfn](*args)
	steps = int(steps)
	state = INITIAL_STATE
	for i in xrange(steps):
		if i == 0:
			inputs = inputcoro.next()
		else:
			inputs = inputcoro.send((state, outputs))
		state, outputs = step(inputs, state)
		displaycoro.send((i, inputs, state, outputs))
	try:
		displaycoro.send((None, None, None, None))
	except StopIteration:
		pass


if __name__ == '__main__':
	import sys
	main(*sys.argv[1:])
