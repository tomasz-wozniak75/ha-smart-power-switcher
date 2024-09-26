import { useState, useEffect } from 'react';
import { PowerConsumerModel } from "smart-power-consumer-api";

export const PowerConsumerComponent = (powerConsumer: PowerConsumerModel) => {
    const [consumptionDuration, setConsumptionDuration] = useState(powerConsumer.defaultConsumptionDuration);
    const [finishAt, setFinishAt] = useState(powerConsumer.defaultFinishAt);

    const schedule = () => {
        fetch(`/power-consumer/${powerConsumer.id}/consumption-plan?consumptionDuration=${consumptionDuration*60*1000}&finishAt=${finishAt}`, {
            method: "post",
            headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
            }
        }
        )
        .then( (response) => { 
         console.log(response)
        });
    }

    return (
        <div>
            <header>{powerConsumer.name}</header>
            <input name="consumptionDuration" type='number' defaultValue={consumptionDuration} value={consumptionDuration}/>
            <input name="consumptionDuration" type='datetime-local' defaultValue={finishAt} value={finishAt}/>
            <input name="schedule" type='button' value={"Schedule"} onClick={schedule}/>

        </div>
    );
}