import { useState, useEffect } from 'react';
import './ChargingStatusComponenet.css';
import { ChargingStatus, DateTimeUtils } from 'smart-power-consumer-api';


export function ChargingStatusComponent() {
    const [chargingStatus, setChargingStatus] = useState<ChargingStatus>();
    
    useEffect(() => {
    const fetchChargingStatus = async () => {
        const response = await fetch(`/audi-tracker/api/charging`)
        if (response.ok) {
          if (response.status === 200) {
            const newChargingStatus = await response.json();
            return newChargingStatus;
          } else {
            return null;
          }
        } else {
          throw new Error(`fetchChargingStatus failed ${response.statusText}`)
        }
    };

  fetchChargingStatus().then((response) => { setChargingStatus(response); } )

  }, []);


  const renderChargingStatus = () => {
    return <div>
              <p>
                  <span className={`label`}>Battery: </span> 
                  <span >{chargingStatus.batteryStatus.currentSOC_pct}% </span> 
                  <span className={`value`}>{chargingStatus.batteryStatus.cruisingRangeElectric_km}km </span> 
              </p>
              <p> 
                  <span className={`label`}>Charger: </span> 
                  <span className={`value ${chargingStatus.plugStatus.plugConnectionState === "connected" ? "ok" : "error"}`}>Plug connection: {chargingStatus.plugStatus.plugConnectionState}. </span> 
                  <span className={`value ${chargingStatus.plugStatus.plugLockState === "locked" ? "ok" : "error"}`}>Lock: {chargingStatus.plugStatus.plugLockState}. </span> 
                  <span className={`value ${chargingStatus.plugStatus.externalPower === "ready" ? "ok" : "error"}`}>Power: {chargingStatus.plugStatus.externalPower}</span> 
              </p>
              <p>
                  <span className="">Status fetched: </span> 
                  <span className={`value`}>{DateTimeUtils.formatTime(Date.now() - new Date(chargingStatus.plugStatus.carCapturedTimestamp).getTime())} ago</span> 
              </p>
           </div>;
  }

  return (
    <div className="App">
        {chargingStatus ? renderChargingStatus() : <p className='warning'>Charging status is still missing</p>}
    </div>
  );

}