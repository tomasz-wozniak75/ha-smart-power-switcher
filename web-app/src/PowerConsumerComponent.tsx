import { useState, useEffect } from 'react';
import { PowerConsumerModel } from "smart-power-consumer-api";
import { ConsumptionPlanComponent } from './ConsumptionPlanComponent';


const getFinishAt = (finishAt: Date): string => new Date((finishAt.getTime() + 2 * 3600 * 1000)).toJSON().substring(0, 16);

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
            <div>
                <label htmlFor="consumptionDuration">Charge duration: </label>
                <input id="consumptionDuration" type='number' value={consumptionDuration} onChange={ (e) => setConsumptionDuration(Number(e.target.value))}/>
            </div>
            <div>
                <label htmlFor="finishAt">Finish at: </label>
                <input id="finishAt" type='datetime-local' value={getFinishAt(finishAt)} onChange={ (e) => setFinishAt(new Date(e.target.value))}/>
            </div>
            <div>
                <input name="schedule" type='button' value={"Schedule"} onClick={schedulePlan} disabled={powerConsumer.consumptionPlan != null}/>
                <input id="delete" type='button' value={"Cancel"} onClick={deletePlan} disabled={powerConsumer.consumptionPlan == null}/>
            </div>
            {powerConsumer.consumptionPlan ? <ConsumptionPlanComponent {...powerConsumer.consumptionPlan}/> : null}
        </div>
    );
}