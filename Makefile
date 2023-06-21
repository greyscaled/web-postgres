.PHONY: clean
clean:
	rm -rf dist

dist: clean node_modules
	node build.mjs
	./node_modules/.bin/tsc --emitDeclarationOnly --outDir dist
	cp package.json dist/package.json
	cp README.md dist/README.md

node_modules: package.json yarn.lock
	yarn
