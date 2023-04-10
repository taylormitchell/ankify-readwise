rm -rf dist
mkdir dist
cp src/* dist/
cp -r node_modules dist/ 
cp .env.production dist/.env
cp last_run.txt dist/last_run.txt