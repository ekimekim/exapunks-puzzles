
import random
import math
import textgraph

parts = []
for i in range(5):
	amp = random.random() / (i+2)
	period = random.randrange(400, 800) * (10-i)
	phase = random.random()
	parts.append((amp, period, phase))
print parts

def get(t):
	return sum(a * math.sin(2 * math.pi * (ph + float(t)/pe)) for a, pe, ph in parts)


vs = [get(t*100) for t in range(100)]
vs = [v - min(vs) for v in vs] # min 0
vs = [v / max(vs) for v in vs] # normalise
print '\n'.join(textgraph.bars_vertical(vs, height=10))
