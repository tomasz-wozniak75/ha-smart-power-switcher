import { useState, useEffect } from 'react';
import { PowerConsumerModel } from "smart-power-consumer-api";

export const PowerConsumerComponent = (powerConsumerProp: PowerConsumerModel) => {
    const [consumptionDuration, setConsumptionDuration] = useState(powerConsumerProp.defaultConsumptionDuration);
    const [finishAt, setFinishAt] = useState(new Date(powerConsumerProp.defaultFinishAt));
    const [powerConsumer, setPowerConsumer] = useState(powerConsumerProp);

    const schedulePlan = async () => {
        const path = `/power-consumer/${powerConsumer.id}/consumption-plan?consumptionDuration=${consumptionDuration*60*1000}&finishAt=${finishAt.getTime()}`;
        const response = await fetch(path, { method: "post", headers: { 'Accept': 'application/json' } }) ;
        setPowerConsumer(await response.json());
    }

    const deletePlan = async () => {
        const path = `/power-consumer/${powerConsumer.id}/consumption-plan`;
        let response = await fetch(path, { method: "delete", headers: { 'Accept': 'application/json' } });
        const refreshedPowerConsumer = await response.json()
        setPowerConsumer(refreshedPowerConsumer);
    }

    return (
        <div>
            <header>{powerConsumer.name}</header>
            <div><input name="consumptionDuration" type='number' value={consumptionDuration} onChange={ (e) => setConsumptionDuration(Number(e.target.value))}/></div>
            <div><input name="finishAt" type='datetime-local' value={new Date((finishAt.getTime() + 2 * 3600 * 1000)).toJSON().substring(0, 16)} onChange={ (e) => setFinishAt(new Date(e.target.value))}/></div>
            <div>
                <input name="schedule" type='button' value={"Schedule"} onClick={schedulePlan} disabled={powerConsumer.consumptionPlan != null}/>
                <input name="delete" type='button' value={"Cancel"} onClick={deletePlan} disabled={powerConsumer.consumptionPlan == null}/>
            </div>

        </div>
    );
}