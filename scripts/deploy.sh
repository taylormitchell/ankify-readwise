# save the content of last_run.txt, if it exists
if [ -f last_run.txt ]; then
    cp ./dist/last_run.txt ./last_run.txt.bak
fi
# remove the dist folder and create a new one
rm -rf dist
mkdir dist
cp src/* dist/
cp -r node_modules dist/ 
cp .env.production dist/.env
# restore the content of last_run.txt, if it exists
if [ -f ./last_run.txt.bak ]; then
    cp ./last_run.txt.bak dist/last_run.txt
    rm ./last_run.txt.bak
else
    cp last_run.txt dist/last_run.txt
fi