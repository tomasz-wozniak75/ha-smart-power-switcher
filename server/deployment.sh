echo "PASSWORD: "; stty -echo; IFS= read -r passwd; stty echo; echo

echo "Packaging ..."

rm -rf dist
npm run build
npm --prefix ../web-app run build
npm --prefix ../audi-battery-status-web-app run build
cp -v scripts/*.sh dist/
cp -v .env.production dist/


server_root=$(pwd)
mkdir -p  deployment-packages
cd deployment-packages


deployment_pack="smart-energy-$(date +"%H%M_%d-%m-%Y").tar.gz"
tar -zcvf $server_root/deployment-packages/$deployment_pack  -C $server_root/dist .

echo "Deploying ..."
sshpass -p$passwd scp $deployment_pack tomaszw@smart-energy.mesh:/home/tomaszw/apps/smart-energy/deployment-packages

echo "Cleaning local package ..."
rm "$deployment_pack"
touch "$deployment_pack.installed"

echo "Installing ..."
deployment_folder="/home/tomaszw/apps/smart-energy/deployment-packages"
sshpass -p$passwd ssh tomaszw@smart-energy.mesh "cd $deployment_folder; mkdir -p ../public; rm -rf ../public/*; tar -xvf $deployment_pack -C ../public; ../public/install-smart-energy.sh $deployment_pack"



