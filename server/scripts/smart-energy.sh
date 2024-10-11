app_dir=$(dirname $(realpath $0))
echo "app_dir $app_dir"
parent_dir=$(dirname $app_dir)
echo  "parent dir: $parent_dir"
nohup dotenvx run --env-file=$app_dir/.env.production -- node $app_dir/WebServer.js pid-file=$parent_dir/smart-energy.pid >> $parent_dir/smart-energy.logs &