
all: built1.js built2.js built3.js

built1.js: base.js puzzle1.js
	cat base.js puzzle1.js | sed 's/$$/\r/' > $@

built2.js: base.js puzzle2.js
	cat base.js puzzle2.js | sed 's/$$/\r/' > $@

built3.js: base.js puzzle3.js
	cat base.js puzzle3.js | sed 's/$$/\r/' > $@

