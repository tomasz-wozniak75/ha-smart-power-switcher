deployment_pack=$1

echo "dada $(pwd) $deployment_pack"

echo "Cleaning deployment package $deployment_pack"
rm $deployment_pack; 
touch $$deployment_pack.installed

cd ../public
if test -f "../smart-energy.pid"; then
    kill -9 $(cat ../smart-energy.pid); 
fi

./smart-energy.sh
