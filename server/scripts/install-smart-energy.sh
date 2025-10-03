deployment_pack=$1

if test $deployment_pack; then
    echo "Cleaning deployment package $deployment_pack"
    rm $deployment_pack
    touch $deployment_pack.installed
fi

cd ../public
if test -f "../smart-energy.pid"; then
    kill -9 $(cat ../smart-energy.pid)
fi

echo "Starting smart energy ....."
./smart-energy.sh
echo "Started smart energy"
