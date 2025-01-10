https://github.com/edwinhern/express-typescript-2024


how to install dotenv
sudo npm install @dotenvx/dotenvx -g


npx puppeteer browsers install
chrome@129.0.6668.91 /home/tomaszw/.cache/puppeteer/chrome/linux-129.0.6668.91/chrome-linux64/chrome
chrome-headless-shell@129.0.6668.91 /home/tomaszw/.cache/puppeteer/chrome-headless-shell/linux-129.0.6668.91/chrome-headless-shell-linux64/chrome-headless-shell

changes in /etc/rc.local for autostart during boot
#run smart energy app
sudo -H -u tomaszw /home/tomaszw/apps/smart-energy/public/smart-energy.sh



http://www.gpxweaver.com/


https://www.gpsvisualizer.com/map_input

//today
javascript: (() => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    window.location.href = `http://smart-energy.mesh:8080/audi-tracker/traces/${day}-${month}-${now.getFullYear()}.gpx`;
})();


//yesterday
javascript: (() => {
    const now = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    window.location.href = `http://smart-energy.mesh:8080/audi-tracker/traces/${day}-${month}-${now.getFullYear()}.gpx`;
})();


javascript: (() => { const now = new Date(Date.now() - 24 * 60 * 60 * 1000); const day = String(now.getDate()).padStart(2, '0'); const month = String(now.getMonth() + 1).padStart(2, '0'); window.location.href = `http://smart-energy.mesh:8080/audi-tracker/traces/${day}-${month}-${now.getFullYear()}.gpx`; })();


https://linuxize.com/post/how-to-set-or-change-timezone-in-linux/
timedatectl list-timezones
Europe/Warsaw
sudo timedatectl set-timezone <your_time_zone>
sudo timedatectl set-timezone Europe/Warsaw


Common Name (eg: your user, host, or server name) [server]:malina-vpn
* Notice:

Keypair and certificate request completed. Your files are:
req: /home/tomaszw/pki/reqs/server.req
key: /home/tomaszw/pki/private/server.key


docker run -d \
  --name=openvpn-as --cap-add=NET_ADMIN \
  -p 943:943 -p 443:443 -p 1194:1194/udp \
  -v /etc/openvpn:/openvpn \
  openvpn/openvpn-as


