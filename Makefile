
PUZZLES=$(wildcard nuclear-plant/puzzle*.js)
BUILTS=$(PUZZLES:nuclear-plant/puzzle%.js=nuclear-plant/built%.js)

all: $(BUILTS)
	python manage.py install
.PHONY: all

clean:
	rm -f $(BUILTS)
.PHONY: clean

nuclear-plant/built%.js: nuclear-plant/puzzle%.js nuclear-plant/base.js
	cat nuclear-plant/base.js $< | sed 's/$$/\r/' > $@
