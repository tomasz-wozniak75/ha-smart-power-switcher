import { useState } from 'react';
import { DateTimeUtils, PowerConsumerModel } from "smart-power-consumer-api";
import { ConsumptionPlanComponent } from './ConsumptionPlanComponent';
import { ErrorComponent } from './ErrorComponent';



const fixFinishAt = (finishAt: Date): Date => new Date((finishAt.getTime() + 2 * 3600 * 1000));
const getFinishAt = (finishAt: Date): string => fixFinishAt(finishAt).toJSON().substring(0, 16);

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
                <div>
                    <input name="button-consumptionDuration-less-10mins" type='button' value={"<< 10 mins"}  onClick={(e) => setConsumptionDuration(consumptionDuration - 10)}/>                    
                    <input name="button-consumptionDuration-less-5mins" type='button' value={"<< 5 mins"}  onClick={(e) => setConsumptionDuration(consumptionDuration - 5)}/>                    
                    <input name="button-setDefault-consumption-duration" type='button' value={"default"}  onClick={(e) => setConsumptionDuration(powerConsumerProp.defaultConsumptionDuration)}/>      
                    <input name="button-upToFinishTime" type='button' value={"up to Finish before"}  onClick={(e) => setConsumptionDuration(Math.floor((finishAt.getTime() - Date.now()) / (60 * 1000)) - 2)}/> 
                    
                    <input name="button-consumptionDuration-more-5mins" type='button' value={"5 mins >>"}  onClick={(e) => setConsumptionDuration(consumptionDuration + 5)}/>                    
                    <input name="button-consumptionDuration-more-10mins" type='button' value={"10 mins >>"}  onClick={(e) => setConsumptionDuration(consumptionDuration + 10)}/>  
                </div>
            </div>
            <div className='inputBlock'>
                <label htmlFor="finishAt">Finish before: </label>
                <div>
                    <input id="finishAt" type='datetime-local' value={getFinishAt(finishAt)} onChange={ (e) => setFinishAt(new Date(e.target.value))}/>
                    <p>{(finishAt.getDay() == new Date().getDay() ? "today " : " tomorrow ") + `at ${DateTimeUtils.formatTime(fixFinishAt(finishAt).getTime())}`}</p>
                </div>
                <div>
                    <input name="button-decrease-1h" type='button' value={"<< hour"}  onClick={(e) => setFinishAt(new Date(finishAt.getTime() - 60 * 60 * 1000))}/>                    
                    <input name="button-decrease-10mins" type='button' value={"<< 10mins"}  onClick={(e) => setFinishAt(new Date(finishAt.getTime() - 10 * 60 * 1000))}/>                    
                    <input name="button-now" type='button' value={"Now"}  onClick={(e) => setFinishAt(new Date())}/>         
                    <input name="button-setDefault-consumption-duration" type='button' value={"default"}  onClick={(e) => setFinishAt(new Date(powerConsumerProp.defaultFinishAt))}/>                 
                    <input name="button-increase+10mins" type='button' value={"10mins >>"}  onClick={(e) => setFinishAt(new Date(finishAt.getTime() + 10 * 60 * 1000))}/>                    
                    <input name="button-increase+1h" type='button' value={"hour >>"}  onClick={(e) => setFinishAt(new Date(finishAt.getTime() + 60 * 60 * 1000))}/>                    
                </div>
            </div>
            <div className='inputBlock'>
                <input name="schedule" type='button' value={"Schedule"} onClick={schedulePlan} disabled={consumptionPlanSchduled()}/>
                <input id="delete" type='button' value={"Cancel"} onClick={deletePlan} disabled={!consumptionPlanSchduled()}/>
            </div>
            {error != null ? <ErrorComponent message={error}/> : null}
            {powerConsumer.consumptionPlan ? <ConsumptionPlanComponent {...powerConsumer.consumptionPlan}/> : null}
        </div>
    );
}