
PUZZLES=$(wildcard nuclear-plant/puzzle*.js)
BUILTS=$(PUZZLES:nuclear-plant/puzzle%.js=nuclear-plant/built%.js)

all: $(BUILTS)
	python manage.py install
.PHONY: all

nuclear-plant/built%.js: nuclear-plant/base.js nuclear-plant/puzzle%.js
	cat $< | sed 's/$$/\r/' > $@
