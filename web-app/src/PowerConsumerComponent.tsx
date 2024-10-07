import { useState } from 'react';
import { PowerConsumerModel } from "smart-power-consumer-api";
import { ConsumptionPlanComponent } from './ConsumptionPlanComponent';
import { ErrorComponent } from './ErrorComponent';


const getFinishAt = (finishAt: Date): string => new Date((finishAt.getTime() + 2 * 3600 * 1000)).toJSON().substring(0, 16);

export const PowerConsumerComponent = (powerConsumerProp: PowerConsumerModel) => {
    const [consumptionDuration, setConsumptionDuration] = useState<number>(powerConsumerProp.defaultConsumptionDuration);
    const [finishAt, setFinishAt] = useState(new Date(powerConsumerProp.defaultFinishAt));
    const [powerConsumer, setPowerConsumer] = useState<PowerConsumerModel>(powerConsumerProp);
    const [error, setError] = useState<string>(null);

    const schedulePlan = async () => {
        const path = `/power-consumer/${powerConsumer.id}/consumption-plan?consumptionDuration=${consumptionDuration*60*1000}&finishAt=${finishAt.getTime()}`;
        const response = await fetch(path, { method: "post", headers: { 'Accept': 'application/json' } }) ;
        const json = await response.json();
        if (response.ok) {
            setPowerConsumer(json);
            setError(null);
        } else {
            setError(json.message);
        }
    }

    const deletePlan = async () => {
        const path = `/power-consumer/${powerConsumer.id}/consumption-plan`;
        let response = await fetch(path, { method: "delete", headers: { 'Accept': 'application/json' } });
       const json = await response.json();
        if (response.ok) {
            setPowerConsumer(json);
            setError(null);
        } else {
            setError(json.message);
        }
    }

    const consumptionPlanSchduled = () => powerConsumer.consumptionPlan !== null && powerConsumer.consumptionPlan.state === "processing";

    return (
        <div className='powerConsumer'>
            <header>{powerConsumer.name}</header>
            <div className='inputBlock'>
                <label htmlFor="consumptionDuration">Charge duration: </label>
                <input id="consumptionDuration" type='number' step="5" value={consumptionDuration} onChange={ (e) => setConsumptionDuration(Number(e.target.value))}/>
                <input name="button-setDefault-consumption-duration" type='button' value={"default"}  onClick={(e) => setConsumptionDuration(powerConsumerProp.defaultConsumptionDuration)}/>      
                <input name="button-upToFinishTime" type='button' value={"up to finish at"}  onClick={(e) => setConsumptionDuration(Math.floor((finishAt.getTime() - Date.now()) / (60 * 1000)) - 2)}/>      
            </div>
            <div>
                <label htmlFor="finishAt">Finish at: </label>
                <div>
                    <input id="finishAt" type='datetime-local' value={getFinishAt(finishAt)} onChange={ (e) => setFinishAt(new Date(e.target.value))}/>
                </div>
                <div>
                    <input name="button-decrease-1h" type='button' value={"< -1h"}  onClick={(e) => setFinishAt(new Date(finishAt.getTime() - 60 * 60 * 1000))}/>                    
                    <input name="button-decrease-10mins" type='button' value={"< -10mins"}  onClick={(e) => setFinishAt(new Date(finishAt.getTime() - 10 * 60 * 1000))}/>                    
                    <input name="button-now" type='button' value={"Now"}  onClick={(e) => setFinishAt(new Date())}/>         
                    <input name="button-setDefault-consumption-duration" type='button' value={"default"}  onClick={(e) => setFinishAt(new Date(powerConsumerProp.defaultFinishAt))}/>                 
                    <input name="button-increase+10mins" type='button' value={"+10mins >"}  onClick={(e) => setFinishAt(new Date(finishAt.getTime() + 10 * 60 * 1000))}/>                    
                    <input name="button-increase+1h" type='button' value={"+1h >"}  onClick={(e) => setFinishAt(new Date(finishAt.getTime() + 60 * 60 * 1000))}/>                    
                </div>
            </div>
            <div>
                <input name="schedule" type='button' value={"Schedule"} onClick={schedulePlan} disabled={consumptionPlanSchduled()}/>
                <input id="delete" type='button' value={"Cancel"} onClick={deletePlan} disabled={!consumptionPlanSchduled()}/>
            </div>
            {error != null ? <ErrorComponent message={error}/> : null}
            {powerConsumer.consumptionPlan ? <ConsumptionPlanComponent {...powerConsumer.consumptionPlan}/> : null}
        </div>
    );
}