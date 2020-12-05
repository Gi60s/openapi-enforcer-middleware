cd website
npm run generate
cd ..

rm -rf docs
cp -r ./website/dist ./docs
echo "Copied to docs directory"